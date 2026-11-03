// Түвшин тогтоох тест: «Пиньинь мэдэх үү?» → пиньинийн тест → энгийн үгийн тест → (мэддэг бол) HSK оношлох тест.
// result-ийн «topik» утга нь topik-sprint-ээс уламжилсан дотоод нэр = «анхан шатыг давсан».
// Мэдэж байгаа үсэг, үгийг шууд «сурсан» гэж тэмдэглэнэ — дахин эхнээс нь заахгүй.
import { useMemo, useState } from "react";
import hangul from "../data/pinyin.json";
import vocab from "../data/vocab.json";
import { update } from "../lib/store.js";
import { markKnown } from "../lib/srs.js";
import { today } from "../lib/dates.js";
import { Bar, Button, Card, cx } from "../components/ui.jsx";

const LETTER_N = 10;
const LETTER_PASS = 8;
const WORD_N = 12;
const WORD_PASS = 10;
const LEARNED = 2; // beginner.js-тэй ижил

const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);

function options(correct, pool, field) {
  const others = shuffle(pool.filter((x) => x[field] !== correct[field])).reduce((acc, x) => {
    if (!acc.some((y) => y[field] === x[field])) acc.push(x);
    return acc;
  }, []);
  return shuffle([correct, ...others.slice(0, 3)]);
}

function letterQuestions() {
  // Бүлэг бүрээс (гийгүүлэгч, эгшиг, аялгуу, нийлмэл) холиод авна.
  const byGroup = hangul.groups.map((g) => shuffle(hangul.letters.filter((l) => l.group === g.id)));
  const picked = [];
  for (let i = 0; picked.length < LETTER_N; i++) for (const g of byGroup) if (g[i] && picked.length < LETTER_N) picked.push(g[i]);
  return shuffle(picked).map((l) => ({ item: l, opts: options(l, hangul.letters, "sound") }));
}

function wordQuestions() {
  const basic = vocab.words.filter((w) => w.topic === "basic");
  return shuffle(basic).slice(0, WORD_N).map((w) => ({ item: w, opts: options(w, basic, "mn") }));
}

function Shell({ children }) {
  return <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-8 pt-6">{children}</div>;
}

function Quiz({ title, questions, show, field, onDone }) {
  const [i, setI] = useState(0);
  const [right, setRight] = useState([]);
  const [picked, setPicked] = useState(null);
  const q = questions[i];

  function answer(opt) {
    if (picked) return;
    setPicked(opt ?? "skip");
    const ok = opt && opt[field] === q.item[field];
    const nextRight = ok ? [...right, q.item] : right;
    setTimeout(() => {
      setPicked(null);
      if (i + 1 < questions.length) {
        setRight(nextRight);
        setI(i + 1);
      } else onDone(nextRight);
    }, ok ? 500 : 900);
  }

  return (
    <Shell>
      <div className="mb-2 flex justify-between text-sm text-muted">
        <span className="font-medium text-ink">{title}</span>
        <span className="tabular-nums">{i + 1} / {questions.length}</span>
      </div>
      <Bar value={((i + 1) / questions.length) * 100} />
      <Card className="mt-6 py-10 text-center">
        <div className="ko text-5xl font-bold" lang="zh-CN">{show(q.item)}</div>
      </Card>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {q.opts.map((o) => {
          const isRight = o[field] === q.item[field];
          return (
            <button
              key={o.id}
              onClick={() => answer(o)}
              className={cx(
                "min-h-14 rounded-2xl border p-3 text-base transition",
                !picked && "border-line bg-surface hover:bg-line",
                picked && isRight && "border-good bg-good/15 font-semibold",
                picked && picked === o && !isRight && "border-bad bg-bad/10",
                picked && picked !== o && !isRight && "border-line bg-surface opacity-50",
              )}
            >
              {o[field]}
            </button>
          );
        })}
      </div>
      <button className="mt-4 py-2 text-sm text-muted underline" onClick={() => answer(null)}>
        Мэдэхгүй
      </button>
    </Shell>
  );
}

function save(placement, { letters = [], allLetters = false, words = [], allWords = false }) {
  update((s) => {
    for (const l of allLetters ? hangul.letters : letters) s.hangul[l.id] = Math.max(s.hangul[l.id] ?? 0, LEARNED);
    const basic = vocab.words.filter((w) => w.topic === "basic");
    for (const w of allWords ? basic : words) s.srs[w.id] = markKnown(s.srs[w.id], today());
    s.placement = { ...placement, at: Date.now() };
  });
}

