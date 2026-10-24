import fs from 'node:fs/promises';
import path from 'node:path';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { DEFECT_TYPES, normalizeConfidence, normalizeDefectType } from './defects.js';

const SYSTEM_PROMPT = `You are a quality-inspection vision assistant.
Inspect the product photo and list EVERY distinct defect you can identify.
Each prediction must use exactly one of:
scratch, dent, paint_issue, missing_component, no_defect.
Also provide a confidence score as a decimal between 0 and 1 (inclusive), with up to 4 decimal places, for each prediction.
If multiple defects are visible (for example both a dent and a scratch), return one prediction object per defect.
If no defect is visible, return a single prediction with no_defect.
Do not invent other categories.`;

const PLACEHOLDER_GOOGLE_KEY = 'googleAPIKey';

/** Returns a usable Google AI key, or null if unset / still the placeholder. */
export function getGoogleAiApiKey() {
  const apiKey = process.env.GOOGLE_AI_API_KEY?.trim();
  if (!apiKey || apiKey === PLACEHOLDER_GOOGLE_KEY) return null;
  return apiKey;
}

export function isMockVisionEnabled() {
  return (
    String(process.env.MOCK_VISION ?? 'false')
      .trim()
      .toLowerCase() === 'true'
  );
}

function mimeFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/jpeg';
}

function extractRawPredictionList(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.predictions)) return raw.predictions;
  if (raw?.predicted_defect_type != null || raw?.defect_type != null) return [raw];
  return [];
}

/** Normalize one or many model predictions into unique defect rows. */
export function finalizePredictions(raw) {
  const list = extractRawPredictionList(raw);
  const byType = new Map();

  for (const item of list) {
    const normalized = normalizeDefectType(item?.predicted_defect_type ?? item?.defect_type);
    const confidence = normalizeConfidence(item?.confidence);
    const existing = byType.get(normalized.defectType);
    if (!existing || confidence > existing.confidence) {
      byType.set(normalized.defectType, {
        aiDefectType: normalized.defectType,
        confidence,
        normalization: normalized,
      });
    }
  }

  if (byType.size === 0) {
    byType.set('no_defect', {
      aiDefectType: 'no_defect',
      confidence: 0,
      normalization: { defectType: 'no_defect', normalized: true, reason: 'empty_fallback' },
    });
  }

  return {
    predictions: [...byType.values()],
    rawResponse: raw,
  };
}

export class VisionError extends Error {
  constructor(message, { statusCode = 502, code = 'vision_error' } = {}) {
    super(message);
    this.name = 'VisionError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function isGoogleQuotaError(err) {
  const status = Number(err?.status ?? err?.statusCode ?? err?.response?.status);
  if (status === 429) return true;

  const code = String(err?.code ?? err?.error?.code ?? err?.status ?? '').toLowerCase();
  if (
    code.includes('resource_exhausted') ||
    code.includes('rate_limit') ||
    code.includes('quota') ||
    code === '429'
  ) {
    return true;
  }

  const message = String(err?.message ?? err?.error?.message ?? '').toLowerCase();
  return (
    message.includes('resource_exhausted') ||
    message.includes('quota') ||
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('billing')
  );
}

const PREDICTION_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    predictions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          predicted_defect_type: {
            type: SchemaType.STRING,
            format: 'enum',
            enum: DEFECT_TYPES,
          },
          confidence: {
            type: SchemaType.NUMBER,
          },
        },
        required: ['predicted_defect_type', 'confidence'],
      },
    },
  },
  required: ['predictions'],
};

export async function predictDefectFromImage(absolutePath) {
  const apiKey = getGoogleAiApiKey();
  if (isMockVisionEnabled() || !apiKey) {
    const mock = {
      predictions: [
        { predicted_defect_type: 'dent', confidence: 0.83 },
        { predicted_defect_type: 'scratch', confidence: 0.71 },
      ],
      mock: true,
      reason: isMockVisionEnabled() ? 'MOCK_VISION' : 'missing_or_placeholder_GOOGLE_AI_API_KEY',
    };
    return finalizePredictions(mock);
  }

  const bytes = await fs.readFile(absolutePath);
  const mimeType = mimeFromPath(absolutePath);
  const modelName = process.env.GOOGLE_VISION_MODEL || 'gemini-2.0-flash';
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: PREDICTION_RESPONSE_SCHEMA,
    },
  });

  let result;
  try {
    result = await model.generateContent([
      {
        text: 'List all defects in this product photo. Return predictions with predicted_defect_type and confidence for each.',
      },
      {
        inlineData: {
          mimeType,
          data: bytes.toString('base64'),
        },
      },
    ]);
  } catch (err) {
    if (isGoogleQuotaError(err)) {
      throw new VisionError('Out of credits', {
        statusCode: 429,
        code: 'out_of_credits',
      });
    }
    throw new VisionError(err?.message || 'Vision model request failed', {
      statusCode: 502,
      code: 'vision_request_failed',
    });
  }

  const content = result?.response?.text?.() ?? '';
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { predicted_defect_type: content, confidence: null, parse_error: true };
  }

  return finalizePredictions({
    ...parsed,
    model: modelName,
    provider: 'google_gemini',
  });
}
