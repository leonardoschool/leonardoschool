import { describe, it, expect } from 'vitest';
import { questionImageSource } from '@/lib/utils/imageUrl';

describe('questionImageSource', () => {
  it('prefers a usable imageUrl', () => {
    expect(questionImageSource({ imageUrl: 'https://example.com/a.png' }))
      .toBe('https://example.com/a.png');
  });

  it('falls back to imageStoragePath when imageUrl is null (the bug case)', () => {
    // Answers whose image lived only in imageStoragePath were invisible in sims.
    const out = questionImageSource({ imageUrl: null, imageStoragePath: 'foo/bar.png' });
    expect(out).not.toBeNull();
    expect(out).toContain('bar.png');
  });

  it('falls back when imageUrl is blank/whitespace', () => {
    const out = questionImageSource({ imageUrl: '   ', imageStoragePath: 'foo/bar.png' });
    expect(out).not.toBeNull();
  });

  it('returns null when neither field is usable', () => {
    expect(questionImageSource({ imageUrl: null, imageStoragePath: null })).toBeNull();
    expect(questionImageSource({})).toBeNull();
    expect(questionImageSource(null)).toBeNull();
    expect(questionImageSource(undefined)).toBeNull();
  });
});
