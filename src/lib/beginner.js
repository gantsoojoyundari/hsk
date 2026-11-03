// Эхлэгчийн дараалал: пиньинь+аялгуу → энгийн үг → энгийн сонсгол → өгүүлбэр → HSK.
// Цэвэр функц — tests/beginner.test.js-ээр шалгагдана.
import hangul from "../data/pinyin.json" with { type: "json" };
import vocab from "../data/vocab.json" with { type: "json" };

const LEARNED = 2; // Pinyin.jsx-тэй ижил
// Үндсэн = гийгүүлэгч, эгшиг, аялгуу (нийлмэл эгшгийг дараа нь).
const BASIC_LETTERS = hangul.letters.filter((l) => l.group === "consonant" || l.group === "vowel" || l.group === "tone");
const BASIC_WORDS = vocab.words.filter((w) => w.topic === "basic");

export const STEPS = [
  { id: "hangul", n: 1, title: "Пиньинь ба аялгуу", route: "#/pinyin", section: "vocab", minutes: 15, detail: "Дуудлага бүрийг сонсоод, дасгал хий" },
  { id: "vocab", n: 2, title: "Энгийн үгс", route: "#/vocab", section: "vocab", minutes: 15, detail: "Шинэ үгийг хараад, сонсоод сур" },
  { id: "listening", n: 3, title: "Энгийн сонсгол", route: "#/easy-listening", section: "listening", minutes: 10, detail: "Сонсоод утгыг нь сонго" },
  { id: "sentence", n: 4, title: "Өгүүлбэр зохиох", route: "#/sentences", section: "writing", minutes: 10, detail: "Үгсийг зөв дараалалд тавь" },
];

export function beginnerState({ hangul: hs = {}, srs = {} }) {
  const lettersAll = hangul.letters.filter((l) => (hs[l.id] ?? 0) >= LEARNED).length;
  const lettersBasic = BASIC_LETTERS.filter((l) => (hs[l.id] ?? 0) >= LEARNED).length;
  const words = BASIC_WORDS.filter((w) => srs[w.id]).length;
  const unlocked = {
    hangul: true,
    vocab: lettersBasic >= BASIC_LETTERS.length,
    listening: words >= 40,
    sentence: words >= 60,
  };
  const lettersDone = lettersAll === hangul.letters.length;
  return {
    lettersAll,
    lettersBasic,
    lettersTotal: hangul.letters.length,
    basicLettersTotal: BASIC_LETTERS.length,
    words,
    wordsTotal: BASIC_WORDS.length,
    unlocked,
    // Бүх пиньинь + анхан шатны бүх үг → HSK хэсгүүд нээгдэнэ.
    graduated: lettersDone && words >= BASIC_WORDS.length,
  };
}

/** Эхлэгчийн өдрийн даалгавар (нээгдсэн алхмууд л). Пиньинээ бүрэн сурсан бол түүний даалгавар гарахгүй. */
export function beginnerTasks(b, date) {
  return STEPS.filter((s) => b.unlocked[s.id])
    .filter((s) => !(s.id === "hangul" && b.lettersAll === b.lettersTotal))
    .map((s) => ({ id: `${date}:${s.id}`, kind: s.id, section: s.section, title: `${s.n}. ${s.title}`, route: s.route, minutes: s.minutes, detail: s.detail }));
}
