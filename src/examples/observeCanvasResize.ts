declare global {
  interface ResizeObserverEntry {
    devicePixelContentBoxSize: { inlineSize: number; blockSize: number }[];
  }
}

export default function observeCanvasResize(
  canvas: HTMLCanvasElement,
  callback: (size: { x: number; y: number }) => void,
) {
  const observer = new ResizeObserver((entries) => {
    const entry = entries.find(($0) => $0.target === canvas);
    if (!entry) return;
    callback({ x: entry.devicePixelContentBoxSize[0].inlineSize, y: entry.devicePixelContentBoxSize[0].blockSize });
  });
  observer.observe(canvas, { box: ['device-pixel-content-box'] as unknown as ResizeObserverBoxOptions });
}
