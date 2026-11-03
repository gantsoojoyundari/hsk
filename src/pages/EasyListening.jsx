import { useEffect, useMemo, useState } from "react";
import vocab from "../data/vocab.json";
import sentences from "../data/sentences.json";
import { useStore, markTask, recordAttempt } from "../lib/store.js";
import { today } from "../lib/dates.js";
import { playClips } from "../lib/sound.js";
import { Page, Card, Button, Bar, Bow, Ko, useAutoNext, cx } from "../components/ui.jsx";

// Эхлэгчийн сонсгол: энгийн үг / богино өгүүлбэр сонсоод монгол утгыг нь сонгоно.
// Эхэлж сурсан (SRS-д орсон) үгсээс асууна; хангалттай биш бол анхан шатны үгсээс нөхнө.
const SESSION = 10;
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
const basics = vocab.words.filter((w) => w.topic === "basic");

function buildSet(srs) {
  // Зөвхөн аль хэдийн заасан үгсээс асууна. Өгүүлбэр нь 60 үг сурсны дараа л орно.
  const seen = basics.filter((w) => srs[w.id]);
  const withSentences = seen.length >= 60;
  const words = shuffle(seen.length >= 4 ? seen : basics.slice(0, 10)).slice(0, withSentences ? 7 : SESSION);
  const qs = words.map((w) => ({ id: w.id, clip: `vocab/${w.id}`, ko: w.ko, mn: w.mn, pool: (seen.length >= 4 ? seen : basics).map((b) => b.mn) }));
  for (const s of withSentences ? shuffle(sentences).slice(0, SESSION - qs.length) : []) {
    qs.push({ id: s.id, clip: `sentence/${s.id}`, ko: s.ko, mn: s.mn, pool: sentences.map((x) => x.mn) });
  }
  return shuffle(qs).map((q) => ({ ...q, options: shuffle([q.mn, ...shuffle(q.pool.filter((m) => m !== q.mn)).slice(0, 3)]) }));
}

export default function EasyListening() {
  const [round, setRound] = useState(0);
  return <EasyListeningRound key={round} onAgain={() => setRound((r) => r + 1)} />;
}

function EasyListeningRound({ onAgain }) {
  const srs = useStore((s) => s.srs);
  const set = useMemo(() => buildSet(srs), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const q = set[i];
  const say = () => playClips([q.clip], q.ko);

  // Асуулт гармагц нэг удаа өөрөө уншина.
  useEffect(() => {
    if (!finished) {
      const t = setTimeout(say, 250);
      return () => clearTimeout(t);
    }
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  useAutoNext(!finished && !!chosen && chosen === q.mn, () => next(), 1300);

  function choose(o) {
    if (chosen) return;
    setChosen(o);
    if (o === q.mn) setScore((s) => s + 1);
  }

  function next() {
    if (i + 1 < set.length) {
      setI(i + 1);
      setChosen(null);
    } else {
      recordAttempt("listening", score, set.length, "easy-listening");
      markTask(`${today()}:listening`);
      setFinished(true);
    }
  }

  if (finished) {
    return (
      <Page title="Энгийн сонсгол" back="#/listening">
        <Card className="py-8 text-center">
          <Bow className="mx-auto w-16" />
          <p className="mt-3 text-4xl font-bold tabular-nums">{score}/{set.length}</p>
          <p className="mt-1 text-sm text-muted">зөв сонссон</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" onClick={() => (location.hash = "#/")}>Дуусгах</Button>
            <Button onClick={onAgain}>Дахиад хийх ↻</Button>
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Энгийн сонсгол" back="#/listening">
      <div className="mb-2 text-sm tabular-nums text-muted">{i + 1} / {set.length}</div>
      <Bar value={((i + (chosen ? 1 : 0)) / set.length) * 100} tone="listening" />
      <Card className="relative mt-4 py-7 text-center">
        <Bow className="absolute -right-2 -top-3 w-10 rotate-12" />
        <p className="text-sm text-muted">Сонсоод утгыг нь сонго</p>
        <button onClick={say} className="mx-auto mt-3 grid size-20 place-items-center rounded-full bg-accent text-3xl text-white" aria-label="Дахин сонсох">
          🔊
        </button>
        <p className="mt-2 text-xs text-muted">Дахин сонсох бол дар</p>
        {chosen && <Ko text={q.ko} className="mt-4 items-center text-2xl font-bold" galigClassName="text-base" />}
      </Card>
      <div className="mt-3 grid gap-2">
        {q.options.map((o) => (
          <button
            key={o}
            onClick={() => choose(o)}
            className={cx(
              "min-h-12 rounded-xl border px-3 text-left",
              chosen && o === q.mn ? "border-good bg-writing-soft" : chosen === o ? "border-bad bg-reading-soft" : "border-line bg-surface hover:bg-line",
            )}
          >
            {o}
          </button>
        ))}
      </div>
      {chosen && (
        <div className="mt-3 space-y-2">
          <p className={cx("text-sm font-medium", chosen === q.mn ? "text-good" : "text-bad")}>
            {chosen === q.mn ? "Зөв! 🎀" : `Буруу — зөв нь «${q.mn}»`}
          </p>
          {chosen !== q.mn && <Button className="w-full" onClick={next}>{i + 1 < set.length ? "Дараах" : "Дүн харах"}</Button>}
        </div>
      )}
    </Page>
  );
}
