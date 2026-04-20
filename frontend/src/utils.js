export function formatCurrency(value) {
  return new Intl.NumberFormat("ru-RU").format(Number(value || 0));
}

export function formatShortDateTime(value) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(value) {
  return new Date(value).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function groupBySection(items) {
  return items.reduce((accumulator, item) => {
    const key = item.section || "Ранее";
    if (!accumulator[key]) {
      accumulator[key] = [];
    }
    accumulator[key].push(item);
    return accumulator;
  }, {});
}

export function subjectToSlug(label) {
  if (label === "Математика") return "math";
  if (label === "Физика") return "physics";
  if (label === "Информатика") return "cs";
  return "all";
}

export function formatPhoneInput(value) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  const padded = digits.padEnd(10, "_");

  return `+7 (${padded.slice(0, 3)}) ${padded.slice(3, 6)}-${padded.slice(6, 8)}-${padded.slice(8, 10)}`;
}

export function extractPhoneDigits(value) {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("7")) {
    digits = digits.slice(1);
  } else if (digits.startsWith("8")) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 10);
}
