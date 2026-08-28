import { useMemo } from "react";

function useFilters(usernames, filter) {
  const filteredData = useMemo(() => {
    const data = [...usernames];

    switch (filter) {
      case "name-asc":
        data.sort((a, b) =>
          (a.username || "").localeCompare(
            b.username || ""
          )
        );
        break;

      case "name-desc":
        data.sort((a, b) =>
          (b.username || "").localeCompare(
            a.username || ""
          )
        );
        break;

      case "nation-asc":
        data.sort((a, b) =>
          (a.nation || "").localeCompare(
            b.nation || ""
          )
        );
        break;

      case "nation-desc":
        data.sort((a, b) =>
          (b.nation || "").localeCompare(
            a.nation || ""
          )
        );
        break;

      case "followers-high":
        data.sort(
          (a, b) =>
            (b.totalFollowers || 0) -
            (a.totalFollowers || 0)
        );
        break;

      case "followers-low":
        data.sort(
          (a, b) =>
            (a.totalFollowers || 0) -
            (b.totalFollowers || 0)
        );
        break;

      case "views-high":
        data.sort(
          (a, b) =>
            (b.avgViewsPerWeek || 0) -
            (a.avgViewsPerWeek || 0)
        );
        break;

      case "views-low":
        data.sort(
          (a, b) =>
            (a.avgViewsPerWeek || 0) -
            (b.avgViewsPerWeek || 0)
        );
        break;

      case "interest-high":
        data.sort(
          (a, b) =>
            (b.interestRate || 0) -
            (a.interestRate || 0)
        );
        break;

      case "interest-low":
        data.sort(
          (a, b) =>
            (a.interestRate || 0) -
            (b.interestRate || 0)
        );
        break;

      case "today": {
        const today = new Date();

        return data.filter((item) => {
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

        firstDay.setDate(
          today.getDate() - today.getDay()
        );

        return data.filter((item) => {
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

        return data.filter((item) => {
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
        break;
    }

    return data;
  }, [usernames, filter]);

  return filteredData;
}

export default useFilters;