import React, { useState } from 'react';
import api from '../services/api';

const UploadIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);

const GarbageEater = ({ onSuccess }) => {
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

      // Send 50 items at a time to stay well within limits
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
        message: `Successfully processed! ${totalAdded} queued, ${totalSkipped} skipped.`
      });
      setJsonGarbage("");

      if (onSuccess) {
        onSuccess();
      }

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

  const statusClass = [
    'garbage-status',
    status.type === 'error' && 'is-error',
    status.type === 'success' && 'is-success'
  ].filter(Boolean).join(' ');

  return (
    <div className="garbage-panel glass-panel">
      <div className="garbage-header">
        <h2 className="garbage-title">JSON Garbage Eater</h2>
        <p className="garbage-subtitle">
          Mass Import Utility — paste your saved-posts-backup-export here
        </p>
      </div>

      <textarea
        className="garbage-textarea"
        placeholder='{ "format": "saved-posts-backup-export", ... }'
        value={jsonGarbage}
        onChange={(e) => setJsonGarbage(e.target.value)}
        disabled={loading}
      />

      {status.message && (
        <div className={statusClass}>
          {status.message}
        </div>
      )}

      <div className="garbage-actions">
        <button
          onClick={processGarbage}
          disabled={loading || !jsonGarbage.trim()}
          className="action-btn btn-primary"
        >
          <UploadIcon />
          {loading ? 'Eating Garbage...' : 'Eat Garbage & Queue'}
        </button>
      </div>
    </div>
  );
};

export default GarbageEater;