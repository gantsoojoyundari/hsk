import { useEffect, useMemo, useState } from "react";
import vocab from "../data/vocab.json";
import { update } from "../lib/store.js";
import { review, NEW_CARD } from "../lib/srs.js";
import { today } from "../lib/dates.js";
import { playClips } from "../lib/sound.js";
import { Page, Card, Button, Bar, Bow, Ko, useAutoNext, cx } from "./ui.jsx";

// Үгийн шалгалт: давталтын дараа / өдрийн эцэст. «Санасан» гэж дарсан ч энд алдвал
// тэр үгийг SRS-д «again» болгож өнөөдрийн давталтад буцааж оруулна.
const byId = Object.fromEntries(vocab.words.map((w) => [w.id, w]));
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
export const QUIZ_MAX = 10;

function build(ids) {
  return shuffle(ids.filter((id) => byId[id]))
    .slice(0, QUIZ_MAX)
    .map((id, i) => {
      const w = byId[id];
      const same = vocab.words.filter((x) => x.id !== id && x.mn !== w.mn && x.topic === w.topic);
      const pool = same.length >= 3 ? same : vocab.words.filter((x) => x.id !== id && x.mn !== w.mn);
      return { w, listen: i % 2 === 1, options: shuffle([w.mn, ...shuffle(pool).slice(0, 3).map((x) => x.mn)]) };
    });
}

