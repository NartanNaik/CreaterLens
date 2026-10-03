import React, { useState, useEffect, useRef } from 'react';

const isNil = (v) => v === null || v === undefined || v === '';
const toDraft = (v) => (isNil(v) ? '' : String(v));

// Returns { ok, value }. ok=false means "don't save this".
const parseDraft = (raw, type, required) => {
  const text = String(raw).trim();
  if (type === 'number') {
    if (text === '') return { ok: false };
    const n = Number(text);
    if (!Number.isFinite(n) || n < 0) return { ok: false };
    return { ok: true, value: n };
  }
  if (text === '' && required) return { ok: false };
  return { ok: true, value: text };
};

export default function EditableCell({
  value,
  type = 'text',          // 'text' | 'number' | 'select'
  options = [],
  onSave,
  editOn = 'click',       // 'click' | 'doubleClick'
  required = false        // text only: refuse to save an empty string
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(toDraft(value));
  const [invalid, setInvalid] = useState(false);

  const finishedRef = useRef(false); // guards against double commit / blur-after-escape
  const inputRef = useRef(null);

  // Keep the draft in sync with the prop whenever we're not editing
  // (covers cancel, successful save, and rollbacks from the parent).
  useEffect(() => {
    if (!isEditing) setDraft(toDraft(value));
  }, [value, isEditing]);

  // Focus on entering edit mode; open the picker for selects, select the text otherwise.
  useEffect(() => {
    if (!isEditing) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    if (type === 'select') {
      try { el.showPicker?.(); } catch { /* not allowed without user activation */ }
    } else {
      el.select?.();
    }
  }, [isEditing, type]);

  const startEditing = () => {
    finishedRef.current = false;
    setDraft(toDraft(value));
    setInvalid(false);
    setIsEditing(true);
  };

  const finish = () => {
    finishedRef.current = true;
    setIsEditing(false);
    setInvalid(false);
  };

  const cancel = () => {
    if (finishedRef.current) return;
    finish();
  };

  const commit = (fromBlur = false) => {
    if (finishedRef.current) return;
    const result = parseDraft(draft, type, required);

    if (!result.ok) {
      if (fromBlur) finish();     // leaving the cell with a bad value: revert
      else setInvalid(true);      // Enter with a bad value: stay open and flag it
      return;
    }

    finish();
    if (String(result.value) !== toDraft(value)) onSave(result.value); // only if changed
  };

  const handleChange = (e) => {
    const next = e.target.value;
    setDraft(next);
    if (type === 'number') {
      setInvalid(next.trim() !== '' && !parseDraft(next, type, required).ok);
    } else {
      setInvalid(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit(false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    } else if (type === 'number' && ['-', '+', 'e', 'E'].includes(e.key)) {
      e.preventDefault(); // no negatives / exponent junk
    }
  };

  const handleSelectChange = (e) => {
    if (finishedRef.current) return;
    const next = e.target.value;
    finish();
    if (next !== toDraft(value)) onSave(next);
  };

  // Only mousedown is stopped, and only while editing, so clicking/selecting text inside
  // the input never starts a drag-fill on the parent <td>. mouseenter/mouseup still
  // bubble, so a drag that passes over an open editor can finish normally.
  const stopMouseDown = (e) => e.stopPropagation();

  if (isEditing) {
    if (type === 'select') {
      const opts = !isNil(value) && !options.includes(value) ? [value, ...options] : options;
      return (
        <select
          ref={inputRef}
          value={toDraft(value)}
          onChange={handleSelectChange}
          onBlur={cancel}
          onKeyDown={handleKeyDown}
          onMouseDown={stopMouseDown}
          className="editable-cell-input editable-cell-select"
        >
          <option value="" disabled>Select...</option>
          {opts.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        ref={inputRef}
        type={type === 'number' ? 'number' : 'text'}
        {...(type === 'number' ? { min: 0, step: 'any', inputMode: 'decimal' } : {})}
        value={draft}
        onChange={handleChange}
        onBlur={() => commit(true)}
        onKeyDown={handleKeyDown}
        onMouseDown={stopMouseDown}
        aria-invalid={invalid || undefined}
        className={`editable-cell-input${invalid ? ' is-invalid' : ''}`}
      />
    );
  }

  return (
    <div
      className="editable-cell-display"
      role="button"
      tabIndex={0}
      title={editOn === 'doubleClick' ? 'Double-click to edit' : 'Click to edit'}
      onClick={editOn === 'click' ? startEditing : undefined}
      onDoubleClick={editOn === 'doubleClick' ? startEditing : undefined}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === 'F2') {
          e.preventDefault();
          startEditing();
        }
      }}
    >
      {isNil(value) ? (
        <span className="editable-cell-placeholder">-</span>
      ) : (
        <span>{value}</span>
      )}
    </div>
  );
}