import { describe, expect, it } from 'vitest';
import { classifyHand } from './classifier.ts';
import { hand } from './handFixtures.ts';

const ALL = ['index', 'middle', 'ring', 'pinky'] as const;

describe('classifyHand (21 landmarks → pose)', () => {
  it('open palm', () => {
    expect(classifyHand(hand({ extended: [...ALL], thumb: 'side' }))).toBe('palm');
  });

  it('fist', () => {
    expect(classifyHand(hand({ extended: [], thumb: 'folded' }))).toBe('fist');
  });

  it('thumbs up', () => {
    expect(classifyHand(hand({ extended: [], thumb: 'up' }))).toBe('thumbs_up');
  });

  it('pinch (thumb tip on index tip)', () => {
    expect(classifyHand(hand({ extended: ['middle', 'ring', 'pinky'], pinch: true }))).toBe('pinch');
  });

  it('is scale and position invariant', () => {
    expect(classifyHand(hand({ extended: [...ALL], thumb: 'side', scale: 0.5, dx: 0.1 }))).toBe('palm');
    expect(classifyHand(hand({ extended: [], thumb: 'up', scale: 1.4, dy: -0.1 }))).toBe('thumbs_up');
  });

  it('returns null for ambiguous poses or bad input', () => {
    expect(classifyHand(hand({ extended: ['index', 'middle'], thumb: 'folded' }))).toBeNull();
    expect(classifyHand([])).toBeNull();
  });
});
