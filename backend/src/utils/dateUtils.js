/**
 * Helper to safely parse Firestore timestamps, ISO strings, or milliseconds.
 * Prevents "Invalid Date" crashes.
 */
const parseSafeDate = (timestamp) => {
  if (!timestamp) {
    return null;
  }

  let date;
  if (timestamp.toDate && typeof timestamp.toDate === "function") {
    date = timestamp.toDate();
  } else {
    date = new Date(timestamp);
  }

  // If the parsed date is invalid (NaN), return null to safely fail
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
};

export const formatDate = (timestamp) => {
  const date = parseSafeDate(timestamp);
  if (!date) {
    return "";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

export const isToday = (timestamp) => {
  const date = parseSafeDate(timestamp);
  if (!date) {
    return false;
  }

  const today = new Date();

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

export const isThisWeek = (timestamp) => {
  const date = parseSafeDate(timestamp);
  if (!date) {
    return false;
  }

  const today = new Date();

  // Calculate the first day of the week (Sunday) and force time to 00:00:00.000
  const firstDay = new Date(today);
  firstDay.setDate(today.getDate() - today.getDay());
  firstDay.setHours(0, 0, 0, 0);

  // Calculate the last day of the week (Saturday) and force time to 23:59:59.999
  const lastDay = new Date(firstDay);
  lastDay.setDate(firstDay.getDate() + 6);
  lastDay.setHours(23, 59, 59, 999);

  return date >= firstDay && date <= lastDay;
};

export const isThisMonth = (timestamp) => {
  const date = parseSafeDate(timestamp);
  if (!date) {
    return false;
  }

  const today = new Date();

  return (
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};