import { useEffect, useMemo, useState } from "react";
import hangul from "../data/pinyin.json";
import { useStore, update, markTask } from "../lib/store.js";
import { today } from "../lib/dates.js";
import { playClips } from "../lib/sound.js";
import { Page, Card, Button, Bar, Bow, Ko, useAutoNext, cx } from "../components/ui.jsx";

// Пиньинь (дуудлагын үсэг) + аялгуу: харж, сонсож сурна → дасгалаар баталгаажуулна. 2 удаа зөв = сурсан.
// Хадгалалтын түлхүүр нь хуучнаараа `state.hangul` (topik-sprint-ээс уламжилсан бүтэц).
export const LEARNED = 2;
const SESSION = 10;

export function pinyinProgress(scores = {}) {
  const learned = hangul.letters.filter((l) => (scores[l.id] ?? 0) >= LEARNED).length;
  return { learned, total: hangul.letters.length, done: learned === hangul.letters.length };
}

const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
const sayLetter = (l) => playClips([`pinyin/${l.id}`], l.say);

export default function Pinyin() {
  const [mode, setMode] = useState("learn");
  const [open, setOpen] = useState(null);
  const [round, setRound] = useState(0);
  const scores = useStore((s) => s.hangul ?? {});
  const p = pinyinProgress(scores);

  if (mode === "quiz") return <Quiz key={round} onExit={() => setMode("learn")} onAgain={() => setRound((r) => r + 1)} />;

  return (
    <Page title="Пиньинь ба аялгуу" back="#/practice">
      <Card className="relative">
        <Bow className="absolute -right-2 -top-3 w-10 rotate-12" />
        <p className="text-sm leading-relaxed">
          Хятад үгийг латин үсгээр бичдэг дуудлагын систем — <b>пиньинь</b>. Гийгүүлэгч, эгшиг, 4 аялгууг сурвал ямар ч үгийг уншиж чадна. Дээр нь дарж <b>сонсоорой</b>, дараа нь дасгал хий. 2 удаа зөв таавал «сурсан» болно.
        </p>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-muted">Сурсан</span>
          <span className="font-semibold tabular-nums">{p.learned}/{p.total}</span>
        </div>
        <Bar value={(p.learned / p.total) * 100} tone="vocab" />
        <Button className="mt-4 w-full" onClick={() => setMode("quiz")}>
          {p.learned < p.total ? "Шинэ дуудлага сурах → шалгалт" : "Давтах шалгалт"}
        </Button>
      </Card>

      {hangul.groups.map((g) => (
        <section key={g.id} className="mt-5">
          <h2 className="mb-2 text-sm font-semibold text-muted">{g.title}</h2>
          <div className="grid grid-cols-5 gap-2">
            {hangul.letters
              .filter((l) => l.group === g.id)
              .map((l) => {
                const ok = (scores[l.id] ?? 0) >= LEARNED;
                return (
                  <button
                    key={l.id}
                    onClick={() => {
                      setOpen(l.id === open ? null : l.id);
                      sayLetter(l);
                    }}
                    className={cx(
                      "flex aspect-square flex-col items-center justify-center rounded-2xl border text-center transition",
                      open === l.id ? "border-accent bg-listening-soft" : ok ? "border-vocab bg-vocab-soft" : "border-line bg-surface hover:bg-line",
                    )}
                  >
                    <span className="text-2xl font-bold">{l.ch}</span>
                    <span className="text-[11px] text-muted">{l.sound.split(" (")[0]}</span>
                  </button>
                );
              })}
          </div>
          {hangul.letters
            .filter((l) => l.group === g.id && l.id === open)
            .map((l) => (
              <Card key={l.id} className="mt-2 flex items-center gap-4">
                <span className="text-5xl font-bold">{l.ch}</span>
                <div className="min-w-0 flex-1 text-sm">
                  <p>
                    Дуудлага: <b>{l.sound}</b>
                  </p>
                  <button onClick={() => playClips([`pinyin/${l.id}-ex`], l.ex_ko)} className="mt-2 flex items-center gap-2 text-left">
                    <span>🔊</span>
                    <Ko text={l.ex_ko} className="text-base font-semibold" />
                    <span className="text-muted">— {l.ex_mn}</span>
                  </button>
                </div>
                <button onClick={() => sayLetter(l)} className="rounded-full p-2 text-xl hover:bg-line" aria-label="Дахин сонсох">🔊</button>
              </Card>
            ))}
        </section>
      ))}
    </Page>
  );
}

