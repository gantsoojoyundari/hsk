import { useMemo, useState } from "react";
import sentences from "../data/sentences.json";
import { useStore, update, markTask, recordAttempt } from "../lib/store.js";
import { today } from "../lib/dates.js";
import { playClips } from "../lib/sound.js";
import { Page, Card, Button, Bar, Bow, Ko, useAutoNext, cx } from "../components/ui.jsx";

// Өгүүлбэр зохиох: монгол утгыг хараад хятад үгсийг зөв дараалалд тавина.
const SESSION = 5;
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);

export default function Sentences() {
  const [round, setRound] = useState(0);
  return <SentencesRound key={round} onAgain={() => setRound((r) => r + 1)} />;
}

function SentencesRound({ onAgain }) {
  const done = useStore((s) => s.sentences ?? {});
  // Цөөн удаа зөв хийсэн өгүүлбэрүүдийг түрүүлж (санамсаргүй дарааллаар).
  const set = useMemo(
    () => shuffle(sentences).sort((a, b) => (done[a.id] ?? 0) - (done[b.id] ?? 0)).slice(0, SESSION),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  if (finished) {
    return (
      <Page title="Өгүүлбэр зохиох" back="#/practice">
        <Card className="py-8 text-center">
          <Bow className="mx-auto w-16" />
          <p className="mt-3 text-4xl font-bold tabular-nums">{score}/{set.length}</p>
          <p className="mt-1 text-sm text-muted">анхны оролдлогоор зөв</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" onClick={() => (location.hash = "#/")}>Дуусгах</Button>
            <Button onClick={onAgain}>Дахиад хийх ↻</Button>
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Өгүүлбэр зохиох" back="#/practice">
      <div className="mb-2 text-sm tabular-nums text-muted">{i + 1} / {set.length}</div>
      <Bar value={(i / set.length) * 100} tone="writing" />
      <Builder
        key={set[i].id}
        item={set[i]}
        onDone={(firstTry) => {
          const nextScore = score + (firstTry ? 1 : 0);
          setScore(nextScore);
          if (firstTry) update((s) => { (s.sentences ??= {})[set[i].id] = (s.sentences[set[i].id] ?? 0) + 1; });
          if (i + 1 < set.length) setI(i + 1);
          else {
            recordAttempt("writing", nextScore, set.length, "sentence");
            markTask(`${today()}:sentence`);
            setFinished(true);
          }
        }}
      />
    </Page>
  );
}

function Builder({ item, onDone }) {
  const tiles = useMemo(() => {
    let t = shuffle(item.words.map((w, k) => ({ w, k })));
    // Аль хэдийн зөв дараалалтай байвал дахин холино.
    if (t.length > 1 && t.every((x, n) => x.k === n)) t = [...t.slice(1), t[0]];
    return t;
  }, [item]);
  const [picked, setPicked] = useState([]);
  const [result, setResult] = useState(null); // null | "ok" | "bad"
  const [tries, setTries] = useState(0);
  const say = () => playClips([`sentence/${item.id}`], item.ko);

  const built = picked.map((k) => tiles.find((t) => t.k === k).w).join("");
  const target = item.words.join("");

  // Зөв бол өгүүлбэрийг сонсгоод өөрөө дараагийнх руу.
  useAutoNext(result === "ok", () => onDone(tries === 1), 2200);

  function check() {
    const ok = built === target;
    setResult(ok ? "ok" : "bad");
    setTries((t) => t + 1);
    if (ok) say();
  }

  return (
    <div className="mt-4 space-y-4">
      <Card className="relative">
        <Bow className="absolute -right-2 -top-3 w-10 rotate-12" />
        <p className="text-sm text-muted">Хятадаар бүтээ:</p>
        <p className="mt-1 text-xl font-semibold">{item.mn}</p>
      </Card>

      {/* Бүтээж буй өгүүлбэр — үг дээр дарвал буцаана */}
      <div
        className={cx(
          "flex min-h-20 flex-wrap content-start gap-2 rounded-2xl border-2 border-dashed p-3",
          result === "ok" ? "border-good bg-writing-soft" : result === "bad" ? "border-bad bg-reading-soft" : "border-line",
        )}
      >
        {picked.length === 0 && <span className="self-center text-sm text-muted">Доорх үгсээс дарааллаар нь сонго</span>}
        {picked.map((k) => (
          <button
            key={k}
            disabled={result === "ok"}
            onClick={() => {
              setPicked(picked.filter((x) => x !== k));
              setResult(null);
            }}
            className="rounded-xl border border-line bg-surface px-3 py-2 text-lg"
          >
            <Ko text={tiles.find((t) => t.k === k).w} />
          </button>
        ))}
      </div>

      {/* Сонгох үгс */}
      <div className="flex flex-wrap gap-2">
        {tiles.map((t) => {
          const used = picked.includes(t.k);
          return (
            <button
              key={t.k}
              disabled={used || result === "ok"}
              onClick={() => {
                setPicked([...picked, t.k]);
                setResult(null);
              }}
              className={cx("rounded-xl border px-3 py-2 text-lg", used ? "border-line opacity-25" : "border-accent bg-surface hover:bg-listening-soft")}
            >
              <Ko text={t.w} />
            </button>
          );
        })}
      </div>

      {result === "bad" && (
        <p className="text-sm font-medium text-bad">
          Дараалал буруу байна. Хятад хэлэнд дараалал: <b>хэн — хэзээ — хаана — юу хийх</b> (үйл үг тусагдахууныхаа өмнө) — дахин оролдоорой.
          {tries >= 2 && (
            <span className="mt-2 block text-ink">
              Зөв хариу: <Ko text={item.ko} className="align-top" />
            </span>
          )}
        </p>
      )}
      {result === "ok" && (
        <div className="flex items-center justify-between rounded-2xl bg-writing-soft p-3">
          <span className="font-medium text-good">Зөв! 🎀</span>
          <button onClick={say} className="text-sm text-writing">🔊 Дахин сонсох</button>
        </div>
      )}

      {result === "ok" ? null : (
        <Button className="w-full" disabled={picked.length !== tiles.length} onClick={check}>Шалгах</Button>
      )}
    </div>
  );
}
