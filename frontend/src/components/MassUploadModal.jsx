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
      
      setText(''); // Clear the box on success
    } catch (error) {
      console.error("Mass upload failed:", error);
      setResult("Upload failed. Check the console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content" style={{ width: '500px' }}>
        <h2>Mass Upload Profiles</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '10px' }}>
          Paste a list of usernames separated by a new line. Duplicates will be automatically ignored.
        </p>
        
        <textarea 
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="user1&#10;user2&#10;user3"
          rows="10"
          style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--glass-border)', background: 'var(--bg-color)', color: 'var(--text-main)', resize: 'vertical' }}
        />

        {result && (
          <div style={{ marginTop: '10px', padding: '10px', background: 'var(--glass-bg)', borderRadius: '5px', color: 'var(--primary-color)', fontWeight: 'bold' }}>
            {result}
          </div>
        )}

        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button 
            onClick={onClose}
            style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', borderRadius: '5px', cursor: 'pointer' }}
          >
            Close
          </button>
          <button 
            onClick={handleUpload}
            disabled={loading || !text.trim()}
            style={{ padding: '8px 16px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '5px', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Uploading...' : 'Process Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}