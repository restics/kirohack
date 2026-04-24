// Feature: economic-cascade-analyzer, Property 12: Color mapping is monotone on the confidence scale

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as d3 from 'd3';

// ---------------------------------------------------------------------------
// Helper: color functions for d3.interpolateRdYlGn
// ---------------------------------------------------------------------------

/**
 * Given a confidence score in [0.0, 1.0], return the CSS color string
 * produced by d3.interpolateRdYlGn.
 */
function colorForScore(score: number): string {
  return d3.interpolateRdYlGn(score);
}

/**
 * Extract the RGB channels from a CSS color string such as
 * "rgb(215, 48, 39)" or "rgb(26, 152, 80)".
 *
 * Uses d3.color() for parsing; falls back to a manual regex if needed.
 */
function parseRGB(colorString: string): { r: number; g: number; b: number } {
  const parsed = d3.color(colorString);
  if (parsed !== null) {
    const rgb = parsed.rgb();
    return { r: rgb.r, g: rgb.g, b: rgb.b };
  }

  // Fallback: parse "rgb(r, g, b)" manually
  const match = colorString.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (match) {
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
    };
  }

  throw new Error(`Cannot parse color string: ${colorString}`);
}

/**
 * Compute the green fraction: g / (r + g + b).
 *
 * This is the proportion of the green channel in the total color intensity.
 * It is monotone non-decreasing for d3.interpolateRdYlGn because the scale
 * transitions from red-dominant (low confidence) to green-dominant (high
 * confidence), even though the raw green channel peaks in yellow at 0.5.
 *
 * Returns 0 when all channels are 0 (black).
 */
function greenFraction(colorString: string): number {
  const { r, g, b } = parseRGB(colorString);
  const total = r + g + b;
  return total === 0 ? 0 : g / total;
}

// ---------------------------------------------------------------------------
// Property 12: Color mapping is monotone on the confidence scale
// Validates: Requirements 5.4
//
// Note on the monotone property:
// d3.interpolateRdYlGn is a diverging scale (red → yellow → green).
// The raw green channel peaks at score=0.5 (yellow) and then decreases,
// so "greenChannel(y) >= greenChannel(x)" does NOT hold for all x < y.
//
// The correct monotone property is: the GREEN FRACTION (g / (r+g+b)) is
// non-decreasing as the score increases. This captures the semantic intent —
// "the color becomes progressively greener as confidence increases" — and
// holds across the full [0, 1] range of d3.interpolateRdYlGn.
// ---------------------------------------------------------------------------

describe('Property 12: Color mapping is monotone on the confidence scale', () => {
  it('greenFraction(color(y)) >= greenFraction(color(x)) for any x < y in [0, 1]', () => {
    // Generate pairs (x, y) where 0 <= x < y <= 1
    // Strategy: generate two floats, sort them, filter out equal pairs
    fc.assert(
      fc.property(
        fc
          .tuple(
            fc.float({ min: 0, max: 1, noNaN: true }),
            fc.float({ min: 0, max: 1, noNaN: true }),
          )
          .filter(([a, b]) => a !== b),
        ([a, b]) => {
          const x = Math.min(a, b);
          const y = Math.max(a, b);

          // x < y is guaranteed by the sort + filter above
          const colorX = colorForScore(x);
          const colorY = colorForScore(y);

          const fractionX = greenFraction(colorX);
          const fractionY = greenFraction(colorY);

          // The green fraction must be non-decreasing as score increases.
          // Allow a tiny floating-point tolerance (1e-6) for rounding.
          expect(fractionY).toBeGreaterThanOrEqual(fractionX - 1e-6);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests: boundary values for d3.interpolateRdYlGn
//
// d3.interpolateRdYlGn uses the full 11-stop RdYlGn diverging palette.
// Actual boundary colors in D3 v7:
//   score 0.0 → rgb(165, 0, 38)    — dark red
//   score 0.5 → rgb(249, 247, 174) — pale yellow
//   score 1.0 → rgb(0, 104, 55)    — dark green
// ---------------------------------------------------------------------------

describe('Color mapping boundary values', () => {
  it('color(0.0) is in the red range (red-dominant, low green fraction)', () => {
    const colorString = colorForScore(0.0);
    const { r, g } = parseRGB(colorString);

    // At score 0.0 the color is dark red: rgb(165, 0, 38)
    // Red channel should be dominant; green fraction should be 0
    expect(r).toBeGreaterThan(100);
    expect(g).toBeLessThan(10);
    expect(greenFraction(colorString)).toBe(0);
  });

  it('color(0.5) is in the yellow range (high red and green, lower blue)', () => {
    const colorString = colorForScore(0.5);
    const { r, g } = parseRGB(colorString);

    // At score 0.5 the color is pale yellow: rgb(249, 247, 174)
    // Both red and green channels should be high
    expect(r).toBeGreaterThan(200);
    expect(g).toBeGreaterThan(200);
  });

  it('color(1.0) is in the green range (green-dominant, low red)', () => {
    const colorString = colorForScore(1.0);
    const { r, g } = parseRGB(colorString);

    // At score 1.0 the color is dark green: rgb(0, 104, 55)
    // Green channel should be dominant; red channel should be 0
    expect(r).toBeLessThan(10);
    expect(g).toBeGreaterThan(80);
  });

  it('green fraction at score 1.0 is greater than green fraction at score 0.0', () => {
    // The overall trend: color becomes progressively greener as confidence increases
    const fractionAt0 = greenFraction(colorForScore(0.0));
    const fractionAt1 = greenFraction(colorForScore(1.0));
    expect(fractionAt1).toBeGreaterThan(fractionAt0);
  });

  it('green fraction at score 0.5 is between score 0.0 and score 1.0', () => {
    const f0 = greenFraction(colorForScore(0.0));
    const f5 = greenFraction(colorForScore(0.5));
    const f1 = greenFraction(colorForScore(1.0));
    expect(f5).toBeGreaterThan(f0);
    expect(f5).toBeLessThan(f1);
  });
});
