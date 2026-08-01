import React, { useState, useEffect } from 'react';

export default function EditableCell({ value, type = 'text', options = [], onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    if (currentValue !== value) {
      onSave(currentValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  if (isEditing) {
    if (type === 'select') {
      return (
        <select 
          autoFocus
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="editable-input"
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }
    
    return (
      <input
        autoFocus
        type={type}
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="editable-input"
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)} 
      className="editable-display"
      title="Click to edit"
    >
      {value || '-'}
    </div>
  );
}