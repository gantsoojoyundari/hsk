// HSK 书写 даалгаврын туслах функцууд (Writing.jsx ба Mock.jsx хуваалцана).
// Даалгаврын төрөл:
//   arrange  — 完成句子: өгсөн үгсийг дараалуулах (HSK 3/4). Хариулт = үгийн индексийн массив. Автоматаар шалгана.
//   hanzi    — 写汉字: пиньинь-ээр ханз бичих (HSK 3). Хариулт = нүд бүрийн мөрийн массив. Автоматаар шалгана.
//   sentence — 看词写句: өгсөн үгээр өгүүлбэр бичих (HSK 4). Хариулт = мөр. AI үнэлнэ.
//   essay    — 80 ханзын богино эссэ, 5 үгээр (HSK 5). Хариулт = мөр. AI үнэлнэ.

export const MAX_SCORE = { arrange: 4, hanzi: 4, sentence: 10, essay: 30 };

export const TASK_LABEL = {
  arrange: "完成句子",
  hanzi: "写汉字",
  sentence: "看词写句",
  essay: "短文",
};

export const isAuto = (task) => task.task === "arrange" || task.task === "hanzi";

/** Ханз тоолох: хоосон зай, мөр шилжилтийг тоолохгүй; цэг таслал 方格纸-д нэг нүд эзэлдэг тул тоолно. */
export function countChars(text) {
  return (text ?? "").replace(/\s/g, "").length;
}

export function emptyAnswer(task) {
  if (task.task === "arrange") return [];
  if (task.task === "hanzi") return task.blanks.map(() => "");
  return "";
}

/** Хариултыг текст болгох (AI руу илгээх, хадгалах). */
export function answerText(task, answer) {
  if (answer == null) return "";
  if (task.task === "arrange") {
    const s = (Array.isArray(answer) ? answer : []).map((i) => task.words[i]).join("");
    return s ? `${s}。` : "";
  }
  if (task.task === "hanzi") {
    return task.blanks.map((b, i) => `${b.label} (${b.pinyin}): ${(answer[i] ?? "").trim()}`).join("\n");
  }
  return typeof answer === "string" ? answer : "";
}

export function hasAnswer(task, answer) {
  if (task.task === "arrange") return Array.isArray(answer) && answer.length === task.words.length;
  if (task.task === "hanzi") return Array.isArray(answer) && answer.some((a) => a?.trim());
  return countChars(answer) > 0;
}

export function promptText(task) {
  let p = task.instruction;
  if (task.text) p += `\n${task.text}`;
  if (task.blanks) p += `\n${task.blanks.map((b) => `${b.label} ${b.pinyin}`).join("  ")}`;
  if (task.words) p += `\n词语：${task.words.join("、")}`;
  return p;
}

const norm = (s) => (s ?? "").replace(/[\s，,。.！!？?、；;：:“”"'‘’（）()]/g, "");

/** arrange/hanzi-г шууд шалгаж, AI үнэлгээтэй ижил хэлбэрийн үр дүн буцаана. Бусад төрөлд null. */
export function autoGrade(task, answer) {
  const max = MAX_SCORE[task.task];
  if (task.task === "arrange") {
    const text = answerText(task, answer);
    const ok = task.model.some((m) => norm(m) === norm(text));
    return {
      score: ok ? max : 0,
      max,
      auto: true,
      criteria: [{ name: "语序", score: ok ? max : 0, max, comment_mn: ok ? "Үгийн дараалал зөв." : "Үгийн дараалал буруу байна. Жишиг хариултыг харьцуул." }],
      corrected: task.model[0],
      summary_mn: ok ? "Зөв! " + (task.model.length > 1 ? `Өөр зөв хувилбар: ${task.model.filter((m) => norm(m) !== norm(text)).join(" / ")}` : "") : task.tips_mn,
      corrections: ok || !text ? [] : [{ original: text, fixed: task.model[0], why_mn: task.tips_mn }],
    };
  }
  if (task.task === "hanzi") {
    const per = max / task.blanks.length;
    const results = task.blanks.map((b, i) => (answer?.[i] ?? "").trim() === b.answer);
    const score = Math.round(results.filter(Boolean).length * per);
    return {
      score,
      max,
      auto: true,
      criteria: task.blanks.map((b, i) => ({
        name: `${b.label} ${b.pinyin}`,
        score: results[i] ? per : 0,
        max: per,
        comment_mn: results[i] ? "Зөв." : `Зөв хариулт: ${b.answer}`,
      })),
      corrected: task.blanks.reduce((t, b) => t.replace(new RegExp(`（\\s*${b.label}\\s*）`), b.answer), task.text ?? ""),
      summary_mn: results.every(Boolean) ? "Бүгд зөв!" : task.tips_mn,
      corrections: task.blanks
        .map((b, i) => (results[i] ? null : { original: (answer?.[i] ?? "").trim() || "—", fixed: b.answer, why_mn: `${b.pinyin} → ${b.answer}` }))
        .filter(Boolean),
    };
  }
  return null;
}
