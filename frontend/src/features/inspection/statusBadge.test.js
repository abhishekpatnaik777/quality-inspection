import { describe, expect, it } from 'vitest';
import {
  aiInspectionStatusBadge,
  inspectionStatusBadge,
  predictionStatusBadge,
} from './statusBadge.js';

describe('inspectionStatusBadge', () => {
  it('maps known statuses and defaults to neutral', () => {
    expect(inspectionStatusBadge('pass')).toBe('badge badge-ok');
    expect(inspectionStatusBadge('fail')).toBe('badge badge-bad');
    expect(inspectionStatusBadge('pending')).toBe('badge badge-warn');
    expect(inspectionStatusBadge('other')).toBe('badge badge-neutral');
  });
});

describe('aiInspectionStatusBadge', () => {
  it('maps known statuses and defaults to neutral', () => {
    expect(aiInspectionStatusBadge('completed')).toBe('badge badge-ok');
    expect(aiInspectionStatusBadge('awaiting_verification')).toBe('badge badge-warn');
    expect(aiInspectionStatusBadge('processing')).toBe('badge badge-info');
    expect(aiInspectionStatusBadge('error')).toBe('badge badge-bad');
    expect(aiInspectionStatusBadge('other')).toBe('badge badge-neutral');
  });
});

describe('predictionStatusBadge', () => {
  it('maps known statuses and defaults to neutral', () => {
    expect(predictionStatusBadge('approved')).toBe('badge badge-ok');
    expect(predictionStatusBadge('overridden')).toBe('badge badge-info');
    expect(predictionStatusBadge('pending')).toBe('badge badge-warn');
    expect(predictionStatusBadge('other')).toBe('badge badge-neutral');
  });
});
