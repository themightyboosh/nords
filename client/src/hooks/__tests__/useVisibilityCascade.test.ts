import { renderHook, act } from '@testing-library/react';
import { useVisibilityCascade } from '../useVisibilityCascade';
import * as xyflow from '@xyflow/react';
import * as LensContext from '../../context/LensContext';

vi.mock('@xyflow/react', () => ({
  useReactFlow: vi.fn(),
}));

vi.mock('../../context/LensContext', () => ({
  useLens: vi.fn(),
}));

describe('useVisibilityCascade', () => {
  let mockSetNodes: ReturnType<typeof vi.fn>;
  let mockSetEdges: ReturnType<typeof vi.fn>;
  let mockGetEdges: ReturnType<typeof vi.fn>;

  const initialNodes = [
    { id: 'n1', data: { type: 'Task', isGhosted: false } },
    { id: 'n2', data: { type: 'Bug', isGhosted: false } },
    { id: 'n3', data: { type: 'Epic', isGhosted: false } },
  ];

  const initialEdges = [
    { id: 'e1', source: 'n1', target: 'n2', data: { type: 'Blocks', _typeId: 'type-blocks', ghost: false } },
    { id: 'e2', source: 'n2', target: 'n3', data: { type: 'Relates', _typeId: 'type-relates', ghost: false } },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    mockSetNodes = vi.fn((updater) => updater(initialNodes));
    mockSetEdges = vi.fn((updater) => updater(initialEdges));
    mockGetEdges = vi.fn(() => initialEdges);

    vi.mocked(xyflow.useReactFlow).mockReturnValue({
      setNodes: mockSetNodes,
      setEdges: mockSetEdges,
      getEdges: mockGetEdges,
    } as any);
  });

  it('showContext=true: resets all hidden flags to false', () => {
    vi.mocked(LensContext.useLens).mockReturnValue({
      lens: 'canvas',
      activeLine: 'Blocks',
      showContext: true,
      hiddenTypes: new Set(),
      activeConnectionTypeId: null,
    } as any);

    renderHook(() => useVisibilityCascade());

    // showContext=true → setNodes called to reset hidden flags
    expect(mockSetNodes).toHaveBeenCalled();
  });

  it('showContext=false with active type: hides unconnected nodes', () => {
    vi.mocked(LensContext.useLens).mockReturnValue({
      lens: 'canvas',
      activeLine: 'Blocks',
      showContext: false,
      hiddenTypes: new Set(),
      activeConnectionTypeId: 'type-blocks',
    } as any);

    renderHook(() => useVisibilityCascade());

    expect(mockSetNodes).toHaveBeenCalled();
    const updatedNodes = mockSetNodes.mock.calls[0][0](initialNodes);

    // e1 is 'type-blocks' between n1 and n2. n3 is not connected via 'type-blocks'.
    expect(updatedNodes.find((n: any) => n.id === 'n1').hidden).toBe(false);
    expect(updatedNodes.find((n: any) => n.id === 'n2').hidden).toBe(false);
    expect(updatedNodes.find((n: any) => n.id === 'n3').hidden).toBe(true);
  });

  it('showContext=false with active type: hides non-active edges', () => {
    vi.mocked(LensContext.useLens).mockReturnValue({
      lens: 'canvas',
      activeLine: 'Blocks',
      showContext: false,
      hiddenTypes: new Set(),
      activeConnectionTypeId: 'type-blocks',
    } as any);

    renderHook(() => useVisibilityCascade());

    expect(mockSetEdges).toHaveBeenCalled();
    const updatedEdges = mockSetEdges.mock.calls[0][0](initialEdges);

    // e1 matches active type, e2 does not
    expect(updatedEdges.find((e: any) => e.id === 'e1').hidden).toBe(false);
    expect(updatedEdges.find((e: any) => e.id === 'e2').hidden).toBe(true);
  });

  it('showContext=false with all lines: hides orphaned nodes', () => {
    // No activeConnectionTypeId — "All Lines" mode
    // All nodes are connected via some edge, so none should be hidden
    vi.mocked(LensContext.useLens).mockReturnValue({
      lens: 'canvas',
      activeLine: 'Blocks',
      showContext: false,
      hiddenTypes: new Set(),
      activeConnectionTypeId: null,
    } as any);

    renderHook(() => useVisibilityCascade());

    expect(mockSetNodes).toHaveBeenCalled();
    const updatedNodes = mockSetNodes.mock.calls[0][0](initialNodes);

    // All nodes connected — none hidden
    expect(updatedNodes.find((n: any) => n.id === 'n1').hidden).toBeFalsy();
    expect(updatedNodes.find((n: any) => n.id === 'n2').hidden).toBeFalsy();
    expect(updatedNodes.find((n: any) => n.id === 'n3').hidden).toBeFalsy();
  });

  it('showContext=false: orphan node IS hidden', () => {
    // Remove edge e2 so n3 becomes orphaned
    const orphanEdges = [initialEdges[0]]; // only e1: n1→n2
    mockGetEdges.mockReturnValue(orphanEdges);

    vi.mocked(LensContext.useLens).mockReturnValue({
      lens: 'canvas',
      activeLine: 'Blocks',
      showContext: false,
      hiddenTypes: new Set(),
      activeConnectionTypeId: null,
    } as any);

    renderHook(() => useVisibilityCascade());

    const updatedNodes = mockSetNodes.mock.calls[0][0](initialNodes);
    expect(updatedNodes.find((n: any) => n.id === 'n1').hidden).toBe(false);
    expect(updatedNodes.find((n: any) => n.id === 'n2').hidden).toBe(false);
    expect(updatedNodes.find((n: any) => n.id === 'n3').hidden).toBe(true);
  });

  it('bailout optimization: returns same reference when nothing changes', () => {
    // All nodes already have hidden=false, which matches showContext=true
    const nodesWithHidden = initialNodes.map(n => ({ ...n, hidden: false }));
    mockSetNodes = vi.fn((updater) => updater(nodesWithHidden));

    vi.mocked(xyflow.useReactFlow).mockReturnValue({
      setNodes: mockSetNodes,
      setEdges: mockSetEdges,
      getEdges: mockGetEdges,
    } as any);

    vi.mocked(LensContext.useLens).mockReturnValue({
      lens: 'canvas',
      activeLine: 'Blocks',
      showContext: true,
      hiddenTypes: new Set(),
      activeConnectionTypeId: null,
    } as any);

    renderHook(() => useVisibilityCascade());

    // Should return same reference (bailout)
    const result = mockSetNodes.mock.calls[0][0](nodesWithHidden);
    expect(result).toBe(nodesWithHidden);
  });
});
