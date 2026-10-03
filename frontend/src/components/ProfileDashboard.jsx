import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import AverageViewsModal from './AverageViewsModal';
import CustomCategoryBuilder from './CustomCategoryBuilder';
import ProfileChecker from './ProfileChecker';
import ManageCategoryModal from './ManageCategoryModal';
import EditableCell from './EditableCell';
import MassUploadModal from './MassUploadModal';
import DragFillOverlay from './DragFillOverlay';
import useDragFill from '../hooks/useDragFill';

const API_BASE = import.meta.env.VITE_API_URL || '';

// --- Clean SVG Icons ---
const LayersIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
    <polyline points="2 17 12 22 22 17"></polyline>
    <polyline points="2 12 12 17 22 12"></polyline>
  </svg>
);
const ExternalLinkIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
  </svg>
);
const SearchIcon = () => (
  <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
const UploadCloudIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16"></polyline>
    <line x1="12" y1="12" x2="12" y2="21"></line>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
  </svg>
);
const CopyIcon = () => (
  <svg className="copy-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);
const TrashIcon = () => (
  <svg className="delete-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);
const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, cursor: 'pointer' }}>
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
  </svg>
);

export default function ProfileDashboard() {
  const navigate = useNavigate();
  const { isVideoTheme } = useOutletContext() || { isVideoTheme: false };
  
  const [profiles, setProfiles] = useState([]);
  const [customColumns, setCustomColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bgVideoCount, setBgVideoCount] = useState(5);
  
  const [isAvgCalcOpen, setIsAvgCalcOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  const [isManageColOpen, setIsManageColOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState(null);

  const [isMassUploadOpen, setIsMassUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  const [contextMenu, setContextMenu] = useState(null);

  // Dynamic Background Video Calculator
  useEffect(() => {
    const calculateVideoCount = () => {
      // 9:16 aspect ratio vertical reel calculation
      const videoWidth = window.innerHeight * (9 / 16);
      const count = Math.ceil(window.innerWidth / videoWidth);
      setBgVideoCount(count || 5);
    };

    calculateVideoCount();
    window.addEventListener('resize', calculateVideoCount);
    
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    
    return () => {
      window.removeEventListener('resize', calculateVideoCount);
      window.removeEventListener('click', closeMenu);
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profilesRes, columnsRes] = await Promise.all([
        fetch(`${API_BASE}/api/profiles`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
        fetch(`${API_BASE}/api/settings/columns`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      ]);
      
      const profilesData = await profilesRes.json();
      const columnsData = await columnsRes.json();
      
      setProfiles(Array.isArray(profilesData) ? profilesData : (profilesData.data || []));
      setCustomColumns(Array.isArray(columnsData) ? columnsData : (columnsData.data || []));
    } catch (error) {
      console.error("Error fetching data:", error);
      setProfiles([]);
      setCustomColumns([]);
    }
  };

  const handleSaveAverage = async (id, newAverage) => {
    setProfiles(profiles.map(p => p.id === id ? { ...p, avgViewsPerWeek: newAverage } : p));
    try {
      await fetch(`${API_BASE}/api/profiles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ avgViewsPerWeek: newAverage })
      });
    } catch (error) { console.error("Failed to save avg views:", error); }
  };

  const handleSaveNewCategory = async (categoryData) => {
    try {
      const response = await fetch(`${API_BASE}/api/settings/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(categoryData)
      });
      const result = await response.json();
      if (response.ok) {
        setCustomColumns([...customColumns, result.column]);
        toast.success("Category added!");
      } else {
        toast.error(result.error || "Failed to add category");
      }
    } catch (error) { console.error("Error adding category:", error); }
  };

  const handleDeleteCategory = async (columnToDelete) => {
    try {
      const response = await fetch(`${API_BASE}/api/settings/columns`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(columnToDelete)
      });
      if (response.ok) {
        setCustomColumns(customColumns.filter(col => col.columnId !== columnToDelete.columnId));
        toast.success("Column deleted!");
      }
    } catch (error) { console.error("Error deleting category:", error); }
  };

  const handleDeleteRow = async (id) => {
    if (!window.confirm("Delete this profile?")) return;
    setProfiles(profiles.filter(p => p.id !== id));
    try {
      await fetch(`${API_BASE}/api/profiles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success("Profile deleted");
    } catch (error) { console.error("Failed to delete:", error); }
  };

  const handleCopyRow = (profile) => {
    navigator.clipboard.writeText(profile.username)
      .then(() => toast.success(`@${profile.username} copied!`))
      .catch(err => toast.error('Failed to copy'));
  };

  const handleCopyAll = () => {
    if (filteredAndSortedProfiles.length === 0) return;
    const textToCopy = filteredAndSortedProfiles.map(p => p.username).join('\n');
    
    navigator.clipboard.writeText(textToCopy)
      .then(() => toast.success(`Copied ${filteredAndSortedProfiles.length} usernames!`))
      .catch(err => toast.error('Failed to copy'));
  };

  const handleDeleteAll = async () => {
    if (filteredAndSortedProfiles.length === 0) return;
    if (!window.confirm(`Permanently delete all ${filteredAndSortedProfiles.length} visible profiles?`)) return;

    setLoading(true);
    const idsToDelete = filteredAndSortedProfiles.map(p => p.id);
    setProfiles(prev => prev.filter(p => !idsToDelete.includes(p.id)));

    try {
      await Promise.all(idsToDelete.map(id => 
        fetch(`${API_BASE}/api/profiles/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ));
      toast.success(`Deleted ${idsToDelete.length} profiles!`);
    } catch (error) { console.error("Failed to delete all profiles:", error); } 
    finally { setLoading(false); }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const filteredAndSortedProfiles = useMemo(() => {
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
      if (isCustom) return { ...p, customCategories: { ...p.customCategories, [field]: newValue } };
      return { ...p, [field]: newValue };
    }));

    const targetProfile = profiles.find(p => p.id === profileId);
    const payload = isCustom 
      ? { customCategories: { ...(targetProfile.customCategories || {}), [field]: newValue } }
      : { [field]: newValue };

    try {
      await fetch(`${API_BASE}/api/profiles/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(payload)
      });
    } catch (error) { console.error(`Failed to update ${field}:`, error); }
  };

  const dragFill = useDragFill(async (startIdx, endIdx, columnKey, newValue) => {
    const affectedProfiles = profiles.slice(startIdx, endIdx + 1);
    
    setProfiles(prev => prev.map((p, i) => {
      if (i >= startIdx && i <= endIdx) {
        if (customColumns.some(col => col.columnId === columnKey)) {
          return { ...p, customCategories: { ...p.customCategories, [columnKey]: newValue } };
        }
        return { ...p, [columnKey]: newValue };
      }
      return p;
    }));

    await Promise.all(affectedProfiles.map(profile => {
      const isCustom = customColumns.some(col => col.columnId === columnKey);
      const payload = isCustom 
        ? { customCategories: { ...profile.customCategories, [columnKey]: newValue } }
        : { [columnKey]: newValue };
      return fetch(`${API_BASE}/api/profiles/${profile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(payload)
      });
    }));
  });

  const handleContextMenu = (e, colId, colName, isCustom) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, colId, colName, isCustom });
  };

  const SortableHeader = ({ label, sortKey, isCustom = false }) => (
    <th 
      onClick={() => handleSort(sortKey)} 
      onContextMenu={(e) => handleContextMenu(e, sortKey, label, isCustom)}
      className="sortable-header" 
      style={{ cursor: 'pointer', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface-color, #fff)', borderBottom: '2px solid var(--border-light, #eaeaea)' }}
    >
      {label} {sortConfig.key === sortKey ? (sortConfig.direction === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  );

  return (
    <div className="dashboard-container relative h-full flex flex-col" onMouseUp={dragFill.handleGlobalMouseUp} style={{ height: 'calc(100vh - 70px)' }}>
      
      {/* DYNAMIC VIDEO BACKGROUND */}
      {isVideoTheme && (
        <div className="fixed inset-0 z-[-1] flex overflow-hidden opacity-30 pointer-events-none" style={{ background: '#000' }}>
          {filteredAndSortedProfiles
            .filter(p => p.videoPreviewUrl || p.sourceUrl)
            .slice(0, bgVideoCount)
            .map((p, i) => (
              <video 
                key={i} 
                src={p.videoPreviewUrl || p.sourceUrl} 
                autoPlay 
                loop 
                muted 
                playsInline
                className="h-full object-cover flex-1 opacity-70 filter blur-[2px]"
                style={{ minWidth: `${window.innerHeight * (9/16)}px` }}
              />
          ))}
        </div>
      )}

      {/* FIXED Top Action Toolbar */}
      <div className="dashboard-toolbar glass-panel flex-shrink-0" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', marginBottom: '16px', gap: '16px', flexWrap: 'wrap', zIndex: 20 }}>
        <div className="search-bar-container" style={{ margin: 0, flex: 1, minWidth: '250px' }}>
          <SearchIcon />
          <input 
            type="text" 
            placeholder="Search by username or nation..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input w-full bg-transparent outline-none"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={handleCopyAll} className="action-btn copy-btn" style={{ padding: '8px 12px' }}>
            <CopyIcon /> Copy All Usernames
          </button>
          <button onClick={handleDeleteAll} disabled={loading} className="action-btn delete-btn" style={{ padding: '8px 12px' }}>
            <TrashIcon /> {loading ? "Deleting..." : "Delete All"}
          </button>
          
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-light)', margin: '0 4px' }}></div>
          
          <button className="add-category-btn" onClick={() => navigate('/staging')} style={{ padding: '8px 12px' }}>
            <LayersIcon /> Inbox / Staging
          </button>
          <button className="add-category-btn" onClick={() => setIsAddCategoryOpen(true)} style={{ padding: '8px 12px' }}>
            <PlusIcon /> Add Category
          </button>
          <button className="add-category-btn mass-upload-btn" onClick={() => setIsMassUploadOpen(true)} style={{ padding: '8px 12px' }}>
            <UploadCloudIcon /> Mass Upload
          </button>
        </div>
      </div>
      
      <ProfileChecker onProfileAdded={handleProfileAdded} customColumns={customColumns} />
      
      {/* SCROLLABLE Table Wrapper */}
      <div className="table-wrapper glass-panel flex-1" style={{ overflowY: 'auto', overflowX: 'auto', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
        <table className="profile-table w-full text-left" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <SortableHeader label="Username" sortKey="username" />
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface-color, #fff)', borderBottom: '2px solid var(--border-light)' }}>Link</th>
              <SortableHeader label="Contact" sortKey="contact" />
              <SortableHeader label="Nation" sortKey="nation" />
              <SortableHeader label="Skin Tone" sortKey="skinTone" />
              <SortableHeader label="Body Type" sortKey="bodyType" />
              <SortableHeader label="Reel Type" sortKey="reelType" />
              <SortableHeader label="Special Part" sortKey="specialPart" />
              <SortableHeader label="Age" sortKey="ageRange" />
              <SortableHeader label="Playable" sortKey="playable" />
              <SortableHeader label="Followers" sortKey="totalFollowers" />
              <SortableHeader label="Avg Views" sortKey="avgViewsPerWeek" />
              <SortableHeader label="Avg Likes" sortKey="avgLikes" />
              <SortableHeader label="Avg Comments" sortKey="avgComments" />
              
              {customColumns.map(col => (
                <SortableHeader key={col.columnId} label={col.displayName} sortKey={col.columnId} isCustom={true} />
              ))}
              
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface-color, #fff)', borderBottom: '2px solid var(--border-light)' }}>Actions</th>
            </tr>
          </thead>
          
          <tbody>
            {filteredAndSortedProfiles.map((profile, index) => (
              <tr key={profile.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                
                <td style={{ fontWeight: '600' }} className="group">
                  <div className="flex items-center gap-2">
                    <EditableCell 
                      value={profile.username} 
                      onSave={(val) => handleCellEdit(profile.id, 'username', val)} 
                    />
                    <PencilIcon />
                  </div>
                </td>
                
                <td>
                  {profile.sourceUrl ? (
                    <a href={profile.sourceUrl} target="_blank" rel="noreferrer" className="action-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', backgroundColor: 'var(--surface-sunken)', border: '1px solid var(--border-light)', borderRadius: '4px' }}>
                      <ExternalLinkIcon /> View
                    </a>
                  ) : '-'}
                </td>

                <td 
                  onMouseDown={() => dragFill.handleMouseDown(index, 'contact', profile.contact)}
                  onMouseEnter={() => dragFill.handleMouseEnter(index, 'contact')}
                  onMouseUp={() => dragFill.handleMouseUp(index, 'contact')}
                >
                  <EditableCell value={profile.contact || ''} onSave={(val) => handleCellEdit(profile.id, 'contact', val)} />
                </td>
                
                <td 
                  onMouseDown={() => dragFill.handleMouseDown(index, 'nation', profile.nation)}
                  onMouseEnter={() => dragFill.handleMouseEnter(index, 'nation')}
                  onMouseUp={() => dragFill.handleMouseUp(index, 'nation')}
                >
                  <EditableCell value={profile.nation} onSave={(val) => handleCellEdit(profile.id, 'nation', val)} />
                </td>
                
                <td 
                  onMouseDown={() => dragFill.handleMouseDown(index, 'skinTone', profile.skinTone)}
                  onMouseEnter={() => dragFill.handleMouseEnter(index, 'skinTone')}
                  onMouseUp={() => dragFill.handleMouseUp(index, 'skinTone')}
                >
                  <EditableCell type="select" value={profile.skinTone} options={['Fair', 'Tan', 'Dark']} onSave={(val) => handleCellEdit(profile.id, 'skinTone', val)} />
                </td>
                
                <td 
                  onMouseDown={() => dragFill.handleMouseDown(index, 'bodyType', profile.bodyType)}
                  onMouseEnter={() => dragFill.handleMouseEnter(index, 'bodyType')}
                  onMouseUp={() => dragFill.handleMouseUp(index, 'bodyType')}
                >
                  <EditableCell type="select" value={profile.bodyType} options={['Fit', 'Slim', 'Fat', 'Curvy']} onSave={(val) => handleCellEdit(profile.id, 'bodyType', val)} />
                </td>
                
                <td 
                  onMouseDown={() => dragFill.handleMouseDown(index, 'reelType', profile.reelType)}
                  onMouseEnter={() => dragFill.handleMouseEnter(index, 'reelType')}
                  onMouseUp={() => dragFill.handleMouseUp(index, 'reelType')}
                >
                  <EditableCell type="select" value={profile.reelType} options={['Hot', 'Erotic', 'Beautiful']} onSave={(val) => handleCellEdit(profile.id, 'reelType', val)} />
                </td>
                
                <td 
                  onMouseDown={() => dragFill.handleMouseDown(index, 'specialPart', profile.specialPart)}
                  onMouseEnter={() => dragFill.handleMouseEnter(index, 'specialPart')}
                  onMouseUp={() => dragFill.handleMouseUp(index, 'specialPart')}
                >
                  <EditableCell type="select" value={profile.specialPart} options={['Whole body', 'Breast', 'Face', 'Stomach', 'Below stomach', 'Back']} onSave={(val) => handleCellEdit(profile.id, 'specialPart', val)} />
                </td>
                
                <td 
                  onMouseDown={() => dragFill.handleMouseDown(index, 'ageRange', profile.ageRange)}
                  onMouseEnter={() => dragFill.handleMouseEnter(index, 'ageRange')}
                  onMouseUp={() => dragFill.handleMouseUp(index, 'ageRange')}
                >
                  <EditableCell type="select" value={profile.ageRange} options={['18 to 28', '29 to 35', '36+']} onSave={(val) => handleCellEdit(profile.id, 'ageRange', val)} />
                </td>

                <td onClick={() => handleCellEdit(profile.id, 'playable', !profile.playable)} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <span className={`status-badge ${profile.playable ? 'available' : 'rejected'}`}>{profile.playable ? 'Yes' : 'No'}</span>
                </td>
                
                <td 
                  onMouseDown={() => dragFill.handleMouseDown(index, 'totalFollowers', profile.totalFollowers)}
                  onMouseEnter={() => dragFill.handleMouseEnter(index, 'totalFollowers')}
                  onMouseUp={() => dragFill.handleMouseUp(index, 'totalFollowers')}
                >
                  <EditableCell type="number" value={profile.totalFollowers} onSave={(val) => handleCellEdit(profile.id, 'totalFollowers', Number(val))} />
                </td>
                
                <td style={{ color: 'var(--text-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)' }} onClick={() => { setSelectedProfileId(profile.id); setIsAvgCalcOpen(true); }}>
                  {profile.avgViewsPerWeek > 0 ? profile.avgViewsPerWeek.toLocaleString() : 'Calculate ➔'}
                </td>

                <td 
                  onMouseDown={() => dragFill.handleMouseDown(index, 'avgLikes', profile.avgLikes)}
                  onMouseEnter={() => dragFill.handleMouseEnter(index, 'avgLikes')}
                  onMouseUp={() => dragFill.handleMouseUp(index, 'avgLikes')}
                >
                  <EditableCell type="number" value={profile.avgLikes || 0} onSave={(val) => handleCellEdit(profile.id, 'avgLikes', Number(val))} />
                </td>

                <td 
                  onMouseDown={() => dragFill.handleMouseDown(index, 'avgComments', profile.avgComments)}
                  onMouseEnter={() => dragFill.handleMouseEnter(index, 'avgComments')}
                  onMouseUp={() => dragFill.handleMouseUp(index, 'avgComments')}
                >
                  <EditableCell type="number" value={profile.avgComments || 0} onSave={(val) => handleCellEdit(profile.id, 'avgComments', Number(val))} />
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
                
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button className="action-btn copy-btn" onClick={() => handleCopyRow(profile)}>
                      <CopyIcon /> Copy
                    </button>
                    <button className="action-btn delete-btn" onClick={() => handleDeleteRow(profile.id)}>
                      <TrashIcon /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {contextMenu && (
        <div 
          style={{
            position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 9999,
            backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '8px', minWidth: '150px'
          }}
        >
          <div style={{ padding: '4px 8px', fontSize: '12px', color: '#888', borderBottom: '1px solid #eee', marginBottom: '4px' }}>
            Column: {contextMenu.colName}
          </div>
          {contextMenu.isCustom ? (
            <>
              <button 
                onClick={() => { setSelectedColumn(customColumns.find(c => c.columnId === contextMenu.colId)); setIsManageColOpen(true); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '4px' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                ✎ Edit / Manage
              </button>
              <button 
                onClick={() => { if(window.confirm(`Delete ${contextMenu.colName}?`)) handleDeleteCategory({ columnId: contextMenu.colId }); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px', border: 'none', background: 'none', cursor: 'pointer', color: 'red', borderRadius: '4px' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#ffeef0'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                🗑 Delete Column
              </button>
            </>
          ) : (
            <div style={{ padding: '8px', fontSize: '13px', color: '#666' }}>
              Core System Column (Cannot be deleted)
            </div>
          )}
        </div>
      )}

      <DragFillOverlay visible={dragFill.isVisible} value={dragFill.value} count={dragFill.count} />
      <AverageViewsModal isOpen={isAvgCalcOpen} onClose={() => setIsAvgCalcOpen(false)} profileId={selectedProfileId} onSave={handleSaveAverage} />
      <CustomCategoryBuilder isOpen={isAddCategoryOpen} onClose={() => setIsAddCategoryOpen(false)} onSave={handleSaveNewCategory} />
      <ManageCategoryModal isOpen={isManageColOpen} onClose={() => setIsManageColOpen(false)} column={selectedColumn} onDelete={handleDeleteCategory} />
      <MassUploadModal isOpen={isMassUploadOpen} onClose={() => setIsMassUploadOpen(false)} onUploadComplete={(newProfiles) => setProfiles([...newProfiles, ...profiles])} />
    </div>
  );
}