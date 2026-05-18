import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// jsdom does not implement Element.scrollIntoView, which Radix Select uses
// when an item is highlighted on open. Polyfill as a no-op.
if (!(Element.prototype as { scrollIntoView?: unknown }).scrollIntoView) {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    value: vi.fn(),
    writable: true,
  });
}
// PointerEvent is not implemented in jsdom; Radix uses it when interacting
// with portalled content. Provide minimal aliases so tests can drive it.
if (typeof window.PointerEvent === 'undefined') {
  (window as any).PointerEvent = window.MouseEvent;
}
// Radix uses element.hasPointerCapture / setPointerCapture / releasePointerCapture.
const elementProto = Element.prototype as unknown as Record<string, unknown>;
if (typeof elementProto.hasPointerCapture !== 'function') {
  elementProto.hasPointerCapture = (): boolean => false;
  elementProto.setPointerCapture = (): void => undefined;
  elementProto.releasePointerCapture = (): void => undefined;
}

// Sonner reads `window.matchMedia` to react to OS dark-mode changes; jsdom
// doesn't implement it, so stub a minimal listener-less MediaQueryList.
if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

const mockVsCodeApi = {
  postMessage: vi.fn(),
  getState: vi.fn(() => undefined),
  setState: vi.fn((state: unknown) => state),
};

(globalThis as unknown as { acquireVsCodeApi: () => unknown }).acquireVsCodeApi = vi.fn(
  () => mockVsCodeApi,
);

export { mockVsCodeApi };
