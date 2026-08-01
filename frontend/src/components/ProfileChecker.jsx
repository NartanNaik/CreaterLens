import React, { useState } from 'react';

export default function ProfileChecker({ onProfileAdded, customColumns }) {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState(null); // 'exists', 'available', or null
  const [loading, setLoading] = useState(false);

  // Form state for all your specific new categories
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
        playable: formData.playable === 'Yes', // Convert to boolean
        avgViewsPerWeek: 0 // Default to 0 until the 7-reel calculator is used
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
        onProfileAdded(data.profile); // Update the dashboard table
        
        // Reset form
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
    <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          placeholder="Enter username to check..." 
          value={username} 
          onChange={(e) => {
            setUsername(e.target.value);
            setStatus(null); // Reset status when typing
          }}
          style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid var(--glass-border)' }}
        />
        <button 
          onClick={handleCheck} 
          disabled={loading || !username}
          style={{ padding: '10px 20px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          {loading ? 'Checking...' : 'Check Username'}
        </button>
      </div>

      {status === 'exists' && (
        <p style={{ color: 'var(--status-no)', marginTop: '10px', fontWeight: 'bold' }}>
          ⚠️ This user already exists in the database.
        </p>
      )}

      {status === 'available' && (
        <div style={{ marginTop: '20px', padding: '15px', background: 'var(--glass-bg)', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0, color: 'var(--text-main)' }}>Available! Add Details:</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
            
            <input type="text" placeholder="Nation" value={formData.nation} onChange={e => setFormData({...formData, nation: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--glass-border)' }} />
            
            <select value={formData.skinTone} onChange={e => setFormData({...formData, skinTone: e.target.value})} style={{ padding: '8px', borderRadius: '4px' }}>
              <option>Fair</option><option>Tan</option><option>Dark</option>
            </select>

            <select value={formData.bodyType} onChange={e => setFormData({...formData, bodyType: e.target.value})} style={{ padding: '8px', borderRadius: '4px' }}>
              <option>Fit</option><option>Slim</option><option>Fat</option><option>Curvy</option>
            </select>

            <select value={formData.reelType} onChange={e => setFormData({...formData, reelType: e.target.value})} style={{ padding: '8px', borderRadius: '4px' }}>
              <option>Hot</option><option>Erotic</option><option>Beautiful</option>
            </select>

            <select value={formData.specialPart} onChange={e => setFormData({...formData, specialPart: e.target.value})} style={{ padding: '8px', borderRadius: '4px' }}>
              <option>Whole body</option><option>Breast</option><option>Face</option><option>Stomach</option><option>Below stomach</option><option>Back</option>
            </select>

            <select value={formData.ageRange} onChange={e => setFormData({...formData, ageRange: e.target.value})} style={{ padding: '8px', borderRadius: '4px' }}>
              <option>18 to 28</option><option>29 to 35</option><option>36+</option>
            </select>

            <select value={formData.playable} onChange={e => setFormData({...formData, playable: e.target.value})} style={{ padding: '8px', borderRadius: '4px' }}>
              <option>Yes</option><option>No</option>
            </select>

            <input type="number" placeholder="Total Followers" value={formData.totalFollowers} onChange={e => setFormData({...formData, totalFollowers: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--glass-border)' }} />

          </div>

          <button 
            onClick={handleAdd}
            style={{ marginTop: '15px', padding: '10px 20px', width: '100%', background: 'var(--status-yes)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            + Add to Database
          </button>
        </div>
      )}
    </div>
  );
}