import axios from "axios";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`
});

// --- THE FIX: State variables to manage the refresh queue ---
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 1. REQUEST INTERCEPTOR: Attach token dynamically before every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. RESPONSE INTERCEPTOR: The Production-Grade Failsafe
api.interceptors.response.use(
  (response) => response, // If request succeeds, just return it.
  async (error) => {
    const originalRequest = error.config;

    // If it's a 401 or 403 (Token missing/expired) AND we haven't already retried this exact request
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      
      // If another request is already refreshing the token, queue this one up and wait
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      // We are the first request to fail. Lock the queue and start refreshing.
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) throw new Error("No refresh token available");

        // Hit the backend to get a fresh pair of tokens
        const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/refresh`, {
          refreshToken
        });

        const newToken = data.token;
        
        // Save the fresh tokens
        localStorage.setItem("token", newToken);
        if (data.refreshToken) {
          localStorage.setItem("refreshToken", data.refreshToken);
        }

        // Apply new token to the paused request
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        // Release the queue so all other paused requests can replay with the new token
        processQueue(null, newToken);
        
        return api(originalRequest);
      } catch (err) {
        // If the refresh token is ALSO dead, it's game over. Nuke storage and force a hard logout.
        processQueue(err, null);
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login"; // Kick them to the login screen
        return Promise.reject(err);
      } finally {
        // Unlock the interceptor
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

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

export const deleteAllUsernames = async (category) => {
  const { data } = await api.delete("/profiles", { data: { category } });
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