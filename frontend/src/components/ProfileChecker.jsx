import React, { useState } from 'react';

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
      const res = await fetch('/api/profiles/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
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
        username,
        playable: formData.playable === 'Yes',
        avgViewsPerWeek: 0
      };

      const res = await fetch('/api/profiles/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        onProfileAdded(data.profile);
        
        setUsername('');
        setStatus(null);
        setFormData({
          nation: '', skinTone: 'Fair', bodyType: 'Fit', reelType: 'Hot', 
          specialPart: 'Whole body', ageRange: '18 to 28', playable: 'Yes', 
          totalFollowers: '', customCategories: {}
        });
      }
    } catch (error) {
      console.error("Failed to add profile:", error);
    }
  };

  return (
    <div className="glass-panel profile-checker-container">
      <div className="checker-input-group">
        <input 
          type="text" 
          placeholder="Enter username to check..." 
          value={username} 
          onChange={(e) => {
            setUsername(e.target.value);
            setStatus(null);
          }}
          className="checker-input"
        />
        <button 
          onClick={handleCheck} 
          disabled={loading || !username}
          className="checker-btn"
        >
          {loading ? 'Checking...' : 'Check Username'}
        </button>
      </div>

      {status === 'exists' && (
        <p className="checker-warning-text">
          <svg className="svg-icon warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          This user already exists in the database.
        </p>
      )}

      {status === 'available' && (
        <div className="checker-details-container">
          <h3 className="checker-details-title">Available! Add Details:</h3>
          
          <div className="checker-form-grid">
            <input type="text" placeholder="Nation" value={formData.nation} onChange={e => setFormData({...formData, nation: e.target.value})} className="checker-form-input" />
            
            <select value={formData.skinTone} onChange={e => setFormData({...formData, skinTone: e.target.value})} className="checker-form-input">
              <option>Fair</option><option>Tan</option><option>Dark</option>
            </select>

            <select value={formData.bodyType} onChange={e => setFormData({...formData, bodyType: e.target.value})} className="checker-form-input">
              <option>Fit</option><option>Slim</option><option>Fat</option><option>Curvy</option>
            </select>

            <select value={formData.reelType} onChange={e => setFormData({...formData, reelType: e.target.value})} className="checker-form-input">
              <option>Hot</option><option>Erotic</option><option>Beautiful</option>
            </select>

            <select value={formData.specialPart} onChange={e => setFormData({...formData, specialPart: e.target.value})} className="checker-form-input">
              <option>Whole body</option><option>Breast</option><option>Face</option><option>Stomach</option><option>Below stomach</option><option>Back</option>
            </select>

            <select value={formData.ageRange} onChange={e => setFormData({...formData, ageRange: e.target.value})} className="checker-form-input">
              <option>18 to 28</option><option>29 to 35</option><option>36+</option>
            </select>

            <select value={formData.playable} onChange={e => setFormData({...formData, playable: e.target.value})} className="checker-form-input">
              <option>Yes</option><option>No</option>
            </select>

            <input type="number" placeholder="Total Followers" value={formData.totalFollowers} onChange={e => setFormData({...formData, totalFollowers: e.target.value})} className="checker-form-input" />
          </div>

          <button 
            onClick={handleAdd}
            className="checker-add-btn"
          >
            <svg className="svg-icon add-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add to Database
          </button>
        </div>
      )}
    </div>
  );
}