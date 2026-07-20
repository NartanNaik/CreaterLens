import { useEffect, useMemo, useRef, useState } from "react";
import "./UsernameChecker.css";
import {
  checkUsername,
  addUsername,
  getUsernames,
  massUploadUsernames,
  deleteUsername,
  deleteAllUsernames,
  updateNation,
  updateInterest,
  updateStatus,
  updateNotes,
  bulkUpdateAttribute,
  getUserSettings,
  updateUserSettings,
  getGlobalCategories,
  updateGlobalCategories
} from "../services/api";

import InterestModal from "./InterestModal";
import FilterModal from "./FilterModal";
import ColumnSelector from "./ColumnSelector";
import BulkAttributeModal from "./BulkAttributeModal";
import StatusBadge from "./StatusBadge";
import NotesModal from "./NotesModal";

import CategoryModal from "./CategoryModal";
import DeleteAllModal from "./DeleteAllModal";

function UsernameChecker() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [username, setUsername] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  
  // Start with empty states instead of forcing "General"
  const [usernames, setUsernames] = useState([]);
  const [massUpload, setMassUpload] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState("name-asc");

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [showBulkAttributeModal, setShowBulkAttributeModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [bulkAttribute, setBulkAttribute] = useState("nation");
  const [editingDateId, setEditingDateId] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, category: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState('');
  const contextMenuRef = useRef(null);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const isInitialMount = useRef(true);
  const categoriesRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState({
    username: true,
    nation: true,
    interestRate: true,
    createdAt: true,
    status: true,
    notes: true,
    addedBy: true,
    copy: true,
    delete: true
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load per-user settings (visible columns + legacy categories)
        const settings = await getUserSettings();
        if (settings?.visibleColumns) {
          setVisibleColumns(settings.visibleColumns);
        }

        // Load global categories (shared across all users)
        const globalData = await getGlobalCategories();
        const globalCats = globalData?.categories || [];
        const userCats = settings?.categories || [];

        // Merge: combine global + user categories, remove duplicates
        const merged = [...new Set([...globalCats, ...userCats])];

        // If user had categories not yet in global, sync the merged list back
        if (merged.length > globalCats.length) {
          try {
            await updateGlobalCategories(merged);
          } catch (migErr) {
            console.error("Failed to sync categories to global", migErr);
          }
        }

        if (merged.length > 0) {
          setCategories(merged);
          setSelectedCategory(merged[0]);
        } else {
          setCategories([]);
          setSelectedCategory("");
        }
      } catch (err) {
        console.error("Failed to load settings", err);
      } finally {
        setSettingsLoading(false);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu({ visible: false, x: 0, y: 0, category: '' });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (selectedCategory) {
      setToast({ visible: true, message: `Category changed to "${selectedCategory}"` });
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast({ visible: false, message: "" });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  useEffect(() => {
    if (!selectedCategory || !categoriesRef.current) return;
    const timer = setTimeout(() => {
      const activeEl = categoriesRef.current.querySelector(".nav-tab.active");
      if (activeEl) {
        setIndicatorStyle({
          left: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
          opacity: 1
        });
      } else {
        setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [selectedCategory, categories]);

  const filteredUsernames = useMemo(() => {
    let data = [...usernames];

    if (search.trim()) {
      data = data.filter((item) =>
        item.username?.toLowerCase().includes(search.toLowerCase())
      );
    }

    switch (filter) {
      case "name-asc":
        data.sort((a, b) => (a.username || "").localeCompare((b.username || "")));
        break;
      case "name-desc":
        data.sort((a, b) => (b.username || "").localeCompare((a.username || "")));
        break;
      case "nation-asc":
        data.sort((a, b) => (a.nation || "").localeCompare(b.nation || ""));
        break;
      case "nation-desc":
        data.sort((a, b) => (b.nation || "").localeCompare(a.nation || ""));
        break;
      case "interest-high":
        data.sort((a, b) => (Number(b.interestRate) || 0) - (Number(a.interestRate) || 0));
        break;
      case "interest-low":
        data.sort((a, b) => (Number(a.interestRate) || 0) - (Number(b.interestRate) || 0));
        break;
      case "today":
        data = data.filter((item) => {
          if (!item.createdAt) return false;
          let d;
          if (item.createdAt._seconds || item.createdAt.seconds) {
            const sec = item.createdAt._seconds || item.createdAt.seconds;
            d = new Date(sec * 1000);
          } else if (typeof item.createdAt === 'string' && item.createdAt.includes(" at ")) {
            d = new Date(item.createdAt.split(" at ")[0]);
          } else {
            d = new Date(item.createdAt);
          }
          if (isNaN(d.getTime())) return false;
          return d.toDateString() === new Date().toDateString();
        });
        break;
      default:
        break;
    }
    return data;
  }, [usernames, search, filter]);

  const loadUsernames = async () => {
    if (!selectedCategory) {
      setUsernames([]);
      setListLoading(false);
      return;
    }
    try {
      setListLoading(true);
      const data = await getUsernames(selectedCategory);
      setUsernames(data);
    } catch (error) {
      console.error(error);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (!settingsLoading) {
      loadUsernames();
    }
  }, [selectedCategory, settingsLoading]);

  const handleCheck = async () => {
    if (!username.trim()) {
      setMessage("Enter a username.");
      setStatus(null);
      return;
    }
    try {
      setLoading(true);
      setMessage("");
      const response = await checkUsername(username);
      if (response.exists) {
        setStatus("exists");
        setMessage(`${response.message} Added by ${response.data.addedBy}`);
      } else {
        setStatus("available");
        setMessage(response.message);
      }
    } catch (error) {
      setStatus(null);
      setMessage(error.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedCategory) {
      alert("Please create a category first.");
      return;
    }
    try {
      setLoading(true);
      setUploading(true);
      await addUsername(username, selectedCategory);
      await loadUsernames();
      setMessage("Username added successfully.");
      setStatus(null);
      setUsername("");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to add username.");
    } finally {
      setUploading(false);
      setLoading(false);
    }
  };

  const handleMassUpload = async () => {
    if (!selectedCategory) {
      alert("Please create a category first.");
      return;
    }
    if (!massUpload.trim()) {
      alert("Paste usernames first.");
      return;
    }
    try {
      setLoading(true);
      setUploading(true);
      const result = await massUploadUsernames(massUpload, selectedCategory);
      setMessage(`Added: ${result?.data?.added || 0} | Skipped: ${result?.data?.skipped || 0}`);
      setMassUpload("");
      await loadUsernames();
    } catch (error) {
      setMessage(error.response?.data?.message || "Mass upload failed.");
    } finally {
      setUploading(false);
      setLoading(false);
    }
  };

  const handleDelete = async (id, usernameStr) => {
    const confirmed = window.confirm(`Delete "${usernameStr}"?`);
    if (!confirmed) return;
    try {
      setLoading(true);
      await deleteUsername(id);
      await loadUsernames();
      setMessage(`"${usernameStr}" deleted successfully.`);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to delete username.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = () => {
    if (!selectedCategory) return;
    setShowDeleteAllModal(true);
  };

  const executeDeleteAll = async () => {
    setShowDeleteAllModal(false);
    try {
      setLoading(true);
      const result = await deleteAllUsernames(selectedCategory);
      await loadUsernames();
      setMessage(`${result.data.deleted} usernames deleted successfully.`);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to delete usernames.");
    } finally {
      setLoading(false);
    }
  };

  const handleNationLocalChange = (id, nation) => {
    setUsernames((prev) => prev.map((u) => (u.id === id ? { ...u, nation } : u)));
  };

  const handleNationBlur = async (id, nation) => {
    try {
      await updateNation(id, nation);
    } catch (error) {
      console.error(error);
      loadUsernames(); 
    }
  };

  const handleInterestSave = async (data) => {
    setUsernames((prev) => prev.map((u) => (u.id === selectedUser.id ? { ...u, ...data } : u)));
    setShowInterestModal(false);
    try {
      await updateInterest(selectedUser.id, data);
      await loadUsernames(); 
    } catch (error) {
      console.error(error);
      loadUsernames(); 
    }
  };

  const handleStatusChange = async (id, statusVal) => {
    setUsernames((prev) => prev.map((u) => (u.id === id ? { ...u, status: statusVal } : u)));
    try {
      await updateStatus(id, statusVal);
    } catch (error) {
      console.error(error);
      loadUsernames(); 
    }
  };

  const handleDateSave = async (id, dateValue) => {
    if (!dateValue) {
      setEditingDateId(null);
      return;
    }
    const formattedDate = new Date(dateValue).toISOString();
    setUsernames((prev) => prev.map((u) => (u.id === id ? { ...u, createdAt: formattedDate } : u)));
    setEditingDateId(null);
    try {
      await bulkUpdateAttribute([id], "createdAt", [formattedDate]);
    } catch (error) {
      console.error(error);
      loadUsernames(); 
    }
  };

  const handleNotesSave = async (notes) => {
    setUsernames((prev) => prev.map((u) => (u.id === selectedUser.id ? { ...u, notes } : u)));
    setShowNotesModal(false);
    try {
      await updateNotes(selectedUser.id, notes);
    } catch (error) {
      console.error(error);
      loadUsernames(); 
    }
  };

  const handleBulkApply = async (values) => {
    const updates = [];
    let valueIndex = 0;
    
    setUsernames((prev) => {
      const next = [...prev];
      filteredUsernames.forEach((item) => {
        let needsUpdate = false;
        const currentVal = item[bulkAttribute];
        
        if (bulkAttribute === "nation") {
          needsUpdate = !currentVal || currentVal === "undefined" || currentVal.trim() === "";
        } else if (bulkAttribute === "interestRate") {
          needsUpdate = !currentVal || Number(currentVal) === 0;
        } else if (bulkAttribute === "status") {
           needsUpdate = !currentVal || currentVal === "Available"; 
        } else if (bulkAttribute === "notes") {
           needsUpdate = !currentVal || currentVal.trim() === "";
        }

        if (needsUpdate && valueIndex < values.length && values[valueIndex].trim() !== "") {
          const userIndex = next.findIndex(u => u.id === item.id);
          if (userIndex !== -1) {
            const val = values[valueIndex];
            next[userIndex] = { ...next[userIndex], [bulkAttribute]: val };
            updates.push({ id: item.id, value: val });
          }
          valueIndex++;
        }
      });
      return next;
    });
    
    setShowBulkAttributeModal(false);

    try {
      await Promise.all(updates.map(async (update) => {
        if (bulkAttribute === "nation") {
          await updateNation(update.id, update.value);
        } else if (bulkAttribute === "interestRate") {
          await updateInterest(update.id, { interestRate: Number(update.value) || 0 });
        } else if (bulkAttribute === "status") {
          await updateStatus(update.id, update.value);
        } else if (bulkAttribute === "notes") {
          await updateNotes(update.id, update.value);
        }
      }));
    } catch (error) {
       console.error(error);
       loadUsernames(); 
    }
  };

  const handleColumnSave = async (newColumns) => {
    setVisibleColumns(newColumns);
    setShowColumnSelector(false);
    try {
      await updateUserSettings({ visibleColumns: newColumns });
    } catch (err) {
      console.error("Failed to sync columns");
    }
  };

  const copyAllUsernames = async () => {
    const text = filteredUsernames.map((item) => item.username).join("\n");
    await navigator.clipboard.writeText(text);
    alert("Copied.");
  };

  const cancelCheck = () => {
    setUsername("");
    setStatus(null);
    setMessage("");
  };

  const copyUsername = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      alert("Username copied.");
    } catch {
      alert("Unable to copy.");
    }
  };

  const handleContextMenu = (e, category) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      category
    });
  };

  const handleAddCategory = () => {
    setShowCategoryModal(true);
  };

  const handleCreateCategorySubmit = async (name) => {
    const category = name.trim();
    if (!category) return;
    if (categories.includes(category)) {
      alert("Category already exists.");
      return;
    }

    const newCategories = [...categories, category];
    setCategories(newCategories);
    setSelectedCategory(category);
    setShowCategoryModal(false);
    
    try {
      await updateGlobalCategories(newCategories);
    } catch (err) {
      console.error("Failed to sync new category globally");
    }
  };

  const handleDeleteCategory = async (category) => {
    try {
      setLoading(true);
      await deleteAllUsernames(category);
      
      const updatedCategories = categories.filter((item) => item !== category);
      setCategories(updatedCategories);
      
      // Fallback selection if the deleted category was the active one
      if (selectedCategory === category) {
        setSelectedCategory(updatedCategories.length > 0 ? updatedCategories[0] : "");
      }

      await updateGlobalCategories(updatedCategories);
      setMessage(`Category "${category}" deleted successfully.`);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to delete category.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const getSafeDate = (dateVal) => {
    if (!dateVal) return null;
    try {
      let d;
      if (dateVal._seconds || dateVal.seconds) {
        const sec = dateVal._seconds || dateVal.seconds;
        d = new Date(sec * 1000);
      } else if (typeof dateVal === 'string' && dateVal.includes(" at ")) {
        d = new Date(dateVal.split(" at ")[0]);
      } else {
        d = new Date(dateVal);
      }

      if (isNaN(d.getTime())) return null;

      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch {
      return null;
    }
  };

  const getDatePickerValue = (dateVal) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (!dateVal) return todayStr; 
    try {
      let d;
      if (dateVal._seconds || dateVal.seconds) {
        const sec = dateVal._seconds || dateVal.seconds;
        d = new Date(sec * 1000);
      } else if (typeof dateVal === 'string' && dateVal.includes(" at ")) {
        d = new Date(dateVal.split(" at ")[0]);
      } else {
        d = new Date(dateVal);
      }
      
      if (isNaN(d.getTime())) return todayStr;

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return todayStr;
    }
  };

  if (settingsLoading) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Loading Global Settings...</div>;
  }

  return (
    <>
      <nav className="navbar">
        <div className="nav-brand">
          <div className="nav-logo">UC</div>
          <h2>Username Checker</h2>
        </div>
        <div className="nav-categories" ref={categoriesRef}>
          <div className="nav-indicator" style={indicatorStyle} />
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              onContextMenu={(e) => handleContextMenu(e, category)}
              className={`nav-tab ${selectedCategory === category ? "active" : ""}`}
            >
              {category}
            </button>
          ))}
          <button className="nav-tab add-tab" onClick={handleAddCategory}>
            + Category
          </button>
        </div>
        <div className="nav-user">
          <div className="user-avatar">{user?.id?.charAt(0)?.toUpperCase()}</div>
          <strong>{user?.id}</strong>
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>
      </nav>
      <div className="username-checker" key={selectedCategory}>

        <div className="toolbar">
          <input
            type="text"
            placeholder="Enter Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button onClick={handleCheck} disabled={loading || !selectedCategory}>
            Check
          </button>
        </div>

        {message && (
          <p className={`message ${status === "exists" ? "error" : "success"}`}>
            {message}
          </p>
        )}

        {status === "available" && (
          <div className="button-group" style={{ marginBottom: "20px" }}>
            <button className="copy-btn" onClick={() => copyUsername(username)}>
              Copy Username
            </button>
            <button onClick={handleAdd} disabled={!selectedCategory}>
              Add Username
            </button>
            <button onClick={cancelCheck}>
              Cancel
            </button>
          </div>
        )}

        <hr />

        <h3 className="section">
          {selectedCategory ? `${selectedCategory} Category` : "No Category Selected"}
          {uploading && (
            <div className="upload-loader">
              <div className="upload-loader-bar"></div>
            </div>
          )}
        </h3>

        <h3 className="section">Mass Upload</h3>

        <textarea
          className="mass-upload-box"
          value={massUpload}
          onChange={(e) => setMassUpload(e.target.value)}
          placeholder={"Paste one username per line..."}
          disabled={!selectedCategory}
        />

        <div className="button-group" style={{ marginBottom: "30px" }}>
          <button onClick={handleMassUpload} disabled={loading || !selectedCategory || !massUpload.trim()}>
            Mass Upload
          </button>
          <button onClick={() => setMassUpload("")} disabled={!selectedCategory}>
            Clear
          </button>
        </div>

        <hr />

        <div className="section" style={{ marginBottom: "15px" }}>
          <button className="delete-all-btn" onClick={handleDeleteAll} disabled={loading || !selectedCategory || usernames.length === 0}>
            Delete All
          </button>
        </div>

        <h3 className="section">
          {selectedCategory ? `${selectedCategory} Usernames` : "Create a category to view usernames"}
        </h3>

        <div className="top-actions">
          <div className="table-actions">
            <button onClick={() => setShowFilterModal(true)}>Filter</button>
            <button onClick={() => setShowColumnSelector(true)}>Columns</button>
            <button onClick={copyAllUsernames}>Copy All</button>
            <button onClick={() => { setBulkAttribute("nation"); setShowBulkAttributeModal(true); }}>
              Bulk Nation
            </button>
            <button onClick={() => { setBulkAttribute("interestRate"); setShowBulkAttributeModal(true); }}>
              Bulk Interest
            </button>
          </div>
        </div>

        <input
          type="text"
          className="search-box"
          placeholder={selectedCategory ? `Search in ${selectedCategory}...` : "Search..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={!selectedCategory}
        />

        {listLoading ? (
          <p>Loading...</p>
        ) : !selectedCategory ? (
          <p style={{ color: "var(--text-muted)", marginTop: "20px" }}>
            Add a category above to start managing usernames.
          </p>
        ) : (
          <div className="table-wrapper" key={selectedCategory}>
            <table className="username-table">
              <thead>
                <tr>
                  {visibleColumns.username && <th>Username</th>}
                  {visibleColumns.nation && <th>Nation</th>}
                  {visibleColumns.interestRate && <th>Interest Rate</th>}
                  {visibleColumns.createdAt && <th>Date</th>}
                  {visibleColumns.status && <th>Status</th>}
                  {visibleColumns.notes && <th>Notes</th>}
                  {visibleColumns.addedBy && <th>Added By</th>}
                  {visibleColumns.copy && <th>Copy</th>}
                  {visibleColumns.delete && <th>Delete</th>}
                </tr>
              </thead>
              <tbody>
                {filteredUsernames.length > 0 ? (
                  filteredUsernames.map((item) => (
                    <tr key={item.id}>
                      {visibleColumns.username && <td>{item.username}</td>}
                      {visibleColumns.nation && (
                        <td>
                          <input
                            className="nation-input"
                            type="text"
                            placeholder="Nation"
                            value={item.nation && item.nation !== "undefined" ? item.nation : ""}
                            onChange={(e) => handleNationLocalChange(item.id, e.target.value)}
                            onBlur={(e) => handleNationBlur(item.id, e.target.value)}
                          />
                        </td>
                      )}
                      {visibleColumns.interestRate && (
                        <td>
                          <button
                            className="interest-btn"
                            onClick={() => { setSelectedUser(item); setShowInterestModal(true); }}
                          >
                            <div className="interest-value">{item.interestRate || 0}</div>
                            <div>Edit</div>
                          </button>
                        </td>
                      )}
                      {visibleColumns.createdAt && (
                        <td>
                          {editingDateId === item.id ? (
                             <input
                               type="date"
                               autoFocus
                               defaultValue={getDatePickerValue(item.createdAt)}
                               className="date-picker-input"
                               onBlur={(e) => handleDateSave(item.id, e.target.value)}
                               onKeyDown={(e) => { if(e.key === 'Enter') handleDateSave(item.id, e.target.value); }}
                             />
                          ) : getSafeDate(item.createdAt) ? (
                            <button className="date-btn" onClick={() => setEditingDateId(item.id)}>
                              {getSafeDate(item.createdAt)}
                            </button>
                          ) : (
                            <button className="date-btn" onClick={() => setEditingDateId(item.id)}>
                              Add Date
                            </button>
                          )}
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td>
                          <StatusBadge
                            editable
                            status={item.status ?? "Available"}
                            onChange={(value) => handleStatusChange(item.id, value)}
                          />
                        </td>
                      )}
                      {visibleColumns.notes && (
                        <td>
                          <button
                            className="notes-btn"
                            onClick={() => { setSelectedUser(item); setShowNotesModal(true); }}
                          >
                            {(item.notes || "").trim() ? "Edit" : "Add"}
                          </button>
                        </td>
                      )}
                      {visibleColumns.addedBy && <td>{item.addedBy}</td>}
                      {visibleColumns.copy && (
                        <td>
                          <button className="copy-btn" onClick={() => copyUsername(item.username)}>Copy</button>
                        </td>
                      )}
                      {visibleColumns.delete && (
                        <td>
                          <button className="delete-btn" onClick={() => handleDelete(item.id, item.username)}>Delete</button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr className="empty-row"><td colSpan={9}>No usernames found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InterestModal
        open={showInterestModal}
        username={selectedUser?.username}
        initialData={selectedUser}
        onClose={() => setShowInterestModal(false)}
        onSave={handleInterestSave}
      />
      <NotesModal
        open={showNotesModal}
        username={selectedUser?.username}
        notes={selectedUser?.notes}
        onClose={() => setShowNotesModal(false)}
        onSave={handleNotesSave}
      />
      <FilterModal
        open={showFilterModal}
        currentFilter={filter}
        onClose={() => setShowFilterModal(false)}
        onApply={(value) => {
          setFilter(value);
          setShowFilterModal(false);
        }}
      />
      <ColumnSelector
        open={showColumnSelector}
        columns={visibleColumns}
        onClose={() => setShowColumnSelector(false)}
        onSave={handleColumnSave}
      />
      <BulkAttributeModal
        open={showBulkAttributeModal}
        attribute={bulkAttribute}
        onClose={() => setShowBulkAttributeModal(false)}
        onApply={handleBulkApply}
      />
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          ref={contextMenuRef}
        >
          <button
            className="context-menu-item danger"
            onClick={() => {
              setCategoryToDelete(contextMenu.category);
              setShowDeleteConfirm(true);
              setContextMenu({ visible: false, x: 0, y: 0, category: '' });
            }}
          >
            <span className="context-icon">🗑</span>
            Delete Category
          </button>
        </div>
      )}
      <DeleteAllModal
        open={showDeleteConfirm}
        category={categoryToDelete}
        title="Delete Category"
        description={`You are about to permanently delete the category <strong>"${categoryToDelete}"</strong> and <strong>all usernames</strong> inside it. This action cannot be undone.`}
        confirmLabel="Delete Category"
        onClose={() => {
          setShowDeleteConfirm(false);
          setCategoryToDelete('');
        }}
        onConfirm={() => {
          handleDeleteCategory(categoryToDelete);
          setShowDeleteConfirm(false);
          setCategoryToDelete('');
        }}
      />
      <CategoryModal
        open={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSave={handleCreateCategorySubmit}
      />
      <DeleteAllModal
        open={showDeleteAllModal}
        category={selectedCategory}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={executeDeleteAll}
      />
      {toast.visible && (
        <div className="toast-notification">
          <svg className="toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          {toast.message}
        </div>
      )}
    </>
  );
}

export default UsernameChecker;