/**
 * Эхлээд заана, дараа нь шалгана: үзээгүй (hangul-д түлхүүргүй) үсгээс дарааллаар нь 5-ыг заагаад,
 * шалгалтад зөвхөн заасан/өмнө нь үзсэн үсгүүд орно — сул үсгүүд түрүүлж.
 */
const TEACH = 5;
function plan(scores) {
  const teach = hangul.letters.filter((l) => scores[l.id] === undefined).slice(0, TEACH);
  const seen = hangul.letters.filter((l) => scores[l.id] !== undefined);
  const review = shuffle(seen)
    .sort((a, b) => (scores[a.id] ?? 0) - (scores[b.id] ?? 0))
    .slice(0, Math.max(0, SESSION - teach.length * 1));
  return { teach, quiz: shuffle([...teach, ...review]).slice(0, SESSION) };
}

function makeQuestion(letter, i, known) {
  // Ээлжлэн: (1) үсэг харж дуудлага сонгох, (2) сонсоод үсэг сонгох.
  const listen = i % 2 === 1;
  // Хариултын хувилбарууд нь аль болох заасан үсгүүдээс (заагаагүй үсэг төөрөгдүүлэхгүй).
  const ok = (l) => l.id !== letter.id && l.sound !== letter.sound;
  const pool = known.filter(ok).length >= 3 ? known.filter(ok) : hangul.letters.filter(ok);
  const others = shuffle(pool).slice(0, 3);
  return { letter, listen, options: shuffle([letter, ...others]) };
}

