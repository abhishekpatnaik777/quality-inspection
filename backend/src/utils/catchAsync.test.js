import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { catchAsync } from './catchAsync.js';

describe('catchAsync', () => {
  it('invokes a resolved handler without calling next', async () => {
    let called = false;
    let nextCalled = false;
    const handler = catchAsync(async () => {
      called = true;
    });
    handler({}, {}, () => {
      nextCalled = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(called, true);
    assert.equal(nextCalled, false);
  });

  it('forwards rejected errors to next', async () => {
    const boom = new Error('fail');
    const handler = catchAsync(async () => {
      throw boom;
    });
    const err = await new Promise((resolve) => {
      handler({}, {}, resolve);
    });
    assert.equal(err, boom);
  });
});
