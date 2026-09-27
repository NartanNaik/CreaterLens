import axios from "axios";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const login = async (id, password) => {
  const { data } = await api.post("/auth/login", {
    id,
    password
  });
  return data;
};

// --- Matches routes/profileRoutes.js (mounted at /api/profiles) ---

export const checkUsername = async (username) => {
  const { data } = await api.post("/profiles/check", { username });
  return data;
};

export const addUsername = async (username, category) => {
  const { data } = await api.post("/profiles/add", { username, category });
  return data;
};

export const getUsernames = async (category) => {
  const { data } = await api.get("/profiles", { params: { category } });
  return data.data;
};

export const getGlobalProfileCount = async () => {
  const { data } = await api.get("/profiles/count");
  return data;
};

export const massUploadUsernames = async (usernames, category) => {
  const { data } = await api.post("/profiles/mass-upload", { usernames, category });
  return data;
};

export const deleteUsername = async (id) => {
  const { data } = await api.delete(`/profiles/${id}`);
  return data;
};

// NOTE: no bulk-delete route exists in profileRoutes.js (only DELETE /:id).
// This will still 404/405 until you add a matching DELETE '/' route with
// deleteAllProfiles in profileRoutes.js + profileController.js.
export const deleteAllUsernames = async (category) => {
  const { data } = await api.delete("/profiles", { data: { category } });
  return data;
};

// --- The following do not match any route shown in profileRoutes.js.
// They likely belong in attributeRoutes.js (mounted at /api/attributes).
// Verify attributeRoutes.js defines these paths before trusting them;
// left as /usernames/... since their real backend location wasn't shown. ---

export const updateNation = async (id, nation) => {
  const { data } = await api.put(`/usernames/nation/${id}`, { nation });
  return data;
};

export const dragFillNation = async (ids, nation) => {
  const { data } = await api.put("/usernames/nation/drag-fill", { ids, nation });
  return data;
};

export const updateInterest = async (id, interestData) => {
  const { data } = await api.put(`/usernames/interest/${id}`, interestData);
  return data;
};

export const updateStatus = async (id, status) => {
  const { data } = await api.put(`/usernames/status/${id}`, { status });
  return data;
};

export const updateNotes = async (id, notes) => {
  const { data } = await api.put(`/usernames/notes/${id}`, { notes });
  return data;
};

export const bulkUpdateAttribute = async (ids, attribute, values) => {
  const { data } = await api.put("/usernames/bulk-update", { ids, attribute, values });
  return data;
};

// USER SETTINGS 
export const getUserSettings = async () => {
  const { data } = await api.get("/users/settings");
  return data.data;
};

export const updateUserSettings = async (settings) => {
  const { data } = await api.put("/users/settings", settings);
  return data;
};

// GLOBAL CATEGORIES (shared across all users)
export const getGlobalCategories = async () => {
  const { data } = await api.get("/users/categories");
  return data.data;
};

export const updateGlobalCategories = async (categories) => {
  const { data } = await api.put("/users/categories", { categories });
  return data;
};

export default api;