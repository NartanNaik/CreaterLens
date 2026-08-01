import React, { useState, useEffect } from 'react';

export default function EditableCell({ value, type = 'text', options = [], onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);

  // Sync state if external value changes
  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    // Only save to the database if the value actually changed
    if (currentValue !== value) {
      onSave(currentValue);
    }
  };

  // Allow saving by pressing the "Enter" key
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
          style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid var(--primary-color)' }}
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
        style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid var(--primary-color)' }}
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)} 
      style={{ cursor: 'pointer', padding: '4px', minHeight: '20px', borderRadius: '4px' }}
      title="Click to edit"
    >
      {value || '-'}
    </div>
  );
}