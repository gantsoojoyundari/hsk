// Түвшин тооцох ба оноо таамаглах (HSK 1–6).
//
// HSK-д түвшин бүр тусдаа шалгалт:
//   HSK 1–2: 听力 + 阅读 (хэсэг бүр 100) → нийт 200, тэнцэх 120.
//   HSK 3–6: 听力 + 阅读 + 书写 (хэсэг бүр 100) → нийт 300, тэнцэх 180.
// Тэнцэх босго = 60%.
//
// levelFor(total, target) — энгийн эвристик: оноог «зорилтот түвшний шалгалтын» оноо гэж үзнэ.
//   ≥60% → зорилтот түвшин. Доод түвшин бүр 15 пунктээр хялбар гэж тооцно (доод хязгаар 20%):
//   ≥45% → target−1, ≥30% → target−2, ≥20% → target−3 … (HSK 1-ээс доош бол null).
//   Зорилтоос дээш таамаглахгүй (тэр түвшний шалгалтыг өгөөгүй тул).

export const PASS_RATIO = 0.6;
const STEP = 0.15;
const FLOOR = 0.2; // үүнээс доош бол ямар ч түвшин тогтоохгүй

export const EXAMS = {
  1: { sections: ["listening", "reading"], max: 200, pass: 120, words: 150 },
  2: { sections: ["listening", "reading"], max: 200, pass: 120, words: 300 },
  3: { sections: ["listening", "reading", "writing"], max: 300, pass: 180, words: 600 },
  4: { sections: ["listening", "reading", "writing"], max: 300, pass: 180, words: 1200 },
  5: { sections: ["listening", "reading", "writing"], max: 300, pass: 180, words: 2500 },
  6: { sections: ["listening", "reading", "writing"], max: 300, pass: 180, words: 5000 },
};

/** Хуучин API-тай нийцүүлэх: түвшин бүрийн тэнцэх оноо (өөрийн шалгалтын хуваарь дээр). */
export const LEVELS = [6, 5, 4, 3, 2, 1].map((level) => ({ level, min: EXAMS[level].pass, max: EXAMS[level].max }));

export const SECTIONS = {
  listening: { ko: "听力", mn: "Сонсгол", color: "listening" },
  writing: { ko: "书写", mn: "Бичих", color: "writing" },
  reading: { ko: "阅读", mn: "Унших", color: "reading" },
};

const clampLevel = (level) => (EXAMS[level] ? level : 3);

export function examFor(level) {
  return EXAMS[clampLevel(level)];
}

/** Тухайн түвшний шалгалтын хэсгүүд. */
export function sectionsFor(level) {
  return examFor(level).sections;
}

export function maxFor(level) {
  return examFor(level).max;
}

/**
 * Оноо → тооцоолсон HSK түвшин. `total` нь `target` түвшний шалгалтын хуваарь (200/300) дээрх оноо.
 * null = HSK 1-д ч хүрэхгүй.
 */
export function levelFor(total, target = 3) {
  if (total == null) return null;
  const t = clampLevel(target);
  const ratio = total / EXAMS[t].max;
  for (let level = t; level >= 1; level--) {
    if (ratio >= Math.max(FLOOR, PASS_RATIO - STEP * (t - level))) return level;
  }
  return null;
}

/** Тухайн түвшинд тэнцэх оноо (120 эсвэл 180). */
export function thresholdFor(level) {
  return examFor(level).pass;
}

/**
 * Хэсэг бүрийн тооцоолсон оноо (100-аас).
 * Сүүлийн 60 асуултын нарийвчлалыг оношлох тесттэй жинлэж нэгтгэнэ — эхэндээ оношлогоо,
 * дадлага ихсэх тусам бодит дадлагын үр дүн давамгайлна.
 */
export function estimateSections(state) {
  const out = {};
  const n = {};
  for (const section of ["listening", "reading", "writing"]) {
    const recent = state.attempts.filter((a) => a.section === section).slice(-60);
    const correct = recent.reduce((s, a) => s + a.correct, 0);
    const total = recent.reduce((s, a) => s + a.total, 0);
    const prior = state.diagnostic?.scores?.[section];
    const priorWeight = prior != null ? 10 : 0;
    const acc =
      total + priorWeight > 0 ? (correct + (prior ?? 0) * priorWeight) / (total + priorWeight) : null;
    out[section] = acc;
    n[section] = total;
  }

  // Бичих: AI үнэлгээ байвал түүнийг голлоно.
  const graded = (state.writings ?? []).filter((w) => w.result?.max);
  if (graded.length) {
    const recent = graded.slice(-6);
    const ratio = recent.reduce((s, w) => s + w.result.score, 0) / recent.reduce((s, w) => s + w.result.max, 0);
    out.writing = out.writing == null ? ratio : ratio * 0.7 + out.writing * 0.3;
    n.writing += recent.length * 10;
  }

  const scores = {};
  for (const k of Object.keys(out)) scores[k] = out[k] == null ? null : Math.round(out[k] * 100);
  return { scores, samples: n };
}

/**
 * Зорилтот түвшинд хүрэх магадлал: normal CDF((таамаг − босго)/σ), σ нь өгөгдөл ихсэх тусам багасна.
 * Зөвхөн тухайн түвшний шалгалтад орох хэсгүүдийг нэмнэ (HSK 1–2-т 书写 байхгүй).
 * Буцаах: { total, max, p }.
 */
export function reachProbability(scores, samples, targetLevel) {
  const exam = examFor(targetLevel);
  const vals = exam.sections.map((k) => scores[k]);
  if (vals.some((v) => v == null)) return null;
  const total = vals.reduce((a, b) => a + b, 0);
  const nSum = exam.sections.reduce((a, k) => a + (samples[k] ?? 0), 0);
  const sigma = ((40 * exam.max) / 300) / Math.sqrt(1 + nSum / 40);
  const z = (total - exam.pass) / sigma;
  return { total, max: exam.max, p: normalCdf(z) };
}

function normalCdf(z) {
  // Abramowitz–Stegun ойролцоолол
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
