// Огноог локал цагийн "YYYY-MM-DD" мөрөөр хадгална (UTC шилжилтээс болж өдөр солигдохгүй).

export function toKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function today() {
  return toKey(new Date());
}

export function parseKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function diffDays(fromKey, toKeyStr) {
  return Math.round((parseKey(toKeyStr) - parseKey(fromKey)) / 86400000);
}

const WEEKDAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];

export function formatMn(key) {
  const d = parseKey(key);
  return `${d.getMonth() + 1}-р сарын ${d.getDate()} (${WEEKDAYS[d.getDay()]})`;
}
