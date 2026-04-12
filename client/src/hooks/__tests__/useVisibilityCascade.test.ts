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
    { id: 'e1', source: 'n1', target: 'n2', data: { type: 'Blocks', ghost: false } },
    { id: 'e2', source: 'n2', target: 'n3', data: { type: 'Relates', ghost: false } },
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

  it('canvas mode: ghosts nodes if their type is hidden', () => {
    vi.mocked(LensContext.useLens).mockReturnValue({
      lens: 'canvas',
      activeLine: 'Blocks',
      showContext: true,
      hiddenTypes: new Set(['Bug']),
    } as any);

    renderHook(() => useVisibilityCascade());
    
    expect(mockSetNodes).toHaveBeenCalled();
    const updatedNodes = mockSetNodes.mock.calls[0][0](initialNodes);
    
    expect(updatedNodes.find((n: any) => n.id === 'n1').data.isGhosted).toBe(false);
    expect(updatedNodes.find((n: any) => n.id === 'n2').data.isGhosted).toBe(true); // Bug is hidden
  });

  it('link mode: ghosts unconnected nodes (when showContext true)', () => {
    vi.mocked(LensContext.useLens).mockReturnValue({
      lens: 'link',
      activeLine: 'Blocks',
      showContext: true,
      hiddenTypes: new Set(),
    } as any);

    renderHook(() => useVisibilityCascade());
    
    // e1 is 'Blocks' between n1 and n2. n3 is disconnected from 'Blocks'
    const updatedNodes = mockSetNodes.mock.calls[0][0](initialNodes);
    expect(updatedNodes.find((n: any) => n.id === 'n1').data.isGhosted).toBe(false);
    expect(updatedNodes.find((n: any) => n.id === 'n2').data.isGhosted).toBe(false);
    expect(updatedNodes.find((n: any) => n.id === 'n3').data.isGhosted).toBe(true);
  });

  it('link mode: hides unconnected nodes (when showContext false)', () => {
    vi.mocked(LensContext.useLens).mockReturnValue({
      lens: 'link',
      activeLine: 'Blocks',
      showContext: false,
      hiddenTypes: new Set(),
    } as any);

    renderHook(() => useVisibilityCascade());
    
    const updatedNodes = mockSetNodes.mock.calls[0][0](initialNodes);
    expect(updatedNodes.find((n: any) => n.id === 'n3').hidden).toBe(true);
  });
});
