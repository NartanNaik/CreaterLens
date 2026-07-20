import { db } from "../config/firebase.js";
import { calculateInterestRate } from "../services/interestService.js";

const collection = db.collection("usernames");

export const updateNationController = async (req, res) => {
  try {
    const { id } = req.params;
    const { nation } = req.body;

    if (!nation || !nation.trim()) {
      return res.status(400).json({
        success: false,
        message: "Nation is required."
      });
    }

    await collection.doc(id).update({
      nation: nation.trim()
    });

    return res.status(200).json({
      success: true,
      message: "Nation updated successfully."
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
    const { ids, nation } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Ids are required."
      });
    }

    const batch = db.batch();

    ids.forEach((id) => {
      batch.update(collection.doc(id), {
        nation: nation.trim()
      });
    });

    await batch.commit();

    return res.status(200).json({
      success: true,
      message: "Nation copied successfully."
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

    const {
      messages,
      replies,
      mentions,
      reactions
    } = req.body;

    const interest = calculateInterestRate({
      messages,
      replies,
      mentions,
      reactions
    });

    await collection.doc(id).update(interest);

    return res.status(200).json({
      success: true,
      message: "Interest updated successfully.",
      data: interest
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

    await collection.doc(id).update({
      status
    });

    return res.status(200).json({
      success: true,
      message: "Status updated successfully."
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

    await collection.doc(id).update({
      notes
    });

    return res.status(200).json({
      success: true,
      message: "Notes updated successfully."
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
      values,
      attribute
    } = req.body;

    if (
      !Array.isArray(ids) ||
      !Array.isArray(values) ||
      ids.length !== values.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid bulk data."
      });
    }

    const batch = db.batch();

    ids.forEach((id, index) => {
      batch.update(collection.doc(id), {
        [attribute]: values[index]
      });
    });

    await batch.commit();

    return res.status(200).json({
      success: true,
      message: "Bulk update completed."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};