/** onDone(result): "letters" | "words" → эхлэгчийн зам; "topik" → HSK оношлох тест рүү. */
export default function Placement({ onDone }) {
  const [stage, setStage] = useState("ask");
  const [score, setScore] = useState({});
  const letterQs = useMemo(letterQuestions, []);
  const wordQs = useMemo(wordQuestions, []);

  if (stage === "ask") {
    return (
      <Shell>
        <h2 className="text-2xl font-bold">Түвшин тогтоох тест</h2>
        <p className="mt-1 text-muted">Хаанаас эхлэхийг тодорхойлъё. Мэддэг зүйлээ дахин сурахгүй.</p>
        <p className="mt-6 font-medium">Хятад дуудлага (пиньинь, аялгуу) мэдэх үү?</p>
        <div className="mt-3 grid gap-2">
          <Choice title="Огт мэдэхгүй" note="Тестгүйгээр пиньинээс эхэлнэ" onClick={() => finish("letters", {}, {})} />
          <Choice title="Заримыг нь мэднэ" note="Пиньинийн богино тест" onClick={() => setStage("letters")} />
          <Choice title="Тийм, мэднэ" note="Пиньинь → үгийн тест" onClick={() => setStage("letters")} />
        </div>
      </Shell>
    );
  }

  function finish(result, sc, marks) {
    save({ result, ...sc }, marks);
    setScore({ result, ...sc });
    setStage("result");
  }

  if (stage === "letters") {
    return (
      <Quiz
        key={stage}
        title="1. Пиньинь — ямар авиа вэ?"
        questions={letterQs}
        field="sound"
        show={(l) => l.ch}
        onDone={(right) => {
          const sc = { letters: { correct: right.length, total: LETTER_N } };
          if (right.length >= LETTER_PASS) {
            save({ result: "words", pending: true, ...sc }, { allLetters: true });
            setScore(sc);
            setStage("words");
          } else finish("letters", sc, { letters: right });
        }}
      />
    );
  }

  if (stage === "words") {
    return (
      <Quiz
        key={stage}
        title="2. Энгийн үг — утга нь юу вэ?"
        questions={wordQs}
        field="mn"
        show={(w) => w.ko}
        onDone={(right) => {
          const sc = { ...score, words: { correct: right.length, total: WORD_N } };
          const pass = right.length >= WORD_PASS;
          finish(pass ? "topik" : "words", sc, { allLetters: true, words: right, allWords: pass });
        }}
      />
    );
  }

  const MSG = {
    letters: ["Пиньинээс эхэлнэ", "Пиньинь, 4 аялгууг сонсож, давтаж сурна. Мэддэгийг чинь аль хэдийн тэмдэглэсэн."],
    words: ["Пиньинээ мэдэж байна — үгээс эхэлнэ", "Анхан шатны үгсийг сурна. Тестэд зөв хариулсан үгсийг «мэднэ» гэж тэмдэглэсэн."],
    topik: ["Анхан шатыг давсан!", "Дараагийн алхам: HSK оношлох тест — сонсгол, унших, дүрмээс хаана сул байгааг тодорхойлно."],
  }[score.result];

  return (
    <Shell>
      <h2 className="text-2xl font-bold">Тестийн дүн</h2>
      <Card className="mt-5 space-y-4">
        {score.letters && <Row label="Пиньинь" s={score.letters} />}
        {score.words && <Row label="Энгийн үг" s={score.words} />}
        {!score.letters && <p className="text-sm text-muted">Тест өгөөгүй — эхнээс нь эхэлнэ.</p>}
      </Card>
      <Card className="mt-3">
        <p className="font-semibold">{MSG[0]}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{MSG[1]}</p>
      </Card>
      <div className="flex-1" />
      <Button className="mt-6 w-full" onClick={() => onDone(score.result)}>
        {score.result === "topik" ? "Оношлох тест рүү" : "Суралцаж эхлэх"}
      </Button>
    </Shell>
  );
}

function Row({ label, s }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted">{s.correct}/{s.total}</span>
      </div>
      <Bar value={(s.correct / s.total) * 100} tone="vocab" />
    </div>
  );
}

function Choice({ title, note, onClick }) {
  return (
    <button onClick={onClick} className="w-full rounded-2xl border border-line bg-surface p-4 text-left transition hover:bg-line">
      <div className="font-semibold">{title}</div>
      <div className="mt-0.5 text-sm text-muted">{note}</div>
    </button>
  );
}