function QuizRound({ ids, title, onDone }) {
  const qs = useMemo(() => build(ids), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [wrong, setWrong] = useState([]);
  const [finished, setFinished] = useState(false);
  const q = qs[i];
  const say = () => q && playClips([`vocab/${q.w.id}`], q.w.ko);

  useEffect(() => {
    if (q?.listen && !finished) {
      const t = setTimeout(say, 250);
      return () => clearTimeout(t);
    }
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  useAutoNext(!!chosen && chosen === q?.w.mn, () => next(), 1100);

  function choose(o) {
    if (chosen) return;
    setChosen(o);
    if (!q.listen) say();
    if (o !== q.w.mn) {
      setWrong((x) => [...x, q.w]);
      const date = today();
      update((s) => {
        s.srs[q.w.id] = review(s.srs[q.w.id] ?? NEW_CARD, "again", date);
      });
    }
  }

  function next() {
    if (i + 1 < qs.length) {
      setI(i + 1);
      setChosen(null);
    } else {
      setFinished(true);
      onDone(wrong, qs.length);
    }
  }

  if (finished) return null;

  return (
    <Page title={title}>
      <div className="mb-2 text-sm tabular-nums text-muted">{i + 1} / {qs.length}</div>
      <Bar value={((i + (chosen ? 1 : 0)) / qs.length) * 100} tone="vocab" />
      <Card className="relative mt-4 py-7 text-center">
        <Bow className="absolute -right-2 -top-3 w-10 rotate-12" />
        {q.listen && !chosen ? (
          <>
            <p className="text-sm text-muted">Сонсоод утгыг нь сонго</p>
            <button onClick={say} className="mx-auto mt-3 grid size-20 place-items-center rounded-full bg-accent text-3xl text-white" aria-label="Дахин сонсох">🔊</button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">Энэ үгийн утга юу вэ?</p>
            <Ko text={q.w.ko} className="mt-2 items-center text-4xl font-bold" galigClassName="text-base" />
          </>
        )}
      </Card>
      <div className="mt-3 grid gap-2">
        {q.options.map((o) => (
          <button
            key={o}
            onClick={() => choose(o)}
            className={cx(
              "min-h-12 rounded-xl border px-3 text-left",
              chosen && o === q.w.mn ? "border-good bg-writing-soft" : chosen === o ? "border-bad bg-reading-soft" : "border-line bg-surface hover:bg-line",
            )}
          >
            {o}
          </button>
        ))}
      </div>
      {chosen && (
        <div className="mt-3 space-y-2">
          <p className={cx("text-sm font-medium", chosen === q.w.mn ? "text-good" : "text-bad")}>
            {chosen === q.w.mn ? "Зөв! 🎀" : `Буруу — зөв нь «${q.w.mn}». Энэ үгийг дахин давтлагад нэмлээ.`}
          </p>
          {chosen !== q.w.mn && <Button className="w-full" onClick={next}>{i + 1 < qs.length ? "Дараах" : "Дүн харах"}</Button>}
        </div>
      )}
    </Page>
  );
}

/**
 * Шалгалт → дүнг тэр чигээр нь хүлээж авна → алдсан үгс дээрээ ажиллана:
 * алдсан үг бүрийг дахин заагаад, зөвхөн тэдгээрээр дахин шалгана — бүгд зөв болтол.
 */
export function WordQuiz({ ids, title = "Шалгалт", onFinish, onAgain }) {
  const valid = useMemo(() => ids.filter((id) => byId[id]), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [phase, setPhase] = useState("test"); // test | result | teach | retest | fixed
  const [first, setFirst] = useState(null); // { score, total, wrong }
  const [todo, setTodo] = useState([]);
  const [t, setT] = useState(0);
  const [round, setRound] = useState(0);
  const finish = () => onFinish(first.score, first.total, first.wrong);
  const again = () => onAgain(first.score, first.total, first.wrong);

  if (!valid.length) {
    return (
      <Page title={title} back="#/">
        <Card className="py-8 text-center">
          <p className="font-semibold">Шалгах үг алга байна</p>
          <p className="mt-1 text-sm text-muted">Эхлээд өнөөдрийн үгээ давтаарай.</p>
          <Button className="mt-6" onClick={() => (location.hash = "#/vocab")}>Үг давтах</Button>
        </Card>
      </Page>
    );
  }

  if (phase === "test" || phase === "retest") {
    return (
      <QuizRound
        key={`${phase}-${round}`}
        ids={phase === "test" ? valid : todo.map((w) => w.id)}
        title={phase === "test" ? title : `Алдсан үгсийн шалгалт (${todo.length})`}
        onDone={(wrong, total) => {
          if (phase === "test") {
            setFirst({ score: total - wrong.length, total, wrong });
            setTodo(wrong);
            setPhase("result");
          } else if (wrong.length) {
            setTodo(wrong);
            setT(0);
            setRound((r) => r + 1);
            setPhase("teach");
          } else setPhase("fixed");
        }}
      />
    );
  }

  if (phase === "teach") return <TeachWord key={todo[t].id} w={todo[t]} n={t} total={todo.length} onNext={() => (t + 1 < todo.length ? setT(t + 1) : setPhase("retest"))} />;

  const fixed = phase === "fixed";
  return (
    <Page title={title}>
      <Card className="py-8 text-center">
        <Bow className="mx-auto w-16" />
        {fixed ? (
          <>
            <p className="mt-3 text-xl font-bold">Алдсан бүх үгээ заслаа! 🎀</p>
            <p className="mt-1 text-sm text-muted">Шалгалтын дүн: {first.score}/{first.total}</p>
          </>
        ) : (
          <>
            <p className="mt-3 text-4xl font-bold tabular-nums">{first.score}/{first.total}</p>
            <p className="mt-1 text-sm text-muted">{first.wrong.length ? "Дүнг хадгаллаа. Одоо алдсан үгс дээрээ ажиллая." : "Бүгдийг зөв! Гайхалтай 🎀"}</p>
          </>
        )}
        {!fixed && first.wrong.length > 0 && (
          <>
            <div className="mt-5 rounded-2xl bg-bg p-3 text-left">
              <p className="text-sm font-medium">Алдсан үгс:</p>
              <ul className="mt-2 space-y-1">
                {first.wrong.map((w) => (
                  <li key={w.id} className="flex items-baseline gap-2">
                    <Ko text={w.ko} className="font-semibold" />
                    <span className="text-sm text-muted">— {w.mn}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Button className="mt-6 w-full" onClick={() => setPhase("teach")}>
              Алдсан {first.wrong.length} үг дээрээ ажиллах →
            </Button>
            <button className="mt-3 text-sm text-muted hover:underline" onClick={finish}>Дараа хийнэ</button>
          </>
        )}
        {(fixed || !first.wrong.length) && (
          <div className="mt-6 flex justify-center gap-2">
            <Button variant={onAgain ? "outline" : "primary"} onClick={finish}>{onAgain ? "Дуусгах" : "Үргэлжлүүлэх"}</Button>
            {onAgain && <Button onClick={again}>Дахиад 10 ↻</Button>}
          </div>
        )}
      </Card>
    </Page>
  );
}

/** Алдсан үгийг дахин заах карт — үг, галиг, утга, жишээ; дуу нь өөрөө тоглоно. */
function TeachWord({ w, n, total, onNext }) {
  const say = () => playClips([`vocab/${w.id}`, `vocab/${w.id}-ex`], `${w.ko}. ${w.ex_ko}`);
  useEffect(say, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Page title="Алдсан үгээ дахин үзэх">
      <div className="mb-2 text-sm tabular-nums text-muted">{n + 1} / {total} — дараа нь дахин шалгана</div>
      <Bar value={((n + 1) / total) * 100} tone="vocab" />
      <Card className="relative mt-4 py-8 text-center">
        <Bow className="absolute -right-2 -top-3 w-10 rotate-12" />
        <Ko text={w.ko} className="items-center text-4xl font-bold" galigClassName="mt-1 text-lg" />
        <p className="mt-4 text-xl font-semibold">{w.mn}</p>
        <div className="mx-4 mt-5 rounded-2xl bg-bg p-3 text-left">
          <Ko text={w.ex_ko} className="leading-relaxed" galigClassName="text-sm" />
          <p className="mt-1 text-sm text-muted">{w.ex_mn}</p>
        </div>
      </Card>
      <div className="mt-3 flex justify-center">
        <button onClick={say} className="rounded-full px-4 py-2 text-sm text-vocab hover:bg-vocab-soft">🔊 Дахин сонсох</button>
      </div>
      <Button className="mt-3 w-full" onClick={onNext}>{n + 1 < total ? "Ойлголоо → дараагийн үг" : "Ойлголоо → дахин шалгах"}</Button>
    </Page>
  );
}
