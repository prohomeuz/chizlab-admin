import { useEffect, useRef, useState } from 'react';

/**
 * Custom SVG cursor that follows the mouse.
 * Only active on fine-pointer (non-touch) devices.
 * Swaps between cursor.svg and click.svg on mousedown/mouseup.
 */
export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isClick, setIsClick] = useState(false);
  const posRef = useRef({ x: -100, y: -100 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Only apply on fine-pointer devices
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const onMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
    };
    const onDown = () => setIsClick(true);
    const onUp   = () => setIsClick(false);

    const loop = () => {
      if (cursorRef.current) {
        cursorRef.current.style.transform =
          `translate(${posRef.current.x}px, ${posRef.current.y}px)`;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup',   onUp);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup',   onUp);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      className="fixed top-0 left-0 z-[9999] pointer-events-none will-change-transform"
      style={{ transform: 'translate(-100px, -100px)' }}
    >
      <img
        src={isClick ? '/brand/click.svg' : '/brand/cursor.svg'}
        alt=""
        width={32}
        height={32}
        style={{ display: 'block', userSelect: 'none' }}
      />
    </div>
  );
}
