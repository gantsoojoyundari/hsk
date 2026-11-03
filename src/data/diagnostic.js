// HSK оношлох тест (30 мин): сонсгол 4, унших 4, дүрэм 6 (бичгийн чадварын үзүүлэлт), үгсийн сан 8.
// Асуултууд нь бусад JSON сангаас ID-аар сонгогдоно — шинэ асуулт нэмэхэд энд ID-г солиход хангалттай.
import listening from "./listening.json";
import reading from "./reading.json";
import grammar from "./grammar.json";
import vocab from "./vocab.json";

export const DIAGNOSTIC_MINUTES = 30;

const LISTENING_IDS = ["L03", "L07", "L08", "L11"];
const READING_IDS = ["R02", "R04", "R06", "R12"];
const GRAMMAR_IDS = ["g01", "g02", "g05", "g06", "g09", "g11"];
const VOCAB_IDS = ["b010", "b025", "b040", "b055", "v005", "v023", "v047", "v081"];

function shuffleWithSeed(arr, seed) {
  const a = [...arr];
  let x = seed;
  for (let i = a.length - 1; i > 0; i--) {
    x = (x * 9301 + 49297) % 233280;
    const j = Math.floor((x / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildDiagnostic() {
  const items = [];
  for (const id of LISTENING_IDS) {
    const q = listening.items.find((x) => x.id === id);
    items.push({ section: "listening", kind: "listening", qid: id, ...q });
  }
  for (const id of READING_IDS) {
    const q = reading.items.find((x) => x.id === id);
    items.push({ section: "reading", kind: "reading", qid: id, ...q });
  }
  for (const id of GRAMMAR_IDS) {
    const g = grammar.find((x) => x.id === id);
    const ex = g.exercise[0];
    items.push({
      section: "writing",
      kind: "grammar",
      qid: `${id}:0`,
      question: "( ) хоосон зайд тохирох үгийг сонгоно уу.",
      passage: ex.q,
      options: ex.options,
      answer: ex.answer,
      explain_mn: ex.explain_mn,
    });
  }
  VOCAB_IDS.forEach((id, i) => {
    const w = vocab.words.find((x) => x.id === id);
    const distractors = shuffleWithSeed(
      vocab.words.filter((x) => x.id !== id && x.topic !== w.topic),
      i + 7,
    ).slice(0, 3);
    const options = shuffleWithSeed([w, ...distractors], i + 3);
    items.push({
      section: "vocab",
      kind: "vocab",
      qid: id,
      question: "Утгыг нь сонгоно уу.",
      passage: w.ko,
      options: options.map((o) => o.mn),
      answer: options.findIndex((o) => o.id === id),
      explain_mn: `${w.ko} — ${w.mn}. ${w.ex_ko}`,
    });
  });
  return items;
}
