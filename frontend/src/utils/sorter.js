export const sortUsernames = (
  data,
  filter
) => {
  const list = [...data];

  switch (filter) {
    case "name-asc":
      return list.sort((a, b) =>
        (a.username || "").localeCompare(
          b.username || ""
        )
      );

    case "name-desc":
      return list.sort((a, b) =>
        (b.username || "").localeCompare(
          a.username || ""
        )
      );

    case "nation-asc":
      return list.sort((a, b) =>
        (a.nation || "").localeCompare(
          b.nation || ""
        )
      );

    case "nation-desc":
      return list.sort((a, b) =>
        (b.nation || "").localeCompare(
          a.nation || ""
        )
      );

    case "followers-high":
      return list.sort(
        (a, b) =>
          (b.totalFollowers || 0) -
          (a.totalFollowers || 0)
      );

    case "followers-low":
      return list.sort(
        (a, b) =>
          (a.totalFollowers || 0) -
          (b.totalFollowers || 0)
      );

    case "views-high":
      return list.sort(
        (a, b) =>
          (b.avgViewsPerWeek || 0) -
          (a.avgViewsPerWeek || 0)
      );

    case "views-low":
      return list.sort(
        (a, b) =>
          (a.avgViewsPerWeek || 0) -
          (b.avgViewsPerWeek || 0)
      );

    case "interest-high":
      return list.sort(
        (a, b) =>
          (b.interestRate || 0) -
          (a.interestRate || 0)
      );

    case "interest-low":
      return list.sort(
        (a, b) =>
          (a.interestRate || 0) -
          (b.interestRate || 0)
      );

    case "today": {
      const today = new Date();

      return list.filter((item) => {
        if (!item.createdAt) {
          return false;
        }

        const date = item.createdAt.toDate
          ? item.createdAt.toDate()
          : new Date(item.createdAt);

        return (
          date.getDate() ===
            today.getDate() &&
          date.getMonth() ===
            today.getMonth() &&
          date.getFullYear() ===
            today.getFullYear()
        );
      });
    }

    case "week": {
      const today = new Date();

      const firstDay = new Date(today);

      firstDay.setHours(
        0,
        0,
        0,
        0
      );

      firstDay.setDate(
        today.getDate() - today.getDay()
      );

      return list.filter((item) => {
        if (!item.createdAt) {
          return false;
        }

        const date = item.createdAt.toDate
          ? item.createdAt.toDate()
          : new Date(item.createdAt);

        return date >= firstDay;
      });
    }

    case "month": {
      const today = new Date();

      return list.filter((item) => {
        if (!item.createdAt) {
          return false;
        }

        const date = item.createdAt.toDate
          ? item.createdAt.toDate()
          : new Date(item.createdAt);

        return (
          date.getMonth() ===
            today.getMonth() &&
          date.getFullYear() ===
            today.getFullYear()
        );
      });
    }

    default:
      return list;
  }
};

export const searchUsernames = (
  data,
  search
) => {
  if (!search.trim()) {
    return data;
  }

  const value = search.toLowerCase();

  return data.filter((item) =>
    (item.username || "")
      .toLowerCase()
      .includes(value)
  );
};

export const filterByCategory = (
  data,
  category
) => {
  if (
    !category ||
    category === "All"
  ) {
    return data;
  }

  return data.filter(
    (item) =>
      item.category === category
  );
};