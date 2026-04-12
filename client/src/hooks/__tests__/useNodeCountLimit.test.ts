import { renderHook } from '@testing-library/react';
import { useNodeCountLimit } from '../useNodeCountLimit';
import * as xyflow from '@xyflow/react';

vi.mock('@xyflow/react', () => ({
  useStore: vi.fn(),
}));

describe('useNodeCountLimit', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns canAdd: true when count is under limit', () => {
    vi.mocked(xyflow.useStore).mockImplementation((selector: any) => selector({ nodes: new Array(100) }));
    
    const { result } = renderHook(() => useNodeCountLimit());
    expect(result.current.canAdd).toBe(true);
    expect(result.current.isAtLimit).toBe(false);
    expect(result.current.count).toBe(100);
  });

  it('returns canAdd: false when count is at or over limit', () => {
    vi.mocked(xyflow.useStore).mockImplementation((selector: any) => selector({ nodes: new Array(2500) }));
    
    const { result } = renderHook(() => useNodeCountLimit());
    expect(result.current.canAdd).toBe(false);
    expect(result.current.isAtLimit).toBe(true);
    expect(result.current.count).toBe(2500);
  });
});
