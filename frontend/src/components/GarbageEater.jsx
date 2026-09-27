import React, { useState } from 'react';
import api from '../services/api'; 

const GarbageEater = () => {
  const [jsonGarbage, setJsonGarbage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

const processGarbage = async () => {
    if (!jsonGarbage.trim()) {
      setStatus({ type: "error", message: "Please paste the JSON data first." });
      return;
    }

    setLoading(true);
    setStatus({ type: "", message: "Parsing and chunking data..." });

    try {
      const parsedData = JSON.parse(jsonGarbage);
      const rawItems = [...(parsedData.images || []), ...(parsedData.videos || [])];

      const uniqueItems = Array.from(new Map(rawItems.map(item => [item.postUrl, item])).values());

      const payload = uniqueItems.map(item => ({
        url: item.postUrl,
        username: item.metadata?.owner || "Unknown",
        thumbnailUrl: item.thumbnail || "",
        caption: item.metadata?.caption || ""
      }));

      if (payload.length === 0) {
        setStatus({ type: "error", message: "No valid images or videos found in the JSON." });
        setLoading(false);
        return;
      }

      // CHUNKING LOGIC: Send 50 items at a time to easily bypass Vercel's 4.5MB limit
      const chunkSize = 50;
      let totalAdded = 0;
      let totalSkipped = 0;

      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);
        setStatus({ type: "", message: `Importing batch ${Math.ceil(i / chunkSize) + 1} of ${Math.ceil(payload.length / chunkSize)}...` });
        
        const response = await api.post('/staging/bulk-import', { items: chunk });
        totalAdded += (response.data.addedCount || 0);
        totalSkipped += (response.data.skippedCount || 0);
      }
      
      setStatus({ 
        type: "success", 
        message: `Successfully processed all batches! ${totalAdded} queued, ${totalSkipped} skipped.` 
      });
      setJsonGarbage(""); 

    } catch (error) {
      console.error("Garbage Eater Error:", error);
      setStatus({ 
        type: "error", 
        message: error instanceof SyntaxError 
          ? "Invalid JSON format. Please paste the raw export exactly as is." 
          : "Server error during import. Check console." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ marginBottom: '24px', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 className="staging-title" style={{ fontSize: '1.25rem', margin: '0 0 4px 0' }}>JSON Garbage Eater</h2>
          <p className="staging-subtitle" style={{ margin: 0 }}>Mass Import Utility - Paste your saved-posts-backup-export here</p>
        </div>
      </div>
      
      <textarea
        style={{
          width: '100%',
          minHeight: '160px',
          padding: '16px',
          backgroundColor: 'var(--surface-sunken, rgba(0,0,0,0.15))',
          color: 'var(--text-main, inherit)',
          border: '1px solid var(--border-light, rgba(255,255,255,0.1))',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '13px',
          outline: 'none',
          resize: 'vertical',
          marginBottom: '16px',
          boxSizing: 'border-box'
        }}
        placeholder='{ "format": "saved-posts-backup-export", ... }'
        value={jsonGarbage}
        onChange={(e) => setJsonGarbage(e.target.value)}
        disabled={loading}
      />

      {status.message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '6px',
          marginBottom: '16px',
          fontSize: '14px',
          fontWeight: '500',
          backgroundColor: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          color: status.type === 'error' ? '#ef4444' : '#10b981',
          border: `1px solid ${status.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
        }}>
          {status.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={processGarbage}
          disabled={loading || !jsonGarbage}
          className="staging-bulk-approve-btn"
          style={{
            opacity: (loading || !jsonGarbage) ? 0.5 : 1,
            cursor: (loading || !jsonGarbage) ? 'not-allowed' : 'pointer',
            padding: '10px 24px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {loading ? (
            'Eating Garbage...'
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Eat Garbage & Queue
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default GarbageEater;