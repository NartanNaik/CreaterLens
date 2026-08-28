import React, { useState } from 'react';

// --- Inline SVGs (No Emojis) ---
const XIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const LayersIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
    <polyline points="2 17 12 22 22 17"></polyline>
    <polyline points="2 12 12 17 22 12"></polyline>
  </svg>
);

const PlusIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const CheckIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

export default function CustomCategoryBuilder({ isOpen, onClose, onSave }) {
  const [name, setName] = useState('');
  const [inputType, setInputType] = useState('text');
  
  const [options, setOptions] = useState([]);
  const [newOption, setNewOption] = useState('');

  if (!isOpen) return null;

  const handleAddOption = (e) => {
    e?.preventDefault();
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions([...options, newOption.trim()]);
      setNewOption('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddOption();
    }
  };

  const handleRemoveOption = (optionToRemove) => {
    setOptions(options.filter(opt => opt !== optionToRemove));
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert("Category name is required.");
      return;
    }
    
    onSave({
      name: name.trim(),
      inputType,
      options: inputType === 'dropdown' ? options : []
    });
    
    // Reset state
    setName('');
    setInputType('text');
    setOptions([]);
    setNewOption('');
    onClose();
  };

  const handleCancel = () => {
    setName('');
    setInputType('text');
    setOptions([]);
    setNewOption('');
    onClose();
  };

  return (
    <div className="modal-overlay custom-schema-overlay">
      <div className="custom-schema-card glass-panel" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="custom-schema-header">
          <h2 className="custom-schema-title">
            <LayersIcon /> Add Custom Schema
          </h2>
          <button 
            onClick={handleCancel}
            className="custom-schema-close-btn"
          >
            <XIcon />
          </button>
        </div>
        
        {/* Body */}
        <div className="custom-schema-body">
          
          {/* Category Name */}
          <div className="custom-schema-group">
            <label className="custom-schema-label">Column Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hair Color, Follower Goal"
              className="custom-schema-input"
            />
          </div>

          {/* Input Type */}
          <div className="custom-schema-group">
            <label className="custom-schema-label">Data Type</label>
            <select 
              value={inputType} 
              onChange={(e) => setInputType(e.target.value)}
              className="custom-schema-select"
            >
              <option value="text">Free Text Input</option>
              <option value="dropdown">Dropdown Options</option>
            </select>
          </div>

          {/* Dropdown Builder */}
          {inputType === 'dropdown' && (
            <div className="custom-schema-dropdown-section">
              <label className="custom-schema-label">Configure Dropdown Options</label>
              
              <div className="custom-schema-add-row">
                <input 
                  type="text" 
                  value={newOption} 
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type option and press Enter..."
                  className="custom-schema-input"
                />
                <button 
                  onClick={handleAddOption}
                  disabled={!newOption.trim()}
                  className="custom-schema-add-btn"
                >
                  <PlusIcon /> Add
                </button>
              </div>
              
              {options.length > 0 && (
                <ul className="custom-schema-options-list">
                  {options.map((opt, idx) => (
                    <li key={idx} className="custom-schema-option-tag">
                      <span>{opt}</span>
                      <button 
                        onClick={() => handleRemoveOption(opt)}
                        className="custom-schema-remove-tag-btn"
                        title="Remove option"
                      >
                        <XIcon />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {options.length === 0 && (
                <p className="custom-schema-empty-text">No options added yet. Your dropdown will be empty.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="custom-schema-footer">
          <button 
            onClick={handleCancel}
            className="custom-schema-cancel-btn"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="custom-schema-save-btn"
          >
            <CheckIcon /> Create Column
          </button>
        </div>

      </div>
    </div>
  );
}