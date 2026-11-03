import { useState } from "react";
import { recordAttempt, recordMistake, resolveMistake, markTask } from "../lib/store.js";
import { today } from "../lib/dates.js";
import { Question } from "./Question.jsx";
import { Button, Bar, Card, Clock, Bow, useCountdown, useAutoNext, TONE, cx } from "./ui.jsx";

/**
 * Асуултын багц: нэг нэгээр, сонгомогц тайлбар. Дууссаны дараа attempts + алдааны дэвтэрт бичнэ.
 * secondsPerItem өгвөл хугацаатай (уншлага: 70 мин / 50 асуулт ≈ 84 сек).
 */
// task: өнөөдрийн төлөвлөгөөний аль даалгаврыг биелүүлэх вэ (анхдагч нь kind).
export function PracticeSet({ items, section, kind, task = kind, onExit, secondsPerItem, maxPlays }) {
  const [i, setI] = useState(0);
  const [results, setResults] = useState([]);
  const [finished, setFinished] = useState(false);
  const timed = !!secondsPerItem;
  const left = useCountdown(timed ? Math.round(secondsPerItem * items.length) : 0, () => finish(results), timed && !finished);
  const item = items[i];
  const answered = results[i] != null;

  function finish(res) {
    if (finished) return;
    const correct = res.filter((r) => r?.correct).length;
    recordAttempt(section, correct, items.length, kind);
    // Зүгээр дарснаар биш — асуултын талаас доошгүйг хариулсан үед л даалгавар биелсэнд тооцно.
    const answeredCount = res.filter(Boolean).length;
    if (answeredCount >= Math.ceil(items.length / 2)) markTask(`${today()}:${task}`);
    setFinished(true);
  }

  const goNext = () => (i + 1 < items.length ? setI(i + 1) : finish(results));
  useAutoNext(!finished && results[i]?.correct === true, goNext, 1200);

  function choose(c, ok) {
    const next = [...results];
    next[i] = { chosen: c, correct: ok };
    setResults(next);
    const key = `${kind}:${item.id}`;
    if (ok) resolveMistake(key);
    else recordMistake(kind, item.id, c);
  }

  if (finished) {
    const correct = results.filter((r) => r?.correct).length;
    return (
      <Card className="py-8 text-center">
        <p className={cx("text-5xl font-bold tabular-nums", TONE[section].text)}>
          {correct}/{items.length}
        </p>
        <p className="mt-2 text-muted">
          {correct === items.length ? "Бүгд зөв!" : `${items.length - correct} алдаа алдааны дэвтэрт хадгалагдлаа.`}
        </p>
        <Button className="mt-6" onClick={onExit}>Дуусгах</Button>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm text-muted">
        <span className="tabular-nums">
          {i + 1} / {items.length}
        </span>
        {timed && <Clock seconds={left} />}
      </div>
      <Bar value={((i + (answered ? 1 : 0)) / items.length) * 100} tone={section} />
      <div className="relative mt-4 rounded-2xl border border-line bg-surface p-4">
        <Bow className="absolute -right-2 -top-3 w-10 rotate-12" />
        <Question key={item.id} item={item} mode="practice" onChoose={choose} maxPlays={maxPlays} />
      </div>
      {results[i]?.correct !== true && (
        <Button className="mt-5 w-full" disabled={!answered} onClick={goNext}>
          {i + 1 < items.length ? "Дараах" : "Дүн харах"}
        </Button>
      )}
    </div>
  );
}

/** Асуултын төрлөөр шүүх товчлуурууд. */
export function TypeFilter({ types, items, value, onChange, section }) {
  const count = (t) => items.filter((x) => t === "all" || x.type === t).length;
  return (
    <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {[["all", "Бүгд"], ...Object.entries(types)].map(([k, label]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={cx(
            "shrink-0 rounded-full border px-3 py-1.5 text-sm",
            value === k ? `${TONE[section].bg} border-transparent text-white` : "border-line bg-surface",
          )}
        >
          {label} <span className="opacity-70">{count(k)}</span>
        </button>
      ))}
    </div>
  );
}
