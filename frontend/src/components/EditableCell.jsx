import React, { useState, useEffect } from 'react';

export default function EditableCell({ value, type = 'text', options = [], onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    // Only trigger a save if the value actually changed
    if (currentValue !== value) {
      onSave(currentValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      // Abort edit and revert to original value
      setCurrentValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    if (type === 'select') {
      return (
        <select 
          autoFocus
          value={currentValue || ''}
          onChange={(e) => setCurrentValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="editable-cell-input editable-cell-select"
        >
          <option value="" disabled>Select...</option>
          {options.map(opt => (
            <option key={opt} value={opt} className="editable-select-option">{opt}</option>
          ))}
        </select>
      );
    }
    
    return (
      <input
        autoFocus
        type={type}
        value={currentValue || ''}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="editable-cell-input"
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)} 
      className="editable-cell-display"
      title="Click to edit"
    >
      {value ? (
        <span>{value}</span>
      ) : (
        <span className="editable-cell-placeholder">-</span>
      )}
    </div>
  );
}