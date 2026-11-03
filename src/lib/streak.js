import { addDays, today } from "./dates.js";

/** Үйлдэл хийсэн өдөр = давталт хийсэн эсвэл даалгавар дуусгасан өдөр. */
export function isActiveDay(entry) {
  return !!entry && (entry.reviews > 0 || Object.keys(entry.done ?? {}).length > 0);
}

/** Өнөөдөр идэвхгүй байсан ч өчигдрөөс тасраагүй бол streak хадгалагдана. */
export function streak(log, now = today()) {
  let n = 0;
  let d = isActiveDay(log[now]) ? now : addDays(now, -1);
  while (isActiveDay(log[d])) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
