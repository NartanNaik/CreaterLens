import { getUserSettings, updateUserSettings, getGlobalCategories, updateGlobalCategories } from "../services/userService.js";

export const getUserSettingsController = async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = await getUserSettings(userId);
    res.status(200).json({ data: settings });
  } catch (error) {
    console.error("Error fetching user settings:", error);
    res.status(500).json({ message: "Failed to fetch settings." });
  }
};

export const updateUserSettingsController = async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = req.body;
    await updateUserSettings(userId, settings);
    res.status(200).json({ success: true, message: "Settings updated successfully." });
  } catch (error) {
    console.error("Error updating user settings:", error);
    res.status(500).json({ message: "Failed to update settings." });
  }
};

// ---- Global Categories Controllers ----

export const getGlobalCategoriesController = async (req, res) => {
  try {
    const result = await getGlobalCategories();
    res.status(200).json({ data: result });
  } catch (error) {
    console.error("Error fetching global categories:", error);
    res.status(500).json({ message: "Failed to fetch global categories." });
  }
};

export const updateGlobalCategoriesController = async (req, res) => {
  try {
    const { categories } = req.body;
    await updateGlobalCategories(categories);
    res.status(200).json({ success: true, message: "Global categories updated." });
  } catch (error) {
    console.error("Error updating global categories:", error);
    res.status(500).json({ message: "Failed to update global categories." });
  }
};