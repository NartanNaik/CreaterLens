import React, { useState } from 'react';

export default function AverageViewsModal({ isOpen, onClose, profileId, onSave }) {
  const [views, setViews] = useState(['', '', '', '', '', '', '']);

  if (!isOpen) return null;

  const handleInputChange = (index, value) => {
    const newViews = [...views];
    newViews[index] = value;
    setViews(newViews);
  };

  const calculateAverage = () => {
    const numericViews = views.map(v => Number(v) || 0);
    const sum = numericViews.reduce((a, b) => a + b, 0);
    return Math.round(sum / 7);
  };

  const handleSave = () => {
    const average = calculateAverage();
    onSave(profileId, average);
    setViews(['', '', '', '', '', '', '']);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content">
        <h2>Calculate 7-Reel Average</h2>
        
        <div className="reel-inputs-grid">
          {views.map((view, index) => (
            <div key={index} className="reel-input-row">
              <label>Reel {index + 1} Views:</label>
              <input 
                type="number" 
                value={view} 
                onChange={(e) => handleInputChange(index, e.target.value)}
                placeholder="e.g. 15000"
                className="reel-input-field"
              />
            </div>
          ))}
        </div>

        <div className="calculator-result">
          <h3>Current Average: <span className="calculator-average-value">{calculateAverage().toLocaleString()}</span></h3>
        </div>

        <div className="modal-actions avg-modal-actions">
          <button 
            onClick={onClose}
            className="avg-modal-cancel-btn"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="avg-modal-save-btn"
          >
            Save Average
          </button>
        </div>
      </div>
    </div>
  );
}