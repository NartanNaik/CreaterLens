import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

// --- Inline SVGs ---
const SearchIcon = () => (
  <svg className="svg-icon search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  <svg className="svg-icon icon-mr-6" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

const INITIAL_FORM = {
  playable: 'Yes',
  customCategories: {}
};

export default function ProfileChecker({ onProfileAdded, customColumns = [] }) {
  const [username, setUsername] = useState('');
  const [link, setLink] = useState('');
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const checkReqRef = useRef(0);

  // Values for every extra column are held together here, keyed by columnId.
  // They are split into core fields / customCategories when saving (see handleAdd).
  const setCustomField = (columnId, value) =>
    setFormData(prev => ({
      ...prev,
      customCategories: { ...prev.customCategories, [columnId]: value }
    }));

  const handleUsernameChange = (e) => {
    checkReqRef.current += 1;

    const val = e.target.value;
    setUsername(val);

    if (val.includes('instagram.com')) {
      setLink(val);
    }

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
      // Columns the backend marks as non-custom live at the top level of the profile
      // (the dashboard reads them from profile[columnId]); custom ones go in customCategories.
      const isCoreColumn = new Map(customColumns.map(col => [col.columnId, col.isCustom === false]));
      const coreFields = {};
      const customCategories = {};

      Object.entries(formData.customCategories).forEach(([key, value]) => {
        if (value === '' || value === undefined) return;
        if (isCoreColumn.get(key)) coreFields[key] = value;
        else customCategories[key] = value;
      });

      const payload = {
        ...coreFields,
        customCategories,
        username: username.trim(),
        sourceUrl: link.trim(),
        playable: formData.playable === 'Yes'
      };

      const { data } = await api.post('/profiles/add', payload);

      if (onProfileAdded) onProfileAdded(data.profile || data);
      toast.success(`@${payload.username} added!`);

      setUsername('');
      setLink('');
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

  const extraColumns = customColumns.filter(col => col.columnId !== 'username' && col.columnId !== 'link');

  return (
    <div className="checker-panel glass-panel">

      <div className="checker-row">
        <div className="search-bar-container checker-search">
          <SearchIcon />
          <input
            type="text"
            placeholder="Enter username or Instagram link to check..."
            value={username}
            onChange={handleUsernameChange}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCheck(); }}
            className="search-input"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button
          onClick={handleCheck}
          disabled={loading || !username.trim()}
          className="action-btn btn-primary checker-btn"
        >
          {loading ? 'Checking...' : 'Check Username'}
        </button>
      </div>

      {status === 'exists' && (
        <div className="checker-alert">
          <WarningIcon />
          <span>This user already exists in the database.</span>
        </div>
      )}

      {status === 'error' && (
        <div className="checker-alert">
          <WarningIcon />
          <span>{errorMsg}</span>
        </div>
      )}

      {status === 'available' && (
        <div className="checker-available">

          <div className="checker-available-head">
            <CheckCircleIcon />
            <h3 className="checker-available-title">@{username.trim()} is available.</h3>
          </div>

          <div className="checker-fields">

            <div className="checker-field">
              <label className="checker-label">Instagram Link</label>
              <input
                type="text"
                placeholder="https://instagram.com/..."
                value={link}
                onChange={e => setLink(e.target.value)}
              />
            </div>

            {extraColumns.map(col => (
              <div className="checker-field" key={col.columnId}>
                <label className="checker-label">{col.displayName}</label>
                {col.inputType === 'dropdown' && Array.isArray(col.options) && col.options.length > 0 ? (
                  <select
                    value={formData.customCategories[col.columnId] || ''}
                    onChange={e => setCustomField(col.columnId, e.target.value)}
                  >
                    <option value="">Not set</option>
                    {col.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.customCategories[col.columnId] || ''}
                    onChange={e => setCustomField(col.columnId, e.target.value)}
                  />
                )}
              </div>
            ))}

          </div>

          <div className="checker-actions">
            <button
              onClick={handleAdd}
              disabled={adding}
              className="action-btn btn-success"
            >
              <PlusIcon /> {adding ? 'Adding...' : 'Add to Database'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}