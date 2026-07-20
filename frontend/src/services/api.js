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

export const checkUsername = async (username) => {
  const { data } = await api.post("/usernames/check", { username });
  return data;
};

export const addUsername = async (username, category) => {
  const { data } = await api.post("/usernames/add", { username, category });
  return data;
};

export const getUsernames = async (category) => {
  const { data } = await api.get("/usernames", { params: { category } });
  return data.data;
};

export const massUploadUsernames = async (usernames, category) => {
  const { data } = await api.post("/usernames/mass-upload", { usernames, category });
  return data;
};

export const deleteUsername = async (id) => {
  const { data } = await api.delete(`/usernames/${id}`);
  return data;
};

export const deleteAllUsernames = async (category) => {
  const { data } = await api.delete("/usernames", { data: { category } });
  return data;
};

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