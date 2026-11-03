// 8 долоо хоногийн хувийн төлөвлөгөө. Цэвэр функц — tests/plan.test.js-ээр шалгагдана.
// Шалгалт хүртэлх хоногийг 8 «долоо хоног»-т хуваана: 56 хоногоос богино/урт байсан ч
// үе шатуудын харьцаа (2:2:2:1:1) хадгалагдана.

import { addDays, diffDays } from "./dates.js";

export const PHASES = [
  { id: "foundation", weeks: [1, 2], title: "Үндэс", desc: "HSK-ийн гол дүрэм, өндөр давтамжтай үгс, пиньинь ба ханз" },
  { id: "intensify", weeks: [3, 4], title: "Эрчимжүүлэх", desc: "Дүрэм, үгсийн сан + асуултын төрөл бүрийн стратеги" },
  { id: "deep", weeks: [5, 6], title: "Гүнзгий дадлага", desc: "Хэсэг тус бүрээр, ялангуяа 书写 (өгүүлбэр байгуулах, богино эссэ)" },
  { id: "mock", weeks: [7], title: "Жишиг шалгалт", desc: "Бүтэн хугацаатай жишиг шалгалт долоо хоногт 2–3 удаа" },
  { id: "final", weeks: [8], title: "Эцсийн бэлтгэл", desc: "Алдаан дээр ажиллах, давталт, шалгалтын өдрийн бэлтгэл" },
];

// Үе шат бүрийн цагийн хуваарилалт (хувь).
const BASE_WEIGHTS = {
  foundation: { vocab: 0.3, grammar: 0.3, listening: 0.2, reading: 0.2 },
  intensify: { vocab: 0.25, grammar: 0.2, listening: 0.25, reading: 0.3 },
  deep: { vocab: 0.15, writing: 0.35, listening: 0.25, reading: 0.25 },
  mock: { vocab: 0.2, mistakes: 0.4, writing: 0.4 },
  final: { mistakes: 0.4, vocab: 0.3, listening: 0.15, reading: 0.15 },
};

// Оношлох тестийн хэсэг → төлөвлөгөөний task төрөл.
const WEAKNESS_KEY = { vocab: "vocab", grammar: "writing", writing: "writing", listening: "listening", reading: "reading" };

const TASK_META = {
  vocab: { section: "vocab", title: "Үгсийн сан давтах", route: "#/vocab" },
  grammar: { section: "writing", title: "Дүрмийн хэв маяг", route: "#/grammar" },
  listening: { section: "listening", title: "听力 дадлага", route: "#/listening" },
  reading: { section: "reading", title: "阅读 дадлага", route: "#/reading" },
  writing: { section: "writing", title: "书写 дадлага", route: "#/writing" },
  mistakes: { section: "mistakes", title: "Алдааны дэвтэр", route: "#/mistakes" },
  mock: { section: "mock", title: "Бүтэн жишиг шалгалт", route: "#/mock" },
  examday: { section: "mock", title: "Шалгалтын өдрийн бэлтгэл", route: "#/plan" },
};

const DETAIL = {
  foundation: {
    grammar: "Шинэ 1–2 хэв маяг + богино дасгал",
    listening: "Богино яриа: зураг тааруулах, үнэн/худал",
    reading: "Хоосон зай нөхөх, гол санаа",
  },
  intensify: {
    grammar: "Ойролцоо хэв маягийг харьцуулах",
    listening: "Гол санаа, ярилцагчийн зорилго",
    reading: "Өгүүлбэр дараалуулах (холбох үг ажиглах)",
  },
  deep: {
    writing: "完成句子 эсвэл 80 ханзын эссэ бичиж AI-аар үнэлүүлэх",
    listening: "Урт сонсгол, 1.2x хурдаар",
    reading: "Зохиогчийн хандлага, хугацаатай",
  },
  mock: { writing: "Жишиг шалгалтын бичгийг засварлах", mistakes: "Сүүлийн жишиг шалгалтын алдаа" },
  final: { mistakes: "Шийдээгүй алдаануудыг дахин бодох", listening: "Хөнгөн давталт", reading: "Хөнгөн давталт" },
};