function Quiz({ onExit, onAgain }) {
  const scores0 = useStore((s) => s.hangul ?? {});
  const p = useMemo(() => plan(scores0), []); // eslint-disable-line react-hooks/exhaustive-deps
  const questions = useMemo(() => {
    const known = hangul.letters.filter((l) => scores0[l.id] !== undefined || p.teach.includes(l));
    return p.quiz.map((l, i) => makeQuestion(l, i, known));
  }, [p]); // eslint-disable-line react-hooks/exhaustive-deps
  const [teachI, setTeachI] = useState(p.teach.length ? 0 : -1);
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const q = questions[i];

  useAutoNext(teachI < 0 && !!chosen && chosen === q?.letter.id, () => next(), 1100);

  function choose(opt) {
    if (chosen) return;
    setChosen(opt.id);
    const ok = opt.id === q.letter.id;
    if (ok) setCorrect((c) => c + 1);
    sayLetter(q.letter);
    update((s) => {
      s.hangul ??= {};
      const v = s.hangul[q.letter.id] ?? 0;
      s.hangul[q.letter.id] = ok ? v + 1 : Math.max(0, v - 1);
    });
  }

  function next() {
    if (i + 1 < questions.length) {
      setI(i + 1);
      setChosen(null);
      if (questions[i + 1].listen) sayLetter(questions[i + 1].letter);
    } else {
      markTask(`${today()}:hangul`);
      setFinished(true);
    }
  }

  if (teachI >= 0) {
    return (
      <Teach
        letter={p.teach[teachI]}
        n={teachI}
        total={p.teach.length}
        onNext={() => {
          const l = p.teach[teachI];
          update((s) => {
            s.hangul ??= {};
            s.hangul[l.id] ??= 0; // «үзсэн» — одооноос шалгалтад орно
          });
          if (teachI + 1 < p.teach.length) setTeachI(teachI + 1);
          else {
            setTeachI(-1);
            if (questions[0]?.listen) sayLetter(questions[0].letter);
          }
        }}
        onExit={onExit}
      />
    );
  }

  if (finished) {
    return (
      <Page title="Пиньинь">
        <Card className="py-8 text-center">
          <Bow className="mx-auto w-16" />
          <p className="mt-3 text-4xl font-bold tabular-nums">{correct}/{questions.length}</p>
          <p className="mt-1 text-sm text-muted">зөв хариулсан</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" onClick={onExit}>Дуусгах</Button>
            <Button onClick={onAgain}>Дахиад хийх ↻</Button>
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Пиньинийн дасгал" action={<button className="text-sm text-muted" onClick={onExit}>Хаах</button>}>
      <div className="mb-2 text-sm tabular-nums text-muted">{i + 1} / {questions.length}</div>
      <Bar value={((i + (chosen ? 1 : 0)) / questions.length) * 100} tone="vocab" />
      <Card className="relative mt-4 py-8 text-center">
        <Bow className="absolute -right-2 -top-3 w-10 rotate-12" />
        {q.listen ? (
          <>
            <p className="text-sm text-muted">Сонсоод аль пиньинь болохыг сонго</p>
            <button onClick={() => sayLetter(q.letter)} className="mx-auto mt-3 grid size-20 place-items-center rounded-full bg-accent text-3xl text-white">
              🔊
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">Энэ пиньинь хэрхэн дуудагдах вэ?</p>
            <p className="mt-2 text-7xl font-bold">{q.letter.ch}</p>
          </>
        )}
      </Card>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {q.options.map((o) => {
          const isAns = chosen && o.id === q.letter.id;
          const isWrong = chosen === o.id && o.id !== q.letter.id;
          return (
            <button
              key={o.id}
              onClick={() => choose(o)}
              className={cx(
                "min-h-16 rounded-2xl border text-lg font-semibold",
                isAns ? "border-good bg-writing-soft" : isWrong ? "border-bad bg-reading-soft" : "border-line bg-surface hover:bg-line",
              )}
            >
              {q.listen ? <span className="text-3xl">{o.ch}</span> : o.sound}
            </button>
          );
        })}
      </div>
      {chosen && (
        <div className="mt-3 space-y-2">
          <p className={cx("text-sm font-medium", chosen === q.letter.id ? "text-good" : "text-bad")}>
            {chosen === q.letter.id ? "Зөв!" : `Буруу — «${q.letter.ch}» нь «${q.letter.sound}» гэж дуудагдана`}
          </p>
          {chosen !== q.letter.id && <Button className="w-full" onClick={next}>{i + 1 < questions.length ? "Дараах" : "Дүн харах"}</Button>}
        </div>
      )}
    </Page>
  );
}

/** Нэг үсгийг заах карт: том үсэг, дуудлага, жишээ үг — дуу нь өөрөө тоглоно. */
function Teach({ letter, n, total, onNext, onExit }) {
  useEffect(() => {
    playClips([`pinyin/${letter.id}`, `pinyin/${letter.id}-ex`], `${letter.say}. ${letter.ex_ko}`);
  }, [letter.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Page title="Шинэ дуудлага" action={<button className="text-sm text-muted" onClick={onExit}>Хаах</button>}>
      <div className="mb-2 text-sm tabular-nums text-muted">Шинэ {n + 1} / {total} — дараа нь шалгалт</div>
      <Bar value={((n + 1) / total) * 100} tone="vocab" />
      <Card className="relative mt-4 py-8 text-center">
        <Bow className="absolute -right-2 -top-3 w-10 rotate-12" />
        <p className="text-8xl font-bold">{letter.ch}</p>
        <p className="mt-3 text-lg">
          Дуудлага: <b>{letter.sound}</b>
        </p>
        <div className="mx-auto mt-5 w-fit rounded-2xl bg-bg px-4 py-3">
          <p className="text-xs text-muted">Жишээ үг</p>
          <Ko text={letter.ex_ko} className="items-center text-2xl font-semibold" galigClassName="text-sm" />
          <p className="text-sm text-muted">{letter.ex_mn}</p>
        </div>
      </Card>
      <div className="mt-3 flex justify-center">
        <button
          onClick={() => playClips([`pinyin/${letter.id}`, `pinyin/${letter.id}-ex`], `${letter.say}. ${letter.ex_ko}`)}
          className="rounded-full px-4 py-2 text-sm text-vocab hover:bg-vocab-soft"
        >
          🔊 Дахин сонсох
        </button>
      </div>
      <Button className="mt-3 w-full" onClick={onNext}>{n + 1 < total ? "Ойлголоо → дараагийнх" : "Ойлголоо → шалгалт эхлэх"}</Button>
    </Page>
  );
}
