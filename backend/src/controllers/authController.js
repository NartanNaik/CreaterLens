import { login, refreshUserToken } from "../services/authService.js";

export const loginUser = async (req, res) => {
  try {
    const { id, password } = req.body;

    // Edge Case & Security: Prevent passing objects/arrays to bypass validation
    if (typeof id !== "string" || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid input format."
      });
    }

    const trimmedId = id.trim();

    // Ensure neither field is empty after trimming
    if (!trimmedId || !password) {
      return res.status(400).json({
        success: false,
        message: "ID and password are required."
      });
    }

    // Attempt the login via the service layer
    const result = await login(trimmedId, password);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token: result.token,
      refreshToken: result.refreshToken, // Pass the new long-lived token to the client
      user: result.user
    });
  } catch (error) {
    // Security: We intentionally hide the exact error.message (e.g., "User not found")
    // to prevent User Enumeration attacks. All failures get the exact same response.
    console.warn(`⚠️ Failed login attempt for ID: ${req.body?.id}`);
    
    return res.status(401).json({
      success: false,
      message: "Invalid credentials."
    });
  }
};

/**
 * Handle token refresh requests from the frontend Axios Interceptor
 */
export const refreshTokenController = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token required."
      });
    }

    // Attempt to verify and issue new tokens via the service layer
    const result = await refreshUserToken(refreshToken);

    return res.status(200).json({
      success: true,
      token: result.token,
      refreshToken: result.refreshToken
    });
  } catch (error) {
    console.warn("⚠️ Failed token refresh attempt.");
    return res.status(403).json({
      success: false,
      message: "Invalid or expired refresh token."
    });
  }
};