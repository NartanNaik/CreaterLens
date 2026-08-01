import React, { useState } from 'react';

export default function CustomCategoryBuilder({ isOpen, onClose, onSave }) {
  const [name, setName] = useState('');
  const [inputType, setInputType] = useState('text');
  
  // State for handling dropdown options
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
    
    // Pass the data back to the dashboard to send to the backend
    onSave({
      name: name.trim(),
      inputType,
      options: inputType === 'dropdown' ? options : []
    });
    
    // Reset form and close
    setName('');
    setInputType('text');
    setOptions([]);
    setNewOption('');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content" style={{ width: '400px' }}>
        <h2>Add Custom Category</h2>
        
        <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Category Name:</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Eye Color"
              style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid var(--glass-border)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Input Type:</label>
            <select 
              value={inputType} 
              onChange={(e) => setInputType(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid var(--glass-border)' }}
            >
              <option value="text">Free Text</option>
              <option value="dropdown">Dropdown Options</option>
            </select>
          </div>

          {/* Only show the options builder if they select 'dropdown' */}
          {inputType === 'dropdown' && (
            <div style={{ background: 'var(--glass-bg)', padding: '10px', borderRadius: '5px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Dropdown Options:</label>
              <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                <input 
                  type="text" 
                  value={newOption} 
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="e.g. Blue"
                  style={{ flex: 1, padding: '5px', borderRadius: '5px', border: '1px solid var(--glass-border)' }}
                />
                <button 
                  onClick={handleAddOption}
                  style={{ padding: '5px 10px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                >
                  Add
                </button>
              </div>
              
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {options.map((opt, idx) => (
                  <li key={idx} style={{ background: 'var(--secondary-color)', padding: '4px 8px', borderRadius: '15px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {opt}
                    <span 
                      style={{ cursor: 'pointer', color: 'var(--status-no)', fontWeight: 'bold' }} 
                      onClick={() => handleRemoveOption(opt)}
                    >
                      ×
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button 
            onClick={onClose}
            style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', borderRadius: '5px' }}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            style={{ padding: '8px 16px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Create Category
          </button>
        </div>
      </div>
    </div>
  );
}