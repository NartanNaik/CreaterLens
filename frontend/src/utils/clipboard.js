export const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);

    return {
      success: true,
      message: "Copied successfully."
    };
  } catch (error) {
    return {
      success: false,
      message: "Unable to copy.",
      error
    };
  }
};

export const copyMultiple = async (
  values
) => {
  try {
    const text = values.join("\n");

    await navigator.clipboard.writeText(text);

    return {
      success: true,
      message: "Copied successfully."
    };
  } catch (error) {
    return {
      success: false,
      message: "Unable to copy.",
      error
    };
  }
};

export const copyColumn = async (
  rows,
  key
) => {
  try {
    const text = rows
      .map((row) => row[key] || "")
      .join("\n");

    await navigator.clipboard.writeText(text);

    return {
      success: true,
      message: "Column copied successfully."
    };
  } catch (error) {
    return {
      success: false,
      message: "Unable to copy column.",
      error
    };
  }
};