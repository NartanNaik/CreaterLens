import React, { useState, useEffect } from 'react';
import AverageViewsModal from './AverageViewsModal';
import CustomCategoryBuilder from './CustomCategoryBuilder';
import ProfileChecker from './ProfileChecker';
import ManageCategoryModal from './ManageCategoryModal';
import EditableCell from './EditableCell';
import MassUploadModal from './MassUploadModal';
import useDragFill from '../hooks/useDragFill';

export default function ProfileDashboard() {
  const [profiles, setProfiles] = useState([]);
  const [customColumns, setCustomColumns] = useState([]);
  
  const [isAvgCalcOpen, setIsAvgCalcOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  const [isManageColOpen, setIsManageColOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState(null);

  const [isMassUploadOpen, setIsMassUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profilesRes, columnsRes] = await Promise.all([
        fetch('https://pink-backend.vercel.app/api/profiles', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
        fetch('https://pink-backend.vercel.app/api/settings/columns', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      ]);
      
      const profilesData = await profilesRes.json();
      const columnsData = await columnsRes.json();
      
      setProfiles(profilesData);
      setCustomColumns(columnsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleSaveAverage = async (id, newAverage) => {
    setProfiles(profiles.map(p => p.id === id ? { ...p, avgViewsPerWeek: newAverage } : p));
    
    try {
      await fetch(`https://pink-backend.vercel.app/api/profiles/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ avgViewsPerWeek: newAverage })
      });
    } catch (error) {
      console.error("Failed to save average views:", error);
    }
  };

  const handleSaveNewCategory = async (categoryData) => {
    try {
      const response = await fetch('https://pink-backend.vercel.app/api/settings/columns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(categoryData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setCustomColumns([...customColumns, result.column]);
      } else {
        console.error("Failed to add category:", result.error);
      }
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  const handleProfileAdded = (newProfile) => {
    setProfiles([newProfile, ...profiles]);
  };

  const handleDeleteCategory = async (columnToDelete) => {
    try {
      const response = await fetch('https://pink-backend.vercel.app/api/settings/columns', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(columnToDelete)
      });

      if (response.ok) {
        setCustomColumns(customColumns.filter(col => col.columnId !== columnToDelete.columnId));
      } else {
        console.error("Failed to delete category");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const handleDeleteRow = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this profile? This action cannot be undone.");
    if (!confirmDelete) return;

    setProfiles(profiles.filter(p => p.id !== id));

    try {
      await fetch(`https://pink-backend.vercel.app/api/profiles/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (error) {
      console.error("Failed to delete profile:", error);
    }
  };

  const handleCopyRow = (profile) => {
    const textToCopy = `Username: ${profile.username} | Nation: ${profile.nation} | Followers: ${profile.totalFollowers} | Avg Views: ${profile.avgViewsPerWeek}`;
    
    navigator.clipboard.writeText(textToCopy)
      .then(() => alert(`${profile.username} copied to clipboard!`))
      .catch(err => console.error('Failed to copy text: ', err));
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedProfiles = React.useMemo(() => {
    let processed = profiles.filter(p => {
      const username = (p.username || '').toLowerCase();
      const nation = (p.nation || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      return username.includes(query) || nation.includes(query);
    });

    processed.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (customColumns.some(col => col.columnId === sortConfig.key)) {
        aValue = a.customCategories?.[sortConfig.key] || '';
        bValue = b.customCategories?.[sortConfig.key] || '';
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return processed;
  }, [profiles, searchQuery, sortConfig, customColumns]);

  const handleCellEdit = async (profileId, field, newValue, isCustom = false) => {
    setProfiles(profiles.map(p => {
      if (p.id !== profileId) return p;
      if (isCustom) {
        return { ...p, customCategories: { ...p.customCategories, [field]: newValue } };
      }
      return { ...p, [field]: newValue };
    }));

    const targetProfile = profiles.find(p => p.id === profileId);
    const existingCategories = targetProfile ? targetProfile.customCategories || {} : {};

    const payload = isCustom 
      ? { customCategories: { ...existingCategories, [field]: newValue } }
      : { [field]: newValue };

    try {
      await fetch(`https://pink-backend.vercel.app/api/profiles/${profileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error(`Failed to update ${field}:`, error);
    }
  };

  const handleDragFillComplete = async (startIdx, endIdx, columnKey, newValue) => {
    const affectedProfiles = profiles.slice(startIdx, endIdx + 1);
    
    setProfiles(prevProfiles => {
      const newProfiles = [...prevProfiles];
      for (let i = startIdx; i <= endIdx; i++) {
        const isCustom = customColumns.some(col => col.columnId === columnKey);
        if (isCustom) {
          newProfiles[i] = { 
            ...newProfiles[i], 
            customCategories: { ...newProfiles[i].customCategories, [columnKey]: newValue } 
          };
        } else {
          newProfiles[i] = { ...newProfiles[i], [columnKey]: newValue };
        }
      }
      return newProfiles;
    });

    const updatePromises = affectedProfiles.map(profile => {
      const isCustom = customColumns.some(col => col.columnId === columnKey);
      const payload = isCustom 
        ? { customCategories: { ...profile.customCategories, [columnKey]: newValue } }
        : { [columnKey]: newValue };

      return fetch(`https://pink-backend.vercel.app/api/profiles/${profile.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
    });

    try {
      await Promise.all(updatePromises);
    } catch (error) {
      console.error("Bulk drag-fill update failed:", error);
    }
  };

  const dragFill = useDragFill(handleDragFillComplete);

  return (
    <div className="dashboard-container" onMouseUp={dragFill.handleGlobalMouseUp}>
      <ProfileChecker 
        onProfileAdded={handleProfileAdded} 
        customColumns={customColumns} 
      />

      <div className="search-bar-container">
        <svg className="svg-icon search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input 
          type="text" 
          placeholder="Search by username or nation..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>
      
      <div className="glass-panel table-wrapper">
        <table className="profile-table">
          <thead>
            <tr>
              <th>ID / Username</th>
              <th>Nation</th>
              <th>Skin Tone</th>
              <th>Body Type</th>
              <th>Reel Type</th>
              <th>Special Part</th>
              <th>Age</th>
              <th>Playable</th>
              <th onClick={() => handleSort('totalFollowers')} className="sortable-header">
                Total Followers {sortConfig.key === 'totalFollowers' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => handleSort('avgViewsPerWeek')} className="sortable-header">
                Avg Views/Week {sortConfig.key === 'avgViewsPerWeek' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
              
              {customColumns.map(col => (
                <th key={col.columnId}>
                  {col.displayName}
                  <button 
                    className="edit-col-btn"
                    onClick={() => {
                      setSelectedColumn(col);
                      setIsManageColOpen(true);
                    }}
                  >
                    <svg className="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px' }}>
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                  </button>
                </th>
              ))}
              
              <th>
                <button 
                  className="add-category-btn margin-right-btn"
                  onClick={() => setIsAddCategoryOpen(true)}
                >
                  <svg className="svg-icon add-category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add Category
                </button>
                <button 
                  className="add-category-btn mass-upload-btn"
                  onClick={() => setIsMassUploadOpen(true)}
                >
                  <svg className="svg-icon mass-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  Mass Upload
                </button>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          
          <tbody>
            {filteredAndSortedProfiles.map((profile, index) => (
              <tr key={profile.id}>
                <td>{profile.username}</td>
                
                <td 
                  onMouseDown={() => dragFill.handleMouseDown(index, 'nation', profile.nation)}
                  onMouseEnter={() => dragFill.handleMouseEnter(index, 'nation')}
                  onMouseUp={() => dragFill.handleMouseUp(index, 'nation')}
                >
                  <EditableCell 
                    value={profile.nation} 
                    onSave={(val) => handleCellEdit(profile.id, 'nation', val)} 
                  />
                </td>
                
                <td 
                  onMouseDown={() => dragFill.handleMouseDown(index, 'skinTone', profile.skinTone)}
                  onMouseEnter={() => dragFill.handleMouseEnter(index, 'skinTone')}
                  onMouseUp={() => dragFill.handleMouseUp(index, 'skinTone')}
                >
                  <EditableCell 
                    type="select" 
                    value={profile.skinTone} 
                    options={['Fair', 'Tan', 'Dark']} 
                    onSave={(val) => handleCellEdit(profile.id, 'skinTone', val)} 
                  />
                </td>
                
                <td 
                  onMouseDown={() => dragFill.handleMouseDown(index, 'bodyType', profile.bodyType)}
                  onMouseEnter={() => dragFill.handleMouseEnter(index, 'bodyType')}
                  onMouseUp={() => dragFill.handleMouseUp(index, 'bodyType')}
                >
                  <EditableCell 
                    type="select" 
                    value={profile.bodyType} 
                    options={['Fit', 'Slim', 'Fat', 'Curvy']} 
                    onSave={(val) => handleCellEdit(profile.id, 'bodyType', val)} 
                  />
                </td>
                
                <td 
                  onMouseDown={() => dragFill.handleMouseDown(index, 'reelType', profile.reelType)}
                  onMouseEnter={() => dragFill.handleMouseEnter(index, 'reelType')}
                  onMouseUp={() => dragFill.handleMouseUp(index, 'reelType')}
                >
                  <EditableCell 
                    type="select" 
                    value={profile.reelType} 
                    options={['Hot', 'Erotic', 'Beautiful']} 
                    onSave={(val) => handleCellEdit(profile.id, 'reelType', val)} 
                  />
                </td>
                
                <td 
                  onMouseDown={() => dragFill.handleMouseDown(index, 'specialPart', profile.specialPart)}
                  onMouseEnter={() => dragFill.handleMouseEnter(index, 'specialPart')}
                  onMouseUp={() => dragFill.handleMouseUp(index, 'specialPart')}
                >
                  <EditableCell 
                    type="select" 
                    value={profile.specialPart} 
                    options={['Whole body', 'Breast', 'Face', 'Stomach', 'Below stomach', 'Back']} 
                    onSave={(val) => handleCellEdit(profile.id, 'specialPart', val)} 
                  />
                </td>
                
                <td 
                  onMouseDown={() => dragFill.handleMouseDown(index, 'ageRange', profile.ageRange)}
                  onMouseEnter={() => dragFill.handleMouseEnter(index, 'ageRange')}
                  onMouseUp={() => dragFill.handleMouseUp(index, 'ageRange')}
                >
                  <EditableCell 
                    type="select" 
                    value={profile.ageRange} 
                    options={['18 to 28', '29 to 35', '36+']} 
                    onSave={(val) => handleCellEdit(profile.id, 'ageRange', val)} 
                  />
                </td>

                <td onClick={() => handleCellEdit(profile.id, 'playable', !profile.playable)} className="clickable-status-cell">
                  <span className={`status-badge ${profile.playable ? 'playable-yes' : 'playable-no'}`}>
                    {profile.playable ? 'Yes' : 'No'}
                  </span>
                </td>
                
                <td 
                  onMouseDown={() => dragFill.handleMouseDown(index, 'totalFollowers', profile.totalFollowers)}
                  onMouseEnter={() => dragFill.handleMouseEnter(index, 'totalFollowers')}
                  onMouseUp={() => dragFill.handleMouseUp(index, 'totalFollowers')}
                >
                  <EditableCell 
                    type="number" 
                    value={profile.totalFollowers} 
                    onSave={(val) => handleCellEdit(profile.id, 'totalFollowers', Number(val))} 
                  />
                </td>
                
                <td 
                  className="clickable-cell" 
                  onClick={() => {
                    setSelectedProfileId(profile.id);
                    setIsAvgCalcOpen(true);
                  }}
                >
                  {profile.avgViewsPerWeek > 0 ? profile.avgViewsPerWeek.toLocaleString() : 'Calculate ➔'}
                </td>

                {customColumns.map(col => (
                  <td 
                    key={col.columnId}
                    onMouseDown={() => dragFill.handleMouseDown(index, col.columnId, profile.customCategories?.[col.columnId] || '')}
                    onMouseEnter={() => dragFill.handleMouseEnter(index, col.columnId)}
                    onMouseUp={() => dragFill.handleMouseUp(index, col.columnId)}
                  >
                    <EditableCell 
                      type={col.inputType === 'dropdown' ? 'select' : 'text'}
                      options={col.options || []}
                      value={profile.customCategories?.[col.columnId] || ''} 
                      onSave={(val) => handleCellEdit(profile.id, col.columnId, val, true)} 
                    />
                  </td>
                ))}
                
                <td></td>
                <td>
                  <button 
                    className="action-btn copy-btn" 
                    onClick={() => handleCopyRow(profile)}
                  >
                    <svg className="svg-icon copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copy
                  </button>
                  <button 
                    className="action-btn delete-btn" 
                    onClick={() => handleDeleteRow(profile.id)}
                  >
                    <svg className="svg-icon delete-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                      <path d="M10 11v6"></path>
                      <path d="M14 11v6"></path>
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AverageViewsModal 
        isOpen={isAvgCalcOpen} 
        onClose={() => setIsAvgCalcOpen(false)}
        profileId={selectedProfileId}
        onSave={handleSaveAverage}
      />

      <CustomCategoryBuilder 
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        onSave={handleSaveNewCategory}
      />

      <ManageCategoryModal 
        isOpen={isManageColOpen}
        onClose={() => setIsManageColOpen(false)}
        column={selectedColumn}
        onDelete={handleDeleteCategory}
      />

      <MassUploadModal 
        isOpen={isMassUploadOpen}
        onClose={() => setIsMassUploadOpen(false)}
        onUploadComplete={(newProfiles) => setProfiles([...newProfiles, ...profiles])}
      />
    </div>
  );
}