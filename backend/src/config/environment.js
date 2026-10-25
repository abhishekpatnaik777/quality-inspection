import dotenv from 'dotenv';

dotenv.config();

const PLACEHOLDER_GOOGLE_KEY = 'googleAPIKey';

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT) || 4000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  googleAiApiKey: (() => {
    const apiKey = process.env.GOOGLE_AI_API_KEY?.trim();
    if (!apiKey || apiKey === PLACEHOLDER_GOOGLE_KEY) return null;
    return apiKey;
  })(),
  googleVisionModel: process.env.GOOGLE_VISION_MODEL || 'gemini-2.0-flash',
  mockVision:
    String(process.env.MOCK_VISION ?? 'false')
      .trim()
      .toLowerCase() === 'true',
};
