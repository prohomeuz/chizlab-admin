import { useEffect, useRef, useState } from 'react';

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isClick, setIsClick] = useState(false);
  const posRef = useRef({ x: -100, y: -100 });
  const rafRef = useRef<number | null>(null);
  const selectOpenRef = useRef(false);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const hide = () => {
      if (cursorRef.current) cursorRef.current.style.opacity = '0';
      setIsClick(false);
    };
    const show = () => {
      if (cursorRef.current && !selectOpenRef.current && !overTextRef.current) cursorRef.current.style.opacity = '1';
    };

    const overTextRef = { current: false };

    const onOver = (e: MouseEvent) => {
      const target = e.target as Element;
      const isText = !!target.closest('input, textarea');
      overTextRef.current = isText;
      if (cursorRef.current && !selectOpenRef.current) {
        cursorRef.current.style.opacity = isText ? '0' : '1';
      }
    };

    const onMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      // Dropdown yopildi — mousemove qayta ishlay boshladi
      if (selectOpenRef.current) {
        selectOpenRef.current = false;
        if (cursorRef.current && !overTextRef.current) cursorRef.current.style.opacity = '1';
      }
    };

    const onDown = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest('select')) {
        // Select bosildi — OS dropdown ochiladi, custom cursor yashiriladi
        selectOpenRef.current = true;
        if (cursorRef.current) cursorRef.current.style.opacity = '0';
      } else {
        setIsClick(true);
      }
    };

    const onUp = () => setIsClick(false);

    // Sahifadan chiqganda: mouseleave + mouseout (null relatedTarget) ikkalasi
    const onOut = (e: MouseEvent) => {
      if (!e.relatedTarget) hide();
    };

    const loop = () => {
      if (cursorRef.current) {
        cursorRef.current.style.transform =
          `translate(${posRef.current.x - 19.5}px, ${posRef.current.y - 19.5}px)`;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove',   onMove);
    window.addEventListener('mousedown',   onDown);
    window.addEventListener('mouseup',     onUp);
    window.addEventListener('blur',        hide);
    document.addEventListener('mouseleave', hide);
    document.addEventListener('mouseenter', show);
    document.addEventListener('mouseout',   onOut);
    document.addEventListener('mouseover',  onOver);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove',   onMove);
      window.removeEventListener('mousedown',   onDown);
      window.removeEventListener('mouseup',     onUp);
      window.removeEventListener('blur',        hide);
      document.removeEventListener('mouseleave', hide);
      document.removeEventListener('mouseenter', show);
      document.removeEventListener('mouseout',   onOut);
      document.removeEventListener('mouseover',  onOver);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      className="fixed top-0 left-0 z-[9999] pointer-events-none will-change-transform"
      style={{ transform: 'translate(-100px, -100px)', opacity: 0 }}
    >
      <img
        src={isClick ? '/brand/click.svg' : '/brand/cursor.svg'}
        alt=""
        style={{ display: 'block', userSelect: 'none', width: 65, height: 64 }}
      />
    </div>
  );
}
