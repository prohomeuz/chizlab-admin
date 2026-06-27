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

    const hide = () => {
      if (cursorRef.current) cursorRef.current.style.opacity = '0';
      setIsClick(false);
    };
    const show = () => {
      if (cursorRef.current) cursorRef.current.style.opacity = '1';
    };

    const loop = () => {
      if (cursorRef.current) {
        cursorRef.current.style.transform =
          `translate(${posRef.current.x - 19.5}px, ${posRef.current.y - 19.5}px)`;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('blur',      hide);
    document.addEventListener('mouseleave', hide);
    document.addEventListener('mouseenter', show);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('blur',      hide);
      document.removeEventListener('mouseleave', hide);
      document.removeEventListener('mouseenter', show);
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
        style={{ display: 'block', userSelect: 'none', width: 65, height: 64 }}
      />
    </div>
  );
}
