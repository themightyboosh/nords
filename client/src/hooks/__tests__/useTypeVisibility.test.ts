import { renderHook, act } from '@testing-library/react';
import { useTypeVisibility } from '../useTypeVisibility';
import * as LensContext from '../../context/LensContext';
import * as useTypeRegistryModule from '../useTypeRegistry';
import { Square, Bug } from 'lucide-react';

vi.mock('../../context/LensContext', () => ({
  useLens: vi.fn(),
}));

vi.mock('../useTypeRegistry', () => ({
  useTypeRegistry: vi.fn(),
}));

describe('useTypeVisibility', () => {
  let mockToggleTypeVisibility: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
    mockToggleTypeVisibility = vi.fn();
    
    vi.mocked(LensContext.useLens).mockReturnValue({
      lens: 'canvas',
      setLens: vi.fn(),
      activeLine: 'Blocks',
      setActiveLine: vi.fn(),
      showContext: true,
      setShowContext: vi.fn(),
      hiddenTypes: new Set<string>(),
      toggleTypeVisibility: mockToggleTypeVisibility,
    });

    vi.mocked(useTypeRegistryModule.useTypeRegistry).mockReturnValue({
      nordTypes: [
        { name: 'Task', icon: Square, color: '#4da6ff', count: 4 },
        { name: 'Bug', icon: Bug, color: '#f87171', count: 1 },
      ],
      connectionTypes: [
        { name: 'Blocks', color: '#4da6ff', count: 5 },
      ]
    });
  });

  it('defaults to all types visible', () => {
    const { result } = renderHook(() => useTypeVisibility());
    expect(result.current.visibleNodeTypes).toEqual([
      { name: 'Task', icon: Square, color: '#4da6ff', count: 4, visible: true },
      { name: 'Bug', icon: Bug, color: '#f87171', count: 1, visible: true },
    ]);
  });

  it('resolves hidden types', () => {
    vi.mocked(LensContext.useLens).mockReturnValue({
      lens: 'canvas',
      setLens: vi.fn(),
      activeLine: 'Blocks',
      setActiveLine: vi.fn(),
      showContext: true,
      setShowContext: vi.fn(),
      hiddenTypes: new Set(['Bug']),
      toggleTypeVisibility: mockToggleTypeVisibility,
    });

    const { result } = renderHook(() => useTypeVisibility());
    expect(result.current.visibleNodeTypes).toEqual([
      { name: 'Task', icon: Square, color: '#4da6ff', count: 4, visible: true },
      { name: 'Bug', icon: Bug, color: '#f87171', count: 1, visible: false },
    ]);
  });

  it('calls toggleTypeVisibility', () => {
    const { result } = renderHook(() => useTypeVisibility());
    act(() => {
      result.current.toggleNodeType('Task');
    });
    expect(mockToggleTypeVisibility).toHaveBeenCalledWith('Task');
  });
});
