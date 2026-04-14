import { normalizeStageLabels, resolveStageLabel } from '../stageLabels';

describe('normalizeStageLabels', () => {
  it('returns empty array for null/undefined', () => {
    expect(normalizeStageLabels(null)).toEqual([]);
    expect(normalizeStageLabels(undefined)).toEqual([]);
  });

  it('returns empty array for empty array', () => {
    expect(normalizeStageLabels([])).toEqual([]);
  });

  it('converts legacy flat strings to evenly-distributed positions', () => {
    const result = normalizeStageLabels(['Low', 'Medium', 'High']);
    expect(result).toEqual([
      { label: 'Low', position: 0 },
      { label: 'Medium', position: 0.5 },
      { label: 'High', position: 1 },
    ]);
  });

  it('handles single legacy string → position 0.5', () => {
    const result = normalizeStageLabels(['Only']);
    expect(result).toEqual([{ label: 'Only', position: 0.5 }]);
  });

  it('handles two legacy strings → 0 and 1', () => {
    const result = normalizeStageLabels(['Start', 'End']);
    expect(result).toEqual([
      { label: 'Start', position: 0 },
      { label: 'End', position: 1 },
    ]);
  });

  it('handles four legacy strings → evenly distributed', () => {
    const result = normalizeStageLabels(['A', 'B', 'C', 'D']);
    expect(result[0].position).toBeCloseTo(0);
    expect(result[1].position).toBeCloseTo(1/3);
    expect(result[2].position).toBeCloseTo(2/3);
    expect(result[3].position).toBeCloseTo(1);
  });

  it('passes through positioned objects unchanged', () => {
    const input = [
      { label: 'Critical', position: 0.9 },
      { label: 'Low', position: 0.2 },
    ];
    const result = normalizeStageLabels(input);
    // Should be sorted by position
    expect(result).toEqual([
      { label: 'Low', position: 0.2 },
      { label: 'Critical', position: 0.9 },
    ]);
  });

  it('sorts positioned objects by position', () => {
    const input = [
      { label: 'C', position: 0.8 },
      { label: 'A', position: 0.1 },
      { label: 'B', position: 0.5 },
    ];
    const result = normalizeStageLabels(input);
    expect(result.map(r => r.label)).toEqual(['A', 'B', 'C']);
  });

  it('returns empty array for non-string/non-object arrays', () => {
    expect(normalizeStageLabels([1, 2, 3])).toEqual([]);
  });
});

describe('resolveStageLabel', () => {
  it('returns null for empty labels', () => {
    expect(resolveStageLabel(0.5, [])).toBeNull();
  });

  it('returns the only label for single-label array', () => {
    expect(resolveStageLabel(0.0, [{ label: 'Only', position: 0.5 }])).toBe('Only');
    expect(resolveStageLabel(1.0, [{ label: 'Only', position: 0.5 }])).toBe('Only');
  });

  it('resolves to nearest label using Voronoi midpoint boundaries', () => {
    const labels = [
      { label: 'Low', position: 0 },
      { label: 'Medium', position: 0.5 },
      { label: 'High', position: 1 },
    ];
    // Boundary between Low and Medium is 0.25
    // Boundary between Medium and High is 0.75
    expect(resolveStageLabel(0, labels)).toBe('Low');
    expect(resolveStageLabel(0.1, labels)).toBe('Low');
    expect(resolveStageLabel(0.24, labels)).toBe('Low');
    expect(resolveStageLabel(0.25, labels)).toBe('Low');    // at boundary → lower wins
    expect(resolveStageLabel(0.26, labels)).toBe('Medium');
    expect(resolveStageLabel(0.5, labels)).toBe('Medium');
    expect(resolveStageLabel(0.74, labels)).toBe('Medium');
    expect(resolveStageLabel(0.75, labels)).toBe('Medium');  // at boundary → lower wins
    expect(resolveStageLabel(0.76, labels)).toBe('High');
    expect(resolveStageLabel(1.0, labels)).toBe('High');
  });

  it('resolves correctly with non-uniform spacing', () => {
    const labels = [
      { label: 'Low', position: 0.1 },
      { label: 'Critical', position: 0.9 },
    ];
    // Boundary at 0.5
    expect(resolveStageLabel(0, labels)).toBe('Low');
    expect(resolveStageLabel(0.49, labels)).toBe('Low');
    expect(resolveStageLabel(0.5, labels)).toBe('Low');      // at boundary → lower wins
    expect(resolveStageLabel(0.51, labels)).toBe('Critical');
    expect(resolveStageLabel(1.0, labels)).toBe('Critical');
  });

  it('handles unsorted input gracefully', () => {
    const labels = [
      { label: 'High', position: 1 },
      { label: 'Low', position: 0 },
    ];
    // Should still sort internally and resolve correctly
    expect(resolveStageLabel(0.1, labels)).toBe('Low');
    expect(resolveStageLabel(0.9, labels)).toBe('High');
  });

  it('handles edge values at 0 and 1', () => {
    const labels = [
      { label: 'Start', position: 0 },
      { label: 'End', position: 1 },
    ];
    expect(resolveStageLabel(0, labels)).toBe('Start');
    expect(resolveStageLabel(1, labels)).toBe('End');
  });
});
