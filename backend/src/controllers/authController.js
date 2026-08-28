import { login } from "../services/authService.js";

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
      user: result.user
    });
  } catch (error) {
    // Security: We intentionally hide the exact error.message (e.g., "User not found")
    // to prevent User Enumeration attacks. All failures get the exact same response.
    console.warn(`⚠️ Failed login attempt for ID: ${req.body.id}`);
    
    return res.status(401).json({
      success: false,
      message: "Invalid credentials."
    });
  }
};