import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/*
  Guided product tour. Each step is { id, title, text, selector?, route?, isNew? }.
  - selector: CSS selector of the element to highlight (no selector = centred message)
  - route:    the page the step lives on (the parent switches to it in onStepChange)
  All positions are applied through CSS custom properties; the styles live in App.css (.tour-*).
*/

function layoutFor(rect) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(320, vw - 24);

  if (!rect) {
    return { placement: 'center', width, left: (vw - width) / 2, y: Math.max(90, vh / 2 - 120), tailX: 0 };
  }

  const centerX = rect.left + rect.width / 2;
  const left = Math.max(12, Math.min(centerX - width / 2, vw - width - 12));
  const tailX = Math.max(30, Math.min(centerX - left, width - 30));

  const spaceBelow = vh - (rect.top + rect.height);
  const below = spaceBelow >= 250 || rect.top < 250;

  return below
    ? { placement: 'below', width, left, y: rect.top + rect.height + 22, tailX }
    : { placement: 'above', width, left, y: vh - rect.top + 22, tailX };
}

export default function Tour({ steps, onClose, onStepChange }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [resizeTick, setResizeTick] = useState(0);

  const bubbleRef = useRef(null);
  const spotRef = useRef(null);

  const step = steps[index];
  const last = index >= steps.length - 1;

  // Tell the parent which step is showing (it may need to switch pages)
  useEffect(() => {
    if (step && onStepChange) onStepChange(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id]);

  // Follow the target every frame, so the highlight stays attached while the page scrolls or loads
  useEffect(() => {
    if (!step) return undefined;
    let raf;
    let scrolled = false;
    let lastKey = '';

    const tick = () => {
      const el = step.selector ? document.querySelector(step.selector) : null;
      const r = el ? el.getBoundingClientRect() : null;

      if (el && r.width > 0 && r.height > 0) {
        if (!scrolled) {
          scrolled = true;
          el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        const key = `${Math.round(r.top)}|${Math.round(r.left)}|${Math.round(r.width)}|${Math.round(r.height)}`;
        if (key !== lastKey) {
          lastKey = key;
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        }
      } else if (lastKey !== 'none') {
        lastKey = 'none';
        setRect(null);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => setResizeTick((n) => n + 1);
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [step?.id]);

  // Keyboard support
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') {
        if (last) onClose();
        else setIndex((i) => i + 1);
      } else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [last, onClose]);

  const layout = layoutFor(rect);

  // Hand the numbers to CSS (custom properties instead of inline style props)
  useLayoutEffect(() => {
    const bubble = bubbleRef.current;
    if (bubble) {
      const l = layoutFor(rect);
      bubble.style.setProperty('--tour-w', `${l.width}px`);
      bubble.style.setProperty('--tour-x', `${l.left}px`);
      bubble.style.setProperty('--tour-y', `${l.y}px`);
      bubble.style.setProperty('--tail-x', `${l.tailX}px`);
    }
    const spot = spotRef.current;
    if (spot && rect) {
      spot.style.setProperty('--spot-top', `${rect.top - 6}px`);
      spot.style.setProperty('--spot-left', `${rect.left - 6}px`);
      spot.style.setProperty('--spot-w', `${rect.width + 12}px`);
      spot.style.setProperty('--spot-h', `${rect.height + 12}px`);
    }
  }, [rect, resizeTick, index]);

  if (!step) return null;

  return createPortal(
    <>
      <div className={`tour-shield${rect ? '' : ' dim'}`} />
      {rect && <div className="tour-spot" ref={spotRef} />}
      <div key={step.id} className={`tour-bubble ${layout.placement}`} ref={bubbleRef} role="dialog" aria-live="polite">
        {layout.placement !== 'center' && <span className={`tour-tail ${layout.placement}`} />}
        {step.isNew && <span className="tour-badge">New</span>}
        <div className="tour-count">Step {index + 1} of {steps.length}</div>
        <div className="tour-title">{step.title}</div>
        <p className="tour-text">{step.text}</p>
        <div className="tour-controls">
          <button type="button" className="tour-skip" onClick={onClose}>Skip</button>
          <div className="tour-actions">
            {index > 0 && (
              <button type="button" className="tour-back" onClick={() => setIndex((i) => i - 1)}>Back</button>
            )}
            <button
              type="button"
              className="tour-next"
              onClick={() => (last ? onClose() : setIndex((i) => i + 1))}
            >
              {last ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}