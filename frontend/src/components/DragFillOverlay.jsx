import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const OFFSET = 16; // gap between cursor and pill
const MARGIN = 8;  // minimum gap to the viewport edge

const formatValue = (v) => {
  if (v === null || v === undefined || v === '') return '-';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v); // 0 stays "0"
};

export default function DragFillOverlay({ visible, value, count }) {
  const pillRef = useRef(null);
  const posRef = useRef({ x: -9999, y: -9999 });

  // Position the pill near the cursor, flipping or clamping so it stays on screen.
  // Only CSS custom properties are written (read by .drag-fill-pill in App.css),
  // so cursor movement causes no React re-renders and no inline style props.
  const place = () => {
    const el = pillRef.current;
    if (!el) return;

    const { x, y } = posRef.current;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = x + OFFSET;
    let top = y + OFFSET;
    if (left + w > vw - MARGIN) left = x - OFFSET - w; // flip to the left of the cursor
    if (top + h > vh - MARGIN) top = y - OFFSET - h;   // flip above the cursor

    left = Math.max(MARGIN, Math.min(left, vw - w - MARGIN));
    top = Math.max(MARGIN, Math.min(top, vh - h - MARGIN));

    el.style.setProperty('--drag-x', `${Math.round(left)}px`);
    el.style.setProperty('--drag-y', `${Math.round(top)}px`);
  };

  // Always remember the last cursor position, so the pill appears in the right place
  // the moment a drag becomes visible.
  useEffect(() => {
    const onMove = (e) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      place();
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Re-place when the pill mounts or its text (and therefore its width) changes.
  useLayoutEffect(() => {
    if (visible) place();
  }, [visible, value, count]);

  if (!visible) return null;

  const rows = `${count} row${count !== 1 ? 's' : ''}`;

  return createPortal(
    <div className="drag-fill-pill" ref={pillRef} aria-hidden="true">
      <span className="drag-fill-pill-label">Fill {rows} with</span>
      <span className="drag-fill-pill-quote">‘</span>
      <span className="drag-fill-pill-value">{formatValue(value)}</span>
      <span className="drag-fill-pill-quote">’</span>
    </div>,
    document.body
  );
}