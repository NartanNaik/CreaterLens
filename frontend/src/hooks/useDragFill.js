import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Drag-fill for table columns.
 * onFillComplete(startIdx, endIdx, columnKey, value) is called with start <= end
 * (indices are row positions in the displayed list).
 */
export default function useDragFill(onFillComplete) {
  // Live drag session: { startIdx, currentIdx, column, value } or null.
  const [drag, setDrag] = useState(null);

  // Mirror in a ref so handlers always see the latest session (no stale closures,
  // and a mousedown + mouseup inside one frame still works).
  const dragRef = useRef(null);

  // Always call the latest callback (it closes over the current filtered/sorted rows).
  const onFillRef = useRef(onFillComplete);
  useEffect(() => {
    onFillRef.current = onFillComplete;
  }, [onFillComplete]);

  const update = useCallback((next) => {
    dragRef.current = next;
    setDrag(next);
  }, []);

  const cancel = useCallback(() => {
    if (dragRef.current) update(null);
  }, [update]);

  // The optional 4th argument is the mouse event; only the left button starts a drag.
  const handleMouseDown = useCallback((rowIndex, columnKey, value, event) => {
    if (event && event.button !== 0) return;
    update({
      startIdx: rowIndex,
      currentIdx: rowIndex,
      column: columnKey,
      // undefined would be dropped by JSON.stringify; null clears the field instead
      value: value === undefined ? null : value
    });
  }, [update]);

  const handleMouseEnter = useCallback((rowIndex, columnKey) => {
    const d = dragRef.current;
    // Same column only; ignore re-entering the row we're already on
    if (!d || d.column !== columnKey || d.currentIdx === rowIndex) return;
    update({ ...d, currentIdx: rowIndex });
    window.getSelection()?.removeAllRanges(); // clear any selection the drag started
  }, [update]);

  const handleMouseUp = useCallback((endIdx, columnKey) => {
    const d = dragRef.current;
    if (!d) return;            // no drag active (e.g. a plain mouseup on a cell)

    update(null);              // reset first, whatever happens next

    if (d.column !== columnKey) return;   // released in another column: cancel

    const start = Math.min(d.startIdx, endIdx);   // upward drags are normalized
    const end = Math.max(d.startIdx, endIdx);
    if (start === end) return;                    // plain click: no fill

    try {
      Promise.resolve(onFillRef.current?.(start, end, d.column, d.value))
        .catch((err) => console.error('Drag-fill failed:', err));
    } catch (err) {
      console.error('Drag-fill failed:', err);
    }
  }, [update]);

  // Released inside the container but not on a cell -> cancel. Kept in the return
  // value so your existing onMouseUp={dragFill.handleGlobalMouseUp} still works.
  const handleGlobalMouseUp = cancel;

  // While a drag is active: cancel on mouseup anywhere (window), Escape, or window blur;
  // block text selection and native drag; undo everything on end or unmount.
  const isDragging = drag !== null;
  useEffect(() => {
    if (!isDragging) return;

    const body = document.body;
    const prevUserSelect = body.style.userSelect;
    const prevWebkitUserSelect = body.style.webkitUserSelect;
    body.style.userSelect = 'none';
    body.style.webkitUserSelect = 'none';

    const onKeyDown = (e) => { if (e.key === 'Escape') cancel(); };
    const blockNativeDrag = (e) => e.preventDefault();

    // React's cell handlers run before this window listener, so a mouseup on a
    // valid cell completes the fill first; this only catches releases elsewhere.
    window.addEventListener('mouseup', cancel);
    window.addEventListener('blur', cancel);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('dragstart', blockNativeDrag);

    return () => {
      window.removeEventListener('mouseup', cancel);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('dragstart', blockNativeDrag);
      body.style.userSelect = prevUserSelect;
      body.style.webkitUserSelect = prevWebkitUserSelect;
    };
  }, [isDragging, cancel]);

  const count = drag ? Math.abs(drag.currentIdx - drag.startIdx) + 1 : 0;

  return {
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    handleGlobalMouseUp,
    cancelDrag: cancel,
    isDragging,
    isVisible: isDragging && count > 1,   // overlay only once more than one row is covered
    value: drag ? drag.value : null,
    count
  };
}