const round5 = (n) => Math.max(5, Math.round(n / 5) * 5);

export function phaseForWeek(week) {
  return PHASES.find((p) => p.weeks.includes(week)) ?? PHASES[PHASES.length - 1];
}

/** Төлөвлөгөөний хүрээ: эхлэх өдрөөс шалгалтын өмнөх өдөр хүртэл. */
export function planSpan(startDate, examDate) {
  const days = Math.max(7, diffDays(startDate, examDate));
  return { days, weekLen: days / 8 };
}

/** Тухайн өдрийн байрлал: долоо хоног (1–8), үе шат, өдрийн дугаар. */
export function dayInfo(profile, date) {
  const { days, weekLen } = planSpan(profile.startDate, profile.examDate);
  const index = Math.min(days - 1, Math.max(0, diffDays(profile.startDate, date)));
  const week = Math.min(8, Math.floor(index / weekLen) + 1);
  const daysLeft = diffDays(date, profile.examDate);
  return { index, week, phase: phaseForWeek(week), daysLeft, totalDays: days };
}

/** Сул хэсэгт илүү цаг: нарийвчлал 70%-аас доош бол жин нэмэгдэнэ. */
export function adjustWeights(weights, weakness = {}) {
  const out = {};
  for (const [k, w] of Object.entries(weights)) {
    const key = WEAKNESS_KEY[k];
    const acc = key && weakness[key] != null ? weakness[key] : 0.7;
    out[k] = w * Math.min(1.6, Math.max(0.6, 1 + (0.7 - acc)));
  }
  const sum = Object.values(out).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(out)) out[k] /= sum;
  return out;
}

/** Өдөр бүрийн даалгавруудын жагсаалт. */
export function tasksForDay(profile, weakness, date) {
  const info = dayInfo(profile, date);
  const M = profile.minutesPerDay;
  const mk = (kind, minutes, detail) => ({
    id: `${date}:${kind}`,
    kind,
    minutes: round5(minutes),
    detail: detail ?? DETAIL[info.phase.id]?.[kind] ?? "",
    ...TASK_META[kind],
  });

  if (info.daysLeft <= 1) {
    return [mk("examday", 30, "Бичиг баримт, цаг, маршрутаа шалгаж, эрт унт"), mk("vocab", 15, "Зөвхөн хугацаа нь болсон картууд")];
  }

  // 7-р долоо хоног: 3 өдөр тутамд жишиг шалгалт (долоо хоногт 2–3 удаа).
  if (info.phase.id === "mock") {
    const { weekLen } = planSpan(profile.startDate, profile.examDate);
    const dayInWeek = Math.floor(info.index - 6 * weekLen);
    if (dayInWeek % 3 === 0) {
      return [mk("mock", 90, "听力 → 阅读 → 书写"), mk("vocab", 10, "Зөвхөн хугацаа нь болсон картууд")];
    }
  }

  const weights = adjustWeights(BASE_WEIGHTS[info.phase.id], weakness);
  return Object.entries(weights)
    .map(([kind, w]) => mk(kind, M * w))
    .sort((a, b) => b.minutes - a.minutes);
}

/** Өдөрт шинэ үгийн хязгаар: цагт тохируулж, мөн шалгалтаас өмнө бүх үгийг дуусгах хурдтай. */
export function newWordsPerDay(profile, remainingNew, date) {
  const { daysLeft } = dayInfo(profile, date);
  const byTime = Math.round(profile.minutesPerDay / 6); // 60 мин → 10 шинэ үг
  const byDeadline = Math.ceil(remainingNew / Math.max(1, daysLeft - 7)); // сүүлийн 7 хоногт шинэ үг үзэхгүй
  if (daysLeft <= 7) return 0;
  return Math.max(3, Math.min(25, Math.max(byTime, byDeadline)));
}

export function weekRange(profile, week) {
  const { weekLen } = planSpan(profile.startDate, profile.examDate);
  const start = addDays(profile.startDate, Math.ceil((week - 1) * weekLen));
  const end = addDays(profile.startDate, Math.ceil(week * weekLen) - 1);
  return { start, end };
}
