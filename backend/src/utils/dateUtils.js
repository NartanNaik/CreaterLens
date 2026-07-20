export const formatDate = (timestamp) => {
  if (!timestamp) {
    return "";
  }

  let date;

  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else {
    date = new Date(timestamp);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

export const isToday = (timestamp) => {
  if (!timestamp) {
    return false;
  }

  const date = timestamp.toDate
    ? timestamp.toDate()
    : new Date(timestamp);

  const today = new Date();

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

export const isThisWeek = (timestamp) => {
  if (!timestamp) {
    return false;
  }

  const date = timestamp.toDate
    ? timestamp.toDate()
    : new Date(timestamp);

  const today = new Date();

  const firstDay = new Date(today);
  firstDay.setDate(today.getDate() - today.getDay());

  const lastDay = new Date(firstDay);
  lastDay.setDate(firstDay.getDate() + 6);

  return date >= firstDay && date <= lastDay;
};

export const isThisMonth = (timestamp) => {
  if (!timestamp) {
    return false;
  }

  const date = timestamp.toDate
    ? timestamp.toDate()
    : new Date(timestamp);

  const today = new Date();

  return (
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};