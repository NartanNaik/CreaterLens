import React, { useState } from 'react';
import api from '../services/api'; 

// --- Inline SVGs (No Emojis) ---
const SearchIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

export default function ProfileChecker({ onProfileAdded, customColumns }) {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nation: '',
    skinTone: 'Fair',
    bodyType: 'Fit',
    reelType: 'Hot',
    specialPart: 'Whole body',
    ageRange: '18 to 28',
    playable: 'Yes',
    totalFollowers: '',
    customCategories: {}
  });

  const handleCheck = async () => {
    if (!username.trim()) return;
    setLoading(true);

    try {
      const { data } = await api.post('/profiles/check', { username });
      setStatus(data.exists ? 'exists' : 'available');
    } catch (error) {
      console.error("Check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    try {
      const payload = {
        ...formData,
        username: username.trim(),
        playable: formData.playable === 'Yes',
        totalFollowers: Math.max(0, parseInt(formData.totalFollowers, 10) || 0),
        avgViewsPerWeek: 0
      };

      const { data } = await api.post('/profiles/add', payload);

      onProfileAdded(data.profile || data);

      setUsername('');
      setStatus(null);
      setFormData({
        nation: '', skinTone: 'Fair', bodyType: 'Fit', reelType: 'Hot',
        specialPart: 'Whole body', ageRange: '18 to 28', playable: 'Yes',
        totalFollowers: '', customCategories: {}
      });
    } catch (error) {
      console.error("Failed to add profile:", error);
    }
  };

  return (
    <div className="profile-checker-container glass-panel">
      
      {/* Input & Check Row */}
      <div className="checker-input-row">
        <div className="checker-input-wrapper">
          <div className="checker-input-icon">
            <SearchIcon />
          </div>
          <input 
            type="text" 
            placeholder="Enter username to check..." 
            value={username} 
            onChange={(e) => {
              setUsername(e.target.value);
              setStatus(null);
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCheck(); }}
            className="checker-input-field"
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

      {/* Exists Warning Status */}
      {status === 'exists' && (
        <div className="checker-warning-box">
          <WarningIcon />
          <span>This user already exists in the database.</span>
        </div>
      )}

      {/* Available Status & Details Form */}
      {status === 'available' && (
        <div className="checker-available-box glass-panel">
          
          <div className="checker-available-header">
            <CheckCircleIcon />
            <h3>Available! Add Profile Details</h3>
          </div>
          
          {/* Form Grid */}
          <div className="checker-form-grid">
            
            <div className="checker-form-group">
              <label className="checker-label">Nation</label>
              <input 
                type="text" 
                placeholder="e.g. India" 
                value={formData.nation} 
                onChange={e => setFormData({...formData, nation: e.target.value})} 
                className="checker-field-input" 
              />
            </div>
            
            <div className="checker-form-group">
              <label className="checker-label">Skin Tone</label>
              <select 
                value={formData.skinTone} 
                onChange={e => setFormData({...formData, skinTone: e.target.value})} 
                className="checker-field-select"
              >
                <option>Fair</option><option>Tan</option><option>Dark</option>
              </select>
            </div>

            <div className="checker-form-group">
              <label className="checker-label">Body Type</label>
              <select 
                value={formData.bodyType} 
                onChange={e => setFormData({...formData, bodyType: e.target.value})} 
                className="checker-field-select"
              >
                <option>Fit</option><option>Slim</option><option>Fat</option><option>Curvy</option>
              </select>
            </div>

            <div className="checker-form-group">
              <label className="checker-label">Reel Type</label>
              <select 
                value={formData.reelType} 
                onChange={e => setFormData({...formData, reelType: e.target.value})} 
                className="checker-field-select"
              >
                <option>Hot</option><option>Erotic</option><option>Beautiful</option>
              </select>
            </div>

            <div className="checker-form-group">
              <label className="checker-label">Special Part</label>
              <select 
                value={formData.specialPart} 
                onChange={e => setFormData({...formData, specialPart: e.target.value})} 
                className="checker-field-select"
              >
                <option>Whole body</option><option>Breast</option><option>Face</option><option>Stomach</option><option>Below stomach</option><option>Back</option>
              </select>
            </div>

            <div className="checker-form-group">
              <label className="checker-label">Age Range</label>
              <select 
                value={formData.ageRange} 
                onChange={e => setFormData({...formData, ageRange: e.target.value})} 
                className="checker-field-select"
              >
                <option>18 to 28</option><option>29 to 35</option><option>36+</option>
              </select>
            </div>

            <div className="checker-form-group">
              <label className="checker-label">Playable</label>
              <select 
                value={formData.playable} 
                onChange={e => setFormData({...formData, playable: e.target.value})} 
                className="checker-field-select"
              >
                <option>Yes</option><option>No</option>
              </select>
            </div>

            <div className="checker-form-group">
              <label className="checker-label">Total Followers</label>
              <input 
                type="number" 
                min="0"
                placeholder="e.g. 50000" 
                value={formData.totalFollowers} 
                onChange={e => setFormData({...formData, totalFollowers: e.target.value})} 
                className="checker-field-input" 
              />
            </div>

          </div>

          <button 
            onClick={handleAdd}
            className="checker-add-btn"
          >
            <PlusIcon /> Add to Database
          </button>
        </div>
      )}
    </div>
  );
}