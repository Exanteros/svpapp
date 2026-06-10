export function formatDateTime(value: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

export function formatEuro(value: number) {
  return `${Number(value || 0).toLocaleString("de-DE")} Euro`;
}

export function isActive(value: boolean | number | undefined) {
  return value === true || value === 1;
}

