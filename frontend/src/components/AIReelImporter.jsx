import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// --- Inline SVGs (No Emojis) ---
const SparkleIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path>
  </svg>
);

const TrashIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
  </svg>
);

const CheckIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const XIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const LinkIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
  </svg>
);

export default function AIReelImporter() {
  const [queue, setQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  
  // Review/Approval State
  const [reviewData, setReviewData] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Manual Input State
  const [manualUrl, setManualUrl] = useState("");
  const [isAddingManual, setIsAddingManual] = useState(false);

  const getHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${localStorage.getItem("token")}`
  });

  const fetchQueue = async () => {
    try {
      setLoadingQueue(true);
      const res = await fetch(`${API_BASE}/staging`, { headers: getHeaders() });
      const json = await res.json();
      if (json.success) setQueue(json.data);
    } catch (err) {
      console.error("Failed to fetch queue", err);
    } finally {
      setLoadingQueue(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualUrl.trim()) return;
    
    setIsAddingManual(true);
    try {
      const res = await fetch(`${API_BASE}/staging/share`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ url: manualUrl })
      });
      const json = await res.json();
      if (json.success) {
        setManualUrl("");
        fetchQueue();
      } else {
        alert(json.error || "Failed to add URL");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingManual(false);
    }
  };

  const handleProcessAI = async (id) => {
    try {
      setProcessingId(id);
      const res = await fetch(`${API_BASE}/staging/${id}/process`, {
        method: "POST",
        headers: getHeaders()
      });
      const json = await res.json();
      
      if (json.success) {
        setReviewData(json.data);
        setFormData({
          username: json.data.username || "",
          nation: json.data.nation?.value || "",
          skinTone: json.data.skinTone?.value || "",
          bodyType: json.data.bodyType?.value || "",
          reelType: json.data.reelType?.value || "",
          specialPart: json.data.specialPart?.value || "",
          ageRange: json.data.ageRange?.value || "",
        });
      } else {
        alert(json.error || "AI Processing failed");
      }
    } catch (err) {
      console.error("AI Error:", err);
      alert("Failed to reach AI engine.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_BASE}/staging/${id}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      setQueue(queue.filter(item => item.id !== id));
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // 1. Save to profiles
      const profileRes = await fetch(`${API_BASE}/profiles/add`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(formData)
      });
      
      const profileJson = await profileRes.json();
      if (!profileRes.ok) throw new Error(profileJson.message || "Failed to save profile");

      // 2. Remove from staging queue
      await fetch(`${API_BASE}/staging/${reviewData.stagingId}`, {
        method: "DELETE",
        headers: getHeaders()
      });

      // 3. Reset and refresh
      setReviewData(null);
      setFormData({});
      fetchQueue();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- View: Approval Screen ---
  if (reviewData) {
    return (
      <div className="ai-importer-container glass-panel">
        <div className="ai-header">
          <h2 className="ai-title">
            <SparkleIcon /> AI Review & Approve
          </h2>
          <button 
            onClick={() => setReviewData(null)}
            className="ai-cancel-btn"
          >
            <XIcon /> Cancel
          </button>
        </div>

        <div className="ai-grid">
          {/* Media Preview Column */}
          <div className="ai-media-col">
            {reviewData.thumbnailUrl && (
              <img 
                src={reviewData.thumbnailUrl} 
                alt="Reel Preview" 
                className="ai-preview-img"
              />
            )}
            {reviewData.aiSuggestions && reviewData.aiSuggestions.length > 0 && (
              <div className="ai-insights-box">
                <p className="ai-insights-title">AI Insights:</p>
                <ul className="ai-insights-list">
                  {reviewData.aiSuggestions.map((sug, i) => <li key={i}>{sug}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Form Column */}
          <div className="ai-form-col">
            <div className="ai-form-group">
              <label className="ai-form-label">Username</label>
              <input 
                name="username" 
                value={formData.username} 
                onChange={handleFormChange}
                className="ai-form-input" 
              />
            </div>
            
            {["nation", "skinTone", "bodyType", "reelType", "specialPart", "ageRange"].map((field) => (
              <div key={field} className="ai-form-group">
                <div className="ai-form-label-wrapper">
                  <label className="ai-form-label">
                    {field.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  {/* Confidence Indicator */}
                  {reviewData[field]?.confidence && (
                    <span className={`ai-confidence-badge ${
                      reviewData[field].confidence >= 0.8 ? 'high-confidence' :
                      reviewData[field].confidence >= 0.5 ? 'med-confidence' :
                      'low-confidence'
                    }`}>
                      {Math.round(reviewData[field].confidence * 100)}% Match
                    </span>
                  )}
                </div>
                <input 
                  name={field} 
                  value={formData[field]} 
                  onChange={handleFormChange}
                  className="ai-form-input" 
                />
              </div>
            ))}

            <div className="ai-form-actions">
              <button 
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="ai-save-btn"
              >
                {isSaving ? "Saving to Database..." : <><CheckIcon /> Approve & Save Profile</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- View: Staging Queue ---
  return (
    <div className="ai-importer-container glass-panel">
      <h2 className="ai-title ai-queue-title">Staging Queue</h2>
      
      {/* Manual Add Form */}
      <form onSubmit={handleManualSubmit} className="ai-queue-form">
        <div className="ai-queue-input-wrapper">
          <LinkIcon className="ai-input-icon" />
          <input
            type="text"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="Paste Instagram Reel URL..."
            className="ai-queue-input"
          />
        </div>
        <button 
          type="submit" 
          disabled={isAddingManual || !manualUrl.trim()}
          className="ai-queue-submit"
        >
          {isAddingManual ? "Adding..." : "Add to Queue"}
        </button>
      </form>

      {/* Queue List */}
      {loadingQueue ? (
        <div className="ai-queue-empty">Loading queue...</div>
      ) : queue.length === 0 ? (
        <div className="ai-queue-empty-dashed">
          Your inbox is empty. Share reels from your phone to see them here.
        </div>
      ) : (
        <div className="ai-queue-list">
          {queue.map((item) => (
            <div key={item.id} className="ai-queue-item">
              {item.thumbnailUrl ? (
                <img src={item.thumbnailUrl} alt="" className="ai-item-thumb" />
              ) : (
                <div className="ai-item-thumb-placeholder">
                  <LinkIcon />
                </div>
              )}
              
              <div className="ai-item-info">
                <p className="ai-item-title">{item.username || "Unknown Creator"}</p>
                <a href={item.url} target="_blank" rel="noreferrer" className="ai-item-url">
                  {item.url}
                </a>
              </div>

              <div className="ai-item-actions">
                <button
                  onClick={() => handleProcessAI(item.id)}
                  disabled={processingId !== null}
                  className="ai-process-btn"
                >
                  {processingId === item.id ? "Analyzing..." : <><SparkleIcon /> Auto-Fill</>}
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={processingId === item.id}
                  className="ai-delete-btn"
                  title="Discard"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}