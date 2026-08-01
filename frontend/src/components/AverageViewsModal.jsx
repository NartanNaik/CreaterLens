import React, { useState } from 'react';

export default function AverageViewsModal({ isOpen, onClose, profileId, onSave }) {
  // Array holding exactly 7 reel view inputs
  const [views, setViews] = useState(['', '', '', '', '', '', '']);

  if (!isOpen) return null;

  const handleInputChange = (index, value) => {
    const newViews = [...views];
    newViews[index] = value;
    setViews(newViews);
  };

  // The built-in calculator logic
  const calculateAverage = () => {
    // Convert strings to numbers, treating empty fields as 0
    const numericViews = views.map(v => Number(v) || 0);
    const sum = numericViews.reduce((a, b) => a + b, 0);
    return Math.round(sum / 7); // Round to nearest whole number
  };

  const handleSave = () => {
    const average = calculateAverage();
    onSave(profileId, average); // Pass the calculated average back up
    setViews(['', '', '', '', '', '', '']); // Reset fields
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content">
        <h2>Calculate 7-Reel Average</h2>
        
        <div className="reel-inputs-grid" style={{ display: 'grid', gap: '10px', marginTop: '15px' }}>
          {views.map((view, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label>Reel {index + 1} Views:</label>
              <input 
                type="number" 
                value={view} 
                onChange={(e) => handleInputChange(index, e.target.value)}
                placeholder="e.g. 15000"
                style={{ padding: '5px', borderRadius: '5px', border: '1px solid var(--glass-border)' }}
              />
            </div>
          ))}
        </div>

        <div className="calculator-result" style={{ marginTop: '20px', textAlign: 'center' }}>
          <h3>Current Average: <span style={{ color: 'var(--primary-color)' }}>{calculateAverage().toLocaleString()}</span></h3>
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
            Save Average
          </button>
        </div>
      </div>
    </div>
  );
}