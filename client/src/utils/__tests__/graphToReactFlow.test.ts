import { pixelToNormalized, computeNormalizedDistance } from '../graphToReactFlow';

describe('pixelToNormalized', () => {
  it('converts center of canvas (0,0) to (0.5, 0.5)', () => {
    const result = pixelToNormalized(0, 0);
    expect(result.x).toBeCloseTo(0.5);
    expect(result.y).toBeCloseTo(0.5);
  });

  it('converts top-left (-1000, -1000) to (0, 0)', () => {
    const result = pixelToNormalized(-1000, -1000);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
  });

  it('converts bottom-right (1000, 1000) to (1, 1)', () => {
    const result = pixelToNormalized(1000, 1000);
    expect(result.x).toBeCloseTo(1);
    expect(result.y).toBeCloseTo(1);
  });

  it('clamps values outside the 0-1 range', () => {
    const result = pixelToNormalized(-2000, 3000);
    expect(result.x).toBe(0);
    expect(result.y).toBe(1);
  });
});

describe('computeNormalizedDistance', () => {
  it('returns 0 for nodes at the minimum layout distance (150px)', () => {
    const result = computeNormalizedDistance({ x: 0, y: 0 }, { x: 150, y: 0 });
    expect(result).toBeCloseTo(0);
  });

  it('returns 1 for nodes at the maximum layout distance (700px)', () => {
    const result = computeNormalizedDistance({ x: 0, y: 0 }, { x: 700, y: 0 });
    expect(result).toBeCloseTo(1);
  });

  it('returns ~0.5 for nodes at the midpoint distance (425px)', () => {
    const result = computeNormalizedDistance({ x: 0, y: 0 }, { x: 425, y: 0 });
    expect(result).toBeCloseTo(0.5);
  });

  it('clamps at 0 for overlapping nodes', () => {
    const result = computeNormalizedDistance({ x: 10, y: 10 }, { x: 10, y: 10 });
    expect(result).toBe(0);
  });

  it('clamps at 1 for very distant nodes', () => {
    const result = computeNormalizedDistance({ x: 0, y: 0 }, { x: 5000, y: 5000 });
    expect(result).toBe(1);
  });

  it('works with diagonal distance (pythagorean)', () => {
    // sqrt(300^2 + 400^2) = 500. normalized = (500-150)/550 ≈ 0.636
    const result = computeNormalizedDistance({ x: 0, y: 0 }, { x: 300, y: 400 });
    expect(result).toBeCloseTo((500 - 150) / 550);
  });
});
