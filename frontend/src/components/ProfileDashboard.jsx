import React, { useState, useEffect } from 'react';
import './ProfileDashboard.css'; 
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
  
  // State for our upcoming modals
  const [isAvgCalcOpen, setIsAvgCalcOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  const [isManageColOpen, setIsManageColOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState(null);

  const [isMassUploadOpen, setIsMassUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  useEffect(() => {
    // Fetch profiles and custom columns when the dashboard loads
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // These hit the new backend endpoints we just built
      const [profilesRes, columnsRes] = await Promise.all([
        fetch('/api/profiles', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/settings/columns', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
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
    // 1. Optimistic UI update (updates screen instantly)
    setProfiles(profiles.map(p => p.id === id ? { ...p, avgViewsPerWeek: newAverage } : p));
    
    // 2. Send to backend (Assuming you'll create a PATCH route later)
    try {
      await fetch(`/api/profiles/${id}`, {
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
      const response = await fetch('/api/settings/columns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(categoryData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Update the table headers instantly
        setCustomColumns([...customColumns, result.column]);
      } else {
        console.error("Failed to add category:", result.error);
      }
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  const handleProfileAdded = (newProfile) => {
    // Adds the new profile to the top of the existing list in the UI
    setProfiles([newProfile, ...profiles]);
  };

  const handleDeleteCategory = async (columnToDelete) => {
    try {
      const response = await fetch('/api/settings/columns', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(columnToDelete) // We send the exact column object to the backend to remove it
      });

      if (response.ok) {
        // Remove it from the UI instantly
        setCustomColumns(customColumns.filter(col => col.columnId !== columnToDelete.columnId));
      } else {
        console.error("Failed to delete category");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  // Handles permanently deleting a row
  const handleDeleteRow = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this profile? This action cannot be undone.");
    if (!confirmDelete) return;

    // Optimistic UI update
    setProfiles(profiles.filter(p => p.id !== id));

    try {
      await fetch(`/api/profiles/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (error) {
      console.error("Failed to delete profile:", error);
      // If it fails, you might want to fetch data again to restore the row
    }
  };

  // Handles copying the row data to the clipboard
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
    // 1. Filter by search query (checks username and nation)
    let processed = profiles.filter(p => 
      p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nation.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 2. Sort the data
    processed.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle custom categories sorting
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
    // 1. Optimistic UI update
    setProfiles(profiles.map(p => {
      if (p.id !== profileId) return p;
      if (isCustom) {
        return { ...p, customCategories: { ...p.customCategories, [field]: newValue } };
      }
      return { ...p, [field]: newValue };
    }));

    // 2. Prepare the payload
    const payload = isCustom 
      ? { customCategories: { ...profiles.find(p => p.id === profileId).customCategories, [field]: newValue } }
      : { [field]: newValue };

    // 3. Send to backend using the PATCH route we built earlier
    try {
      await fetch(`/api/profiles/${profileId}`, {
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
    // 1. Get the affected profiles based on their visual row index
    const affectedProfiles = profiles.slice(startIdx, endIdx + 1);
    
    // 2. Optimistic UI Update
    setProfiles(prevProfiles => {
      const newProfiles = [...prevProfiles];
      for (let i = startIdx; i <= endIdx; i++) {
        // Check if it's a custom category or a standard field
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

    // 3. Send bulk update to the backend (firing individual patches asynchronously)
    const updatePromises = affectedProfiles.map(profile => {
      const isCustom = customColumns.some(col => col.columnId === columnKey);
      const payload = isCustom 
        ? { customCategories: { ...profile.customCategories, [columnKey]: newValue } }
        : { [columnKey]: newValue };

      return fetch(`/api/profiles/${profile.id}`, {
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

  // Initialize the hook
  const dragFill = useDragFill(handleDragFillComplete);

  return (
    <div className="dashboard-container" onMouseUp={dragFill.handleGlobalMouseUp}>
      {/* Insert the Checker UI Here */}
      <ProfileChecker 
        onProfileAdded={handleProfileAdded} 
        customColumns={customColumns} 
      />

      {/* Search Bar */}
      <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'flex-end' }}>
        <input 
          type="text" 
          placeholder="🔍 Search by username or nation..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '300px', padding: '10px', borderRadius: '20px', border: '1px solid var(--primary-color)', background: 'var(--glass-bg)', color: 'var(--text-main)' }}
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
             <th onClick={() => handleSort('totalFollowers')} style={{ cursor: 'pointer' }}>
                Total Followers {sortConfig.key === 'totalFollowers' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => handleSort('avgViewsPerWeek')} style={{ cursor: 'pointer' }}>
                Avg Views/Week {sortConfig.key === 'avgViewsPerWeek' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
              
              {/* Render dynamic custom columns here */}
              {customColumns.map(col => (
                <th key={col.columnId}>
                  {col.displayName}
                  <button 
                    className="edit-col-btn"
                    onClick={() => {
                      setSelectedColumn(col);
                      setIsManageColOpen(true);
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '5px' }}
                  >
                    ⚙️
                  </button>
                </th>
              ))}
              
              {/* The + Add Category Button */}
              <th>
                <button 
                  className="add-category-btn"
                  onClick={() => setIsAddCategoryOpen(true)}
                  style={{ marginRight: '5px' }}
                >
                  + Add Category
                </button>
                <button 
                  className="add-category-btn"
                  onClick={() => setIsMassUploadOpen(true)}
                  style={{ background: 'var(--secondary-color)', color: 'var(--text-main)' }}
                >
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
                
                <td>
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
                
                <td>
                  <EditableCell 
                    type="select" 
                    value={profile.bodyType} 
                    options={['Fit', 'Slim', 'Fat', 'Curvy']} 
                    onSave={(val) => handleCellEdit(profile.id, 'bodyType', val)} 
                  />
                </td>
                
                <td>
                  <EditableCell 
                    type="select" 
                    value={profile.reelType} 
                    options={['Hot', 'Erotic', 'Beautiful']} 
                    onSave={(val) => handleCellEdit(profile.id, 'reelType', val)} 
                  />
                </td>
                
                <td>
                  <EditableCell 
                    type="select" 
                    value={profile.specialPart} 
                    options={['Whole body', 'Breast', 'Face', 'Stomach', 'Below stomach', 'Back']} 
                    onSave={(val) => handleCellEdit(profile.id, 'specialPart', val)} 
                  />
                </td>
                
                <td>
                  <EditableCell 
                    type="select" 
                    value={profile.ageRange} 
                    options={['18 to 28', '29 to 35', '36+']} 
                    onSave={(val) => handleCellEdit(profile.id, 'ageRange', val)} 
                  />
                </td>

                <td onClick={() => handleCellEdit(profile.id, 'playable', !profile.playable)} style={{cursor: 'pointer'}}>
                  <span className={`status-badge ${profile.playable ? 'playable-yes' : 'playable-no'}`}>
                    {profile.playable ? 'Yes' : 'No'}
                  </span>
                </td>
                
                <td>
                  <EditableCell 
                    type="number" 
                    value={profile.totalFollowers} 
                    onSave={(val) => handleCellEdit(profile.id, 'totalFollowers', Number(val))} 
                  />
                </td>
                
                {/* Clicking this cell will open the 7-Reel Calculator */}
                <td 
                  className="clickable-cell" 
                  onClick={() => {
                    setSelectedProfileId(profile.id);
                    setIsAvgCalcOpen(true);
                  }}
                >
                  {profile.avgViewsPerWeek > 0 ? profile.avgViewsPerWeek.toLocaleString() : 'Calculate ➔'}
                </td>

               {/* Map dynamic column values */}
                {customColumns.map(col => (
                  <td key={col.columnId}>
                    <EditableCell 
                      type={col.inputType === 'dropdown' ? 'select' : 'text'}
                      options={col.options || []}
                      value={profile.customCategories?.[col.columnId] || ''} 
                      onSave={(val) => handleCellEdit(profile.id, col.columnId, val, true)} 
                    />
                  </td>
                ))}
                
                <td>{/* Empty cell for the add category column alignment */}</td>
                <td>
                  <button 
                    className="action-btn" 
                    onClick={() => handleCopyRow(profile)}
                    style={{ background: 'var(--secondary-color)', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px', color: 'var(--text-main)' }}
                  >
                    Copy
                  </button>
                  <button 
                    className="action-btn" 
                    onClick={() => handleDeleteRow(profile.id)}
                    style={{ background: 'var(--status-no)', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Insert Modals Here */}
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