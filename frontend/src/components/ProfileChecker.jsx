import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

// --- Inline SVGs ---
const SearchIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const WarningIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const PlusIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

// Dropdown fields in the add form (same options the dashboard table uses)
const SELECT_FIELDS = [
  { key: 'skinTone', label: 'Skin Tone', options: ['Fair', 'Tan', 'Dark'] },
  { key: 'bodyType', label: 'Body Type', options: ['Fit', 'Slim', 'Fat', 'Curvy'] },
  { key: 'reelType', label: 'Reel Type', options: ['Hot', 'Erotic', 'Beautiful'] },
  { key: 'specialPart', label: 'Special Part', options: ['Whole body', 'Breast', 'Face', 'Stomach', 'Below stomach', 'Back'] },
  { key: 'ageRange', label: 'Age Range', options: ['18 to 28', '29 to 35', '36+'] },
  { key: 'playable', label: 'Playable', options: ['Yes', 'No'] }
];

const INITIAL_FORM = {
  nation: '',
  skinTone: 'Fair',
  bodyType: 'Fit',
  reelType: 'Hot',
  specialPart: 'Whole body',
  ageRange: '18 to 28',
  playable: 'Yes',
  totalFollowers: '',
  customCategories: {}
};

export default function ProfileChecker({ onProfileAdded, customColumns = [] }) {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState(null);      // null | 'available' | 'exists' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);

  // Lets us ignore a slow check response if the user has already changed the text
  const checkReqRef = useRef(0);

  const setField = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const setCustomField = (columnId, value) =>
    setFormData(prev => ({
      ...prev,
      customCategories: { ...prev.customCategories, [columnId]: value }
    }));

  const handleUsernameChange = (e) => {
    checkReqRef.current += 1;   // invalidate any in-flight check
    setUsername(e.target.value);
    setStatus(null);
    setErrorMsg('');
    setLoading(false);
  };

  const handleCheck = async () => {
    const trimmed = username.trim();
    if (!trimmed || loading) return;

    const reqId = ++checkReqRef.current;
    setLoading(true);
    setStatus(null);
    setErrorMsg('');

    try {
      const { data } = await api.post('/profiles/check', { username: trimmed });
      if (reqId !== checkReqRef.current) return;

      // The server cleans pasted URLs/@handles down to the real username; show and use that
      if (data.username) setUsername(data.username);
      setStatus(data.exists ? 'exists' : 'available');
    } catch (error) {
      if (reqId !== checkReqRef.current) return;
      console.error("Check failed:", error);
      setErrorMsg(error.response?.data?.error || "Couldn't check this username. Please try again.");
      setStatus('error');
    } finally {
      if (reqId === checkReqRef.current) setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (adding) return;
    setAdding(true);

    try {
      // Only send custom values the user actually filled in
      const customCategories = Object.fromEntries(
        Object.entries(formData.customCategories).filter(([, v]) => v !== '' && v !== undefined)
      );

      const payload = {
        ...formData,
        customCategories,
        username: username.trim(),
        playable: formData.playable === 'Yes',
        totalFollowers: Math.max(0, parseInt(formData.totalFollowers, 10) || 0),
        avgViewsPerWeek: 0
      };

      const { data } = await api.post('/profiles/add', payload);

      if (onProfileAdded) onProfileAdded(data.profile || data);
      toast.success(`@${payload.username} added!`);

      setUsername('');
      setStatus(null);
      setFormData(INITIAL_FORM);
    } catch (error) {
      console.error("Failed to add profile:", error);

      if (error.response?.status === 409) {
        setStatus('exists');
        toast.error("This user already exists.");
      } else {
        toast.error(error.response?.data?.error || "Failed to add profile.");
      }
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="profile-checker-container glass-panel">

      {/* Input & Check Row: icon inside the input, button on the same line */}
      <div className="checker-input-row">
        <div className="checker-input-wrapper">
          <span className="checker-input-icon">
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="Enter username or Instagram link to check..."
            value={username}
            onChange={handleUsernameChange}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCheck(); }}
            className="checker-input-field"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button
          onClick={handleCheck}
          disabled={loading || !username.trim()}
          className="checker-check-btn"
        >
          {loading ? 'Checking...' : 'Check Username'}
        </button>
      </div>

      {/* Exists */}
      {status === 'exists' && (
        <div className="checker-warning-box" role="status">
          <WarningIcon />
          <span>This user already exists in the database.</span>
        </div>
      )}

      {/* Error (invalid handle, server problem, etc.) */}
      {status === 'error' && (
        <div className="checker-warning-box error" role="alert">
          <WarningIcon />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Available: details form */}
      {status === 'available' && (
        <div className="checker-available-box">

          <div className="checker-available-header">
            <CheckCircleIcon />
            <h3>@{username.trim()} is available. Add profile details</h3>
          </div>

          <div className="checker-form-grid">

            <div className="checker-form-group">
              <label className="checker-label">Nation</label>
              <input
                type="text"
                placeholder="e.g. India"
                value={formData.nation}
                onChange={e => setField('nation', e.target.value)}
                className="checker-field-input"
              />
            </div>

            {SELECT_FIELDS.map(field => (
              <div className="checker-form-group" key={field.key}>
                <label className="checker-label">{field.label}</label>
                <select
                  value={formData[field.key]}
                  onChange={e => setField(field.key, e.target.value)}
                  className="checker-field-select"
                >
                  {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            ))}

            <div className="checker-form-group">
              <label className="checker-label">Total Followers</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 50000"
                value={formData.totalFollowers}
                onChange={e => setField('totalFollowers', e.target.value)}
                className="checker-field-input"
              />
            </div>

            {/* Custom columns (the prop was received before but never used) */}
            {customColumns.map(col => (
              <div className="checker-form-group" key={col.columnId}>
                <label className="checker-label">{col.displayName}</label>
                {col.inputType === 'dropdown' && Array.isArray(col.options) && col.options.length > 0 ? (
                  <select
                    value={formData.customCategories[col.columnId] || ''}
                    onChange={e => setCustomField(col.columnId, e.target.value)}
                    className="checker-field-select"
                  >
                    <option value="">Not set</option>
                    {col.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.customCategories[col.columnId] || ''}
                    onChange={e => setCustomField(col.columnId, e.target.value)}
                    className="checker-field-input"
                  />
                )}
              </div>
            ))}

          </div>

          <button
            onClick={handleAdd}
            disabled={adding}
            className="checker-add-btn"
          >
            <PlusIcon /> {adding ? 'Adding...' : 'Add to Database'}
          </button>
        </div>
      )}
    </div>
  );
}