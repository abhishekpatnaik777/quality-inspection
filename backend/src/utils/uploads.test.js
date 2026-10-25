import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { absoluteFromPublicUrl, publicImageUrl, UPLOADS_ROOT } from './uploads.js';

describe('publicImageUrl', () => {
  it('builds the public inspections path', () => {
    assert.equal(publicImageUrl('photo.jpg'), '/uploads/inspections/photo.jpg');
  });
});

describe('absoluteFromPublicUrl', () => {
  it('joins under the uploads root', () => {
    const absolute = absoluteFromPublicUrl('/uploads/inspections/photo.jpg');
    assert.equal(absolute, path.join(UPLOADS_ROOT, 'inspections/photo.jpg'));
  });
});
