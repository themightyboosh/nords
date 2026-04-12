import { renderHook, act } from '@testing-library/react';
import { useSemanticZoom } from '../useSemanticZoom';
import * as xyflow from '@xyflow/react';

vi.mock('@xyflow/react', () => ({
  useStore: vi.fn(),
}));

describe('useSemanticZoom', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    document.documentElement.removeAttribute('data-zoom-tier');
  });

  describe('sets data-zoom-tier to micro/macro/meso based on zoom', () => {
    it('sets micro tier for zoom > 0.6', () => {
      vi.mocked(xyflow.useStore).mockImplementation((selector: any) => selector({ transform: [0, 0, 1.0] }));
      renderHook(() => useSemanticZoom());
      expect(document.documentElement.getAttribute('data-zoom-tier')).toBe('micro');
    });

    it('sets meso tier for zoom > 0.3 && <= 0.6', () => {
      vi.mocked(xyflow.useStore).mockImplementation((selector: any) => selector({ transform: [0, 0, 0.5] }));
      renderHook(() => useSemanticZoom());
      expect(document.documentElement.getAttribute('data-zoom-tier')).toBe('meso');
    });

    it('sets macro tier for zoom <= 0.3', () => {
      vi.mocked(xyflow.useStore).mockImplementation((selector: any) => selector({ transform: [0, 0, 0.2] }));
      renderHook(() => useSemanticZoom());
      expect(document.documentElement.getAttribute('data-zoom-tier')).toBe('macro');
    });
  });
});
