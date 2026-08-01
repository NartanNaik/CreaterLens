import React, { useState } from 'react';

export default function MassUploadModal({ isOpen, onClose, onUploadComplete }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const handleUpload = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/profiles/mass-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ usernames: text })
      });
      
      const data = await response.json();
      setResult(`Processed ${data.totalSubmitted}. Added: ${data.added}, Skipped (Duplicates): ${data.skipped}`);
      
      if (data.newProfiles.length > 0) {
        onUploadComplete(data.newProfiles);
      }
      
      setText('');
    } catch (error) {
      console.error("Mass upload failed:", error);
      setResult("Upload failed. Check the console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content mass-upload-modal">
        <h2>Mass Upload Profiles</h2>
        <p className="mass-upload-subtitle">
          Paste a list of usernames separated by a new line. Duplicates will be automatically ignored.
        </p>
        
        <textarea 
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="user1&#10;user2&#10;user3"
          rows="10"
          className="mass-upload-textarea"
        />

        {result && (
          <div className="mass-upload-result">
            {result}
          </div>
        )}

        <div className="modal-actions mass-upload-actions">
          <button 
            onClick={onClose}
            className="modal-close-btn"
          >
            Close
          </button>
          <button 
            onClick={handleUpload}
            disabled={loading || !text.trim()}
            className="modal-process-btn"
          >
            {loading ? 'Uploading...' : 'Process Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}