// Тогтсон шаттай spaced repetition (1/3/7/14/30/60 өдөр). Цэвэр функцууд — tests/srs.test.js-ээр шалгагдана.
// Карт: { reps, interval (өдөр), ease, due ("YYYY-MM-DD"), lapses, step }
// Шинэ үг: эхлээд богино «сурах» алхмуудаар (step) явж, дараа нь өдрийн интервалд шилжинэ.

import { addDays, today } from "./dates.js";

export const GRADES = {
  again: { label: "Мартсан", key: "1" },
  hard: { label: "Хэцүү", key: "2" },
  good: { label: "Санасан", key: "3" },
  easy: { label: "Амархан", key: "4" },
};

export const NEW_CARD = { reps: 0, interval: 0, ease: 2.5, due: null, lapses: 0, step: 0 };
const MIN_EASE = 1.3;
const MAX_INTERVAL = 60; // 8 долоо хоногийн хөтөлбөрт 60 хоногоос урт интервал утгагүй.
export const LADDER = [1, 3, 7, 14, 30, MAX_INTERVAL];

/** Үнэлгээ өгсний дараах картын шинэ төлөв. `now` нь "YYYY-MM-DD". */
export function review(card, grade, now = today()) {
  const c = { ...NEW_CARD, ...card };

  if (grade === "again") {
    return {
      ...c,
      reps: 0,
      step: 0,
      interval: 0,
      lapses: c.reps > 0 ? c.lapses + 1 : c.lapses,
      ease: Math.max(MIN_EASE, c.ease - 0.2),
      due: now, // өнөөдрийн сешн дотор дахин гарна
    };
  }

  // Тогтсон шат (hanzi-recall маягаар ойлгомжтой): зөв бүрт 1 → 3 → 7 → 14 → 30 → 60 өдөр.
  // «Амархан» нэг шат алгасна, «Хэцүү» тухайн шатандаа үлдэнэ. Алдвал (again) эхнээс нь.
  const at = LADDER.indexOf(c.interval);
  const cur = c.reps === 0 ? -1 : at >= 0 ? at : LADDER.findIndex((d) => d >= c.interval);
  const stepUp = grade === "easy" ? 2 : grade === "hard" ? (cur < 0 ? 1 : 0) : 1;
  const idx = Math.min(LADDER.length - 1, Math.max(0, cur + stepUp));
  const interval = LADDER[idx];
  let ease = c.ease;
  if (grade === "hard") ease = Math.max(MIN_EASE, ease - 0.15);
  if (grade === "easy") ease = ease + 0.15;

  return { ...c, reps: c.reps + 1, step: 0, interval, ease, due: addDays(now, interval) };
}

/** «Мэднэ» — хэрэглэгч аль хэдийн мэддэг үг: давталтаас хасаж, 60 хоногийн дараа нэг шалгана. */
export function markKnown(card, now = today()) {
  const c = { ...NEW_CARD, ...card };
  return { ...c, reps: Math.max(3, c.reps), step: 0, interval: MAX_INTERVAL, ease: Math.max(c.ease, 2.8), due: addDays(now, MAX_INTERVAL), known: true };
}

/** Өнөөдрийн давталтын дараалал: хугацаа нь болсон картууд + өдрийн шинэ үгийн хязгаар. */
export function buildQueue(words, srs, { newLimit, now = today() }) {
  const due = [];
  const fresh = [];
  for (const w of words) {
    const card = srs[w.id];
    if (!card) fresh.push(w.id);
    else if (card.due <= now) due.push(w.id);
  }
  // Хамгийн их хоцорсныг эхэнд.
  due.sort((a, b) => srs[a].due.localeCompare(srs[b].due));
  return { due, fresh: fresh.slice(0, Math.max(0, newLimit)) };
}

/** "Эзэмшсэн" = интервал 21+ хоног. */
export function masteryStats(words, srs) {
  let learned = 0;
  let mature = 0;
  for (const w of words) {
    const c = srs[w.id];
    if (!c || c.reps === 0) continue;
    learned++;
    if (c.interval >= 21) mature++;
  }
  return { total: words.length, learned, mature };
}

/**
 * «Эндээс тэндээс» — хугацаа нь болоогүй ч өмнө нь үзсэн үгсээс өдөрт хэдийг санамсаргүйгээр түүнэ.
 * Огноогоор seed хийдэг тул нэг өдөртөө ижил үгс гарна; өнөөдөр аль хэдийн давтсан үг орохгүй.
 */
export function pickOldMix(words, srs, { now = today(), n = 4, exclude = [], salt = "" } = {}) {
  const skip = new Set(exclude);
  const pool = words.filter((w) => {
    const c = srs[w.id];
    return c && c.reps > 0 && c.due > now && !skip.has(w.id);
  });
  const h = (id) => {
    let x = 2166136261;
    for (const ch of now + salt + id) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
    return x >>> 0;
  };
  return pool.sort((a, b) => h(a.id) - h(b.id)).slice(0, n).map((w) => w.id);
}
