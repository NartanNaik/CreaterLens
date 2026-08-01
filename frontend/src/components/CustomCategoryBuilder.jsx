import React, { useState } from 'react';

export default function CustomCategoryBuilder({ isOpen, onClose, onSave }) {
  const [name, setName] = useState('');
  const [inputType, setInputType] = useState('text');
  
  const [options, setOptions] = useState([]);
  const [newOption, setNewOption] = useState('');

  if (!isOpen) return null;

  const handleAddOption = (e) => {
    e.preventDefault();
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions([...options, newOption.trim()]);
      setNewOption('');
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
    
    setName('');
    setInputType('text');
    setOptions([]);
    setNewOption('');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content custom-category-modal">
        <h2>Add Custom Category</h2>
        
        <div className="custom-category-form">
          <div>
            <label className="custom-category-label">Category Name:</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Eye Color"
              className="custom-category-input"
            />
          </div>

          <div>
            <label className="custom-category-label">Input Type:</label>
            <select 
              value={inputType} 
              onChange={(e) => setInputType(e.target.value)}
              className="custom-category-input"
            >
              <option value="text">Free Text</option>
              <option value="dropdown">Dropdown Options</option>
            </select>
          </div>

          {inputType === 'dropdown' && (
            <div className="custom-category-dropdown-builder">
              <label className="custom-category-label">Dropdown Options:</label>
              <div className="custom-category-add-wrapper">
                <input 
                  type="text" 
                  value={newOption} 
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="e.g. Blue"
                  className="custom-category-add-input"
                />
                <button 
                  onClick={handleAddOption}
                  className="custom-category-add-btn"
                >
                  Add
                </button>
              </div>
              
              <ul className="custom-category-options-list">
                {options.map((opt, idx) => (
                  <li key={idx} className="custom-category-option-item">
                    {opt}
                    <span 
                      className="custom-category-remove-btn"
                      onClick={() => handleRemoveOption(opt)}
                    >
                      <svg className="svg-icon remove-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="modal-actions custom-category-actions">
          <button 
            onClick={onClose}
            className="custom-category-cancel-btn"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="custom-category-save-btn"
          >
            Create Category
          </button>
        </div>
      </div>
    </div>
  );
}