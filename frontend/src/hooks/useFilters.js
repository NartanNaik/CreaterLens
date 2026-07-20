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

      case "nation":
        data.sort((a, b) =>
          (a.nation || "").localeCompare(
            b.nation || ""
          )
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