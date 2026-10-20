import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 60000 
});

// State for the token-refresh queue
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Login/refresh failures must NOT trigger the refresh-and-logout flow.
// Updated to match the new Google auth route.
const isAuthRequest = (config) => /\/auth\/(google|refresh)/.test(config?.url || "");

const forceLogout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

// 1. REQUEST INTERCEPTOR: attach the current token before every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. RESPONSE INTERCEPTOR: refresh an expired token once, replay the request
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (!originalRequest || isAuthRequest(originalRequest)) {
      return Promise.reject(error);
    }

    if ((status === 401 || status === 403) && !originalRequest._retry) {

      // Another request is already refreshing: wait for it, then replay with the new token
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest._retry = true;
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const currentToken = localStorage.getItem("token");
        if (!currentToken) throw new Error("No token available to refresh");

        // Use plain axios to bypass interceptors, sending the expired token in the header
        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {}, {
          headers: { Authorization: `Bearer ${currentToken}` }
        });

        const newToken = data.token;
        if (!newToken) throw new Error("Refresh response did not include a token");

        localStorage.setItem("token", newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);

        return api(originalRequest);
      } catch (err) {
        // Refresh token is dead too: clear the session and send the user to /login
        processQueue(err, null);
        forceLogout();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

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

export const deleteAllUsernames = async (category) => {
  const { data } = await api.delete("/profiles", { data: { category } });
  return data;
};

// Re-scrapes fresh (non-expired) video URLs for the given profile ids (video theme background)
export const refreshProfileVideos = async (ids, force = false) => {
  const { data } = await api.post("/profiles/refresh-videos", { ids, force });
  return data;
};

// --- Attribute Routes ---

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

// GLOBAL CATEGORIES
export const getGlobalCategories = async () => {
  const { data } = await api.get("/users/categories");
  return data.data;
};

export const updateGlobalCategories = async (categories) => {
  const { data } = await api.put("/users/categories", { categories });
  return data;
};

export default api;