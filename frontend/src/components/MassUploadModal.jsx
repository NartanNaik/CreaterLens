import React, { useState } from 'react';
import api from '../services/api';

// --- Inline SVGs (No Emojis) ---
const XIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const UploadCloudIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16"></polyline>
    <line x1="12" y1="12" x2="12" y2="21"></line>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
    <polyline points="16 16 12 12 8 16"></polyline>
  </svg>
);

const CheckIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

export default function MassUploadModal({ isOpen, onClose, onUploadComplete }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success' | 'error', message }

  if (!isOpen) return null;

  const handleUpload = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      // Shared axios instance: attaches the token, refreshes it on 401/403, and throws on 4xx/5xx
      // (the old fetch call treated a 500/503 as success and printed "Processed undefined").
      const { data } = await api.post('/profiles/mass-upload', { usernames: text });

      setResult({
        type: 'success',
        message: `Processed ${data.totalSubmitted}. Added: ${data.added}, Skipped (Duplicates): ${data.skipped}`
      });

      if (data.newProfiles && data.newProfiles.length > 0) {
        onUploadComplete(data.newProfiles);
      }

      setText('');
    } catch (error) {
      console.error("Mass upload failed:", error);
      setResult({
        type: 'error',
        message: error.response?.data?.error || "Upload failed. Check the console."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setText('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="mass-modal-container glass-panel" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="mass-modal-header">
          <h2 className="mass-modal-title">
            <UploadCloudIcon /> Mass Upload Profiles
          </h2>
          <button
            onClick={handleClose}
            className="mass-modal-close-btn"
            aria-label="Close"
          >
            <XIcon />
          </button>
        </div>

        {/* Body */}
        <div className="mass-modal-body">
          <p className="mass-modal-desc">
            Paste a list of usernames separated by a new line. Usernames you already have are skipped automatically.
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="user1&#10;user2&#10;user3"
            rows="10"
            className="mass-modal-textarea"
          />

          {result && (
            <div className={`mass-modal-result-box${result.type === 'error' ? ' is-error' : ''}`}>
              {result.message}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mass-modal-footer">
          <button
            onClick={handleClose}
            className="mass-modal-cancel-btn"
          >
            Close
          </button>
          <button
            onClick={handleUpload}
            disabled={loading || !text.trim()}
            className="mass-modal-submit-btn"
          >
            {loading ? (
              "Uploading..."
            ) : (
              <>
                <CheckIcon /> Process Upload
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}