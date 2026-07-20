import { login } from "../services/authService.js";

export const loginUser = async (req, res) => {
  try {
    const { id, password } = req.body;

    if (!id || !password) {
      return res.status(400).json({
        success: false,
        message: "ID and password are required."
      });
    }

    const result = await login(id, password);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token: result.token,
      user: result.user
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message
    });
  }
};