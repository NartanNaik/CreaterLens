import React, { useState, useEffect } from 'react';

// --- Inline SVGs (No Emojis) ---
const XIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const CalculatorIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
    <line x1="8" y1="6" x2="16" y2="6"></line>
    <line x1="16" y1="14" x2="16" y2="14.01"></line>
    <line x1="12" y1="14" x2="12" y2="14.01"></line>
    <line x1="8" y1="14" x2="8" y2="14.01"></line>
    <line x1="16" y1="10" x2="16" y2="10.01"></line>
    <line x1="12" y1="10" x2="12" y2="10.01"></line>
    <line x1="8" y1="10" x2="8" y2="10.01"></line>
    <line x1="16" y1="18" x2="16" y2="18.01"></line>
    <line x1="12" y1="18" x2="12" y2="18.01"></line>
    <line x1="8" y1="18" x2="8" y2="18.01"></line>
  </svg>
);

const EMPTY_VIEWS = ['', '', '', '', '', '', ''];

const CheckIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

export default function AverageViewsModal({ isOpen, onClose, profileId, onSave }) {
  const [views, setViews] = useState(EMPTY_VIEWS);

  // Escape closes the dialog (Cancel and the backdrop reset the inputs too)
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  if (!isOpen) return null;

  function handleClose() {
    setViews(EMPTY_VIEWS);
    onClose();
  }

  const handleInputChange = (index, value) => {
    const newViews = [...views];
    newViews[index] = value;
    setViews(newViews);
  };

  const calculateAverage = () => {
    // Ensure no negative numbers sneak into the math
    const numericViews = views.map(v => Math.max(0, Number(v) || 0));
    const sum = numericViews.reduce((a, b) => a + b, 0);
    return Math.round(sum / 7);
  };

  const handleSave = () => {
    const average = calculateAverage();
    onSave(profileId, average);
    handleClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="avg-modal-container glass-panel" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="avg-modal-header">
          <h2 className="avg-modal-title">
            <CalculatorIcon /> Calculate Average
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="avg-modal-close"
            aria-label="Close"
          >
            <XIcon />
          </button>
        </div>
        
        {/* Body - Inputs */}
        <div className="avg-modal-body">
          <div className="reel-inputs-grid">
            {views.map((view, index) => (
              <div key={index} className="reel-input-row">
                <label className="reel-input-label" htmlFor={`reel-views-${index}`}>Reel {index + 1}</label>
                <input
                  id={`reel-views-${index}`}
                  type="number" 
                  min="0"
                  value={view} 
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  placeholder="e.g. 15000"
                  className="reel-input-field text-right"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Result & Actions Footer */}
        <div className="avg-modal-footer">
          <div className="calculator-result">
            <p className="calculator-label">Current 7-Reel Average</p>
            <p className="calculator-average-value">
              {calculateAverage().toLocaleString()}
            </p>
          </div>

          <div className="avg-modal-actions">
            <button
              type="button"
              onClick={handleClose}
              className="avg-modal-cancel-btn"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="avg-modal-save-btn"
            >
              <CheckIcon /> Save
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}