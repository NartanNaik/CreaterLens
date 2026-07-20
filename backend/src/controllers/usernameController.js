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
  dragFillNation
} from "../services/usernameService.js";

export const checkUsernameController = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({
        success: false,
        message: "Username is required."
      });
    }

    const result = await checkUsername(username);

    if (result.exists) {
      return res.status(200).json({
        success: true,
        exists: true,
        message: `Username already exists in "${result.data.category || "Unknown"}".`,
        data: result.data
      });
    }

    return res.status(200).json({
      success: true,
      exists: false,
      message: "Username is available.",
      username: result.username
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const addUsernameController = async (req, res) => {
  try {
    const {
      username,
      category
    } = req.body;

    const addedBy = req.user.id;

    if (!username || !username.trim()) {
      return res.status(400).json({
        success: false,
        message: "Username is required."
      });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category is required."
      });
    }

    const result = await addUsername(
      username,
      category,
      addedBy
    );

    return res.status(201).json({
      success: true,
      message: "Username added successfully.",
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getUsernamesController = async (req, res) => {
  try {
    const { category } = req.query;

    const usernames = await getUsernames(category);

    return res.status(200).json({
      success: true,
      data: usernames
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const massUploadUsernamesController = async (req, res) => {
  try {
    const {
      usernames,
      category
    } = req.body;

    const addedBy = req.user.id;

    if (!usernames || !usernames.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide usernames."
      });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category is required."
      });
    }

    const result = await massUploadUsernames(
      usernames,
      category,
      addedBy
    );

    return res.status(200).json({
      success: true,
      message: `${result.added} usernames added successfully.`,
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteUsernameController = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await deleteUsername(id);

    return res.status(200).json({
      success: true,
      message: "Username deleted successfully.",
      data: result
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteAllUsernamesController = async (req, res) => {
  try {
    const { category } = req.body;

    const result = await deleteAllUsernames(category);

    return res.status(200).json({
      success: true,
      message: `${result.deleted} usernames deleted successfully.`,
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateNationController = async (req, res) => {
  try {
    const { id } = req.params;
    const { nation } = req.body;

    const result = await updateNation(
      id,
      nation
    );

    return res.status(200).json({
      success: true,
      message: "Nation updated successfully.",
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateInterestController = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await updateInterest(
      id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Interest updated successfully.",
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateStatusController = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await updateStatus(
      id,
      status
    );

    return res.status(200).json({
      success: true,
      message: "Status updated successfully.",
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateNotesController = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const result = await updateNotes(
      id,
      notes
    );

    return res.status(200).json({
      success: true,
      message: "Notes updated successfully.",
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const bulkUpdateAttributeController = async (req, res) => {
  try {
    const {
      ids,
      attribute,
      values
    } = req.body;

    const result =
      await bulkUpdateAttribute(
        ids,
        attribute,
        values
      );

    return res.status(200).json({
      success: true,
      message: "Bulk update completed.",
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const dragFillNationController = async (req, res) => {
  try {
    const {
      ids,
      nation
    } = req.body;

    const result =
      await dragFillNation(
        ids,
        nation
      );

    return res.status(200).json({
      success: true,
      message: "Nation copied successfully.",
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};