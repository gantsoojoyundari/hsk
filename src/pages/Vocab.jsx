import { useEffect, useState } from "react";
import { useStore, update, recordAttempt } from "../lib/store.js";
import { review, markKnown, masteryStats, NEW_CARD } from "../lib/srs.js";
import { today } from "../lib/dates.js";
import vocab from "../data/vocab.json";
import { playClips } from "../lib/sound.js";
import { useToday } from "./Home.jsx";
import { Page, Card, Button, Bar, Pill, Empty, Bow, Ko, cx } from "../components/ui.jsx";
import { WordQuiz } from "../components/WordQuiz.jsx";

const byId = Object.fromEntries(vocab.words.map((w) => [w.id, w]));


export default function Vocab() {
  const [mode, setMode] = useState("home");
  const [session, setSession] = useState(null);
  const [quiz, setQuiz] = useState(null); // { topic, round }
  const { queue, beginner } = useToday();
  const srs = useStore((s) => s.srs);
  const stats = masteryStats(vocab.words, srs);

  if (mode === "study" && session) {
    return <Study session={session} onExit={() => setMode("home")} />;
  }
  if (mode === "browse") return <Browse onBack={() => setMode("home")} />;

  // Үзсэн үгс (сэдвээр): хэдэн ч удаа шалгалт өгч болно.
  const seen = vocab.words.filter((w) => srs[w.id]);
  const seenTopics = [...new Set(seen.map((w) => w.topic))];
  if (quiz) {
    const ids = seen.filter((w) => quiz.topic === "all" || w.topic === quiz.topic).map((w) => w.id);
    const done = (score, total) => recordAttempt("vocab", score, total, "vocab-quiz");
    return (
      <WordQuiz
        key={quiz.round}
        ids={ids}
        title={`Үзсэн үгсийн шалгалт${quiz.topic === "all" ? "" : ` · ${vocab.topics[quiz.topic]}`}`}
        onFinish={(s, t) => {
          done(s, t);
          setQuiz(null);
        }}
        onAgain={(s, t) => {
          done(s, t);
          setQuiz({ ...quiz, round: quiz.round + 1 });
        }}
      />
    );
  }
  // Өдрийн хязгаараас гадуур нэмэлт шинэ үг (эхлэгч бол анхан шатны үгсээс).
  const extraNew = vocab.words
    .filter((w) => !srs[w.id] && !queue.fresh.includes(w.id) && (beginner.graduated || w.topic === "basic"))
    .slice(0, 5)
    .map((w) => w.id);

  const total = queue.due.length + queue.fresh.length;
  return (
    <Page title="Үгсийн сан">
      <Card className="text-center">
        <p className="text-sm text-muted">Өнөөдөр</p>
        <p className="mt-1 text-5xl font-bold tabular-nums tracking-tight">{total}</p>
        <p className="mt-1 text-sm text-muted">
          <span className="text-vocab">{queue.due.length} давтах</span> · {queue.fresh.length} шинэ үг
        </p>
        <Button
          className="mt-5 w-full"
          disabled={total === 0}
          onClick={() => {
            setSession({ ids: [...queue.due, ...queue.fresh], fresh: new Set(queue.fresh) });
            setMode("study");
          }}
        >
          {total === 0 ? "Өнөөдрийн картууд дууссан" : "Давталт эхлүүлэх"}
        </Button>
      </Card>

      <Card className="mt-3 space-y-3">
        <div>
          <p className="font-medium">Нэмэлт дасгал — хэдэн ч удаа</p>
          <p className="text-sm text-muted">Үзсэн үгсээрээ шалгалт өг, эсвэл өдрийн хязгаараас гадуур шинэ үг сур.</p>
        </div>
        {seen.length >= 4 ? (
          <div className="flex flex-wrap gap-2">
            {[["all", `Бүгд (${seen.length})`], ...seenTopics.map((t) => [t, `${vocab.topics[t]} (${seen.filter((w) => w.topic === t).length})`])].map(
              ([t, label]) => (
                <button
                  key={t}
                  onClick={() => setQuiz({ topic: t, round: 0 })}
                  className="rounded-full border border-accent bg-surface px-3 py-1.5 text-sm hover:bg-listening-soft"
                >
                  📝 {label}
                </button>
              ),
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">4-өөс дээш үг үзсэний дараа шалгалт нээгдэнэ.</p>
        )}
        <Button
          variant="outline"
          className="w-full"
          disabled={!extraNew.length}
          onClick={() => {
            setSession({ ids: extraNew, fresh: new Set(extraNew) });
            setMode("study");
          }}
        >
          + {extraNew.length} шинэ үг нэмж сурах
        </Button>
      </Card>

      <Card className="mt-3">
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-medium">Ахиц</span>
          <span className="tabular-nums text-muted">
            {stats.learned}/{stats.total} үзсэн · {stats.mature} бат эзэмшсэн
          </span>
        </div>
        <Bar value={(stats.learned / stats.total) * 100} tone="vocab" />
        <p className="mt-2 text-xs text-muted">«Бат эзэмшсэн» = 21+ хоногийн интервалтай үг.</p>
      </Card>

      <Button variant="outline" className="mt-3 w-full" onClick={() => setMode("browse")}>
        Бүх үгийг сэдвээр харах
      </Button>
    </Page>
  );
}

const BATCH = 5;

function Study({ session, onExit }) {
  const [ids, setIds] = useState(session.ids);
  const [revealed, setRevealed] = useState(false);
  // Заасан даруйд шалгана: 5 үг тутамд (эсвэл давталт дуусахад үлдсэнээр) жижиг шалгалт.
  const [studied, setStudied] = useState([]);
  const [quizKey, setQuizKey] = useState(0);
  const [done, setDone] = useState(0);
  const srs = useStore((s) => s.srs);
  const id = ids[0];
  const word = byId[id];
  // Шинэ үгийг асуухаас өмнө заана: утга, жишээ нь шууд харагдана.
  const isNew = !!id && !srs[id];
  const flipped = revealed || isNew;
  const setFlipped = setRevealed;
  // Карт гармагц үгийг өөрөө нэг уншина (шинэ үг бол жишээ өгүүлбэрийг ч дараалуулж).
  const quizzing = studied.length >= BATCH || (!word && studied.length > 0);
  useEffect(() => {
    if (!word || quizzing) return;
    if (isNew) playClips([`vocab/${id}`, `vocab/${id}-ex`], `${word.ko}. ${word.ex_ko}`);
    else playClips([`vocab/${id}`], word.ko);
  }, [id, quizzing]); // eslint-disable-line react-hooks/exhaustive-deps
  // Давтлагын картын хариуг нээхэд жишээ өгүүлбэрийг уншина.
  useEffect(() => {
    if (revealed && word && !isNew) playClips([`vocab/${id}-ex`], word.ex_ko);
  }, [revealed]); // eslint-disable-line react-hooks/exhaustive-deps

  function grade(g) {
    const date = today();
    update((s) => {
      const wasNew = !s.srs[id];
      s.srs[id] = review(s.srs[id] ?? NEW_CARD, g, date);
      const d = s.log[date] ?? { done: {}, reviews: 0, newWords: 0 };
      d.reviews++;
      if (wasNew) d.newWords++;
      // Өдрийн шалгалтад: өнөөдөр үзсэн үгс.
      d.words = [...new Set([...(d.words ?? []), id])];
      s.log[date] = d;
    });
    setFlipped(false);
    setDone((n) => n + 1);
    if (g !== "again") setStudied((x) => (x.includes(id) ? x : [...x, id]));
    // «Мартсан» картыг 3 картын дараа дахин гаргана.
    setIds((q) => (g === "again" ? [...q.slice(1, 4), id, ...q.slice(4)] : q.slice(1)));
  }

  // Мэддэг үг: шинэ үгийн өдрийн хязгаарт тоологдохгүй, шууд дараагийн карт руу.
  function known() {
    update((s) => {
      s.srs[id] = markKnown(s.srs[id], today());
    });
    setFlipped(false);
    setIds((q) => q.slice(1));
  }

  useEffect(() => {
    function onKey(e) {
      if (!word) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped(true);
      }
      if (!flipped) return;
      if (e.key === "1") grade("again");
      if (e.key === "2" || e.key === "3") grade("good");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (quizzing) {
    return (
      <WordQuiz
        key={quizKey}
        ids={studied}
        title={`Шалгалт — сая заасан ${studied.length} үг`}
        onFinish={() => {
          setStudied([]);
          setQuizKey((k) => k + 1);
        }}
      />
    );
  }

  if (!word) {
    return (
      <Page title="Үгсийн сан">
        <Card className="py-10 text-center">
          <Bow className="mx-auto w-16" />
          <p className="mt-2 text-lg font-semibold">Өнөөдрийн давталт дууслаа</p>
          <p className="mt-1 text-sm text-muted">{done} удаа давтлаа. Маргааш шинэ картууд гарна.</p>
          <Button className="mt-6" onClick={onExit}>Буцах</Button>
        </Card>
      </Page>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-28 pt-4">
      <div className="mb-3 flex items-center justify-between text-sm">
        <button onClick={onExit} className="-ml-2 rounded-lg px-2 py-1 text-muted hover:bg-line">✕ Гарах</button>
        <span className="tabular-nums text-muted">{ids.length} үлдсэн</span>
      </div>
      <Bar value={(done / (done + ids.length)) * 100} tone="vocab" />

      <button
        onClick={() => setFlipped(true)}
        className="relative mt-5 flex min-h-80 flex-1 flex-col items-center justify-center rounded-3xl border border-line bg-surface p-6 text-center"
      >
        <Bow className="absolute -right-2 -top-3 w-12 rotate-12" />
        <div className="mb-4 flex gap-2">
          <Pill tone="vocab">{vocab.topics[word.topic]}</Pill>
          {session.fresh.has(id) && !srs[id] && <Pill>Шинэ</Pill>}
        </div>
        <Ko text={word.ko} className="items-center text-4xl font-bold" galigClassName="mt-1 text-lg" />
        {flipped ? (
          <div className="mt-6 w-full space-y-4">
            <p className="text-xl font-semibold">{word.mn}</p>
            <div className="rounded-2xl bg-bg p-3 text-left">
              <Ko text={word.ex_ko} className="leading-relaxed" galigClassName="text-sm" />
              <p className="mt-1 text-sm text-muted">{word.ex_mn}</p>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted">Энэ үгийн утгыг санаж байна уу? Бодоод, доорх товчийг дар.</p>
        )}
      </button>

      <div className="mt-3 flex justify-center">
        <button
          onClick={() =>
            flipped
              ? playClips([`vocab/${id}`, `vocab/${id}-ex`], `${word.ko}. ${word.ex_ko}`)
              : playClips([`vocab/${id}`], word.ko)
          }
          className="rounded-full px-4 py-2 text-sm text-vocab hover:bg-vocab-soft"
        >
          🔊 Дахин сонсох
        </button>
      </div>

      {/* Хоёрхон сонголт: шинэ үг → «Дахиад» / «Ойлголоо», давталт → «Санаагүй» / «Санасан». */}
      {flipped ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => grade("again")} className="min-h-14 rounded-2xl border border-line bg-surface text-base font-medium">
            {isNew ? "🔁 Дахиад үзье" : "😕 Санаагүй"}
          </button>
          <button onClick={() => grade("good")} className="min-h-14 rounded-2xl bg-accent text-base font-semibold text-white">
            {isNew ? "Ойлголоо →" : "🙂 Санасан"}
          </button>
          {isNew && (
            <button onClick={known} className="col-span-2 py-2 text-sm text-muted underline-offset-2 hover:underline">
              Энэ үгийг аль хэдийн мэднэ — алгасах
            </button>
          )}
        </div>
      ) : (
        <Button className="mt-3 w-full" onClick={() => setFlipped(true)}>Хариу харах</Button>
      )}
    </div>
  );
}

function Browse({ onBack }) {
  const [topic, setTopic] = useState("all");
  const srs = useStore((s) => s.srs);
  const words = vocab.words.filter((w) => topic === "all" || w.topic === topic);

  return (
    <Page title="Бүх үг" action={<button onClick={onBack} className="text-sm text-muted">Хаах</button>}>
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {[["all", "Бүгд"], ...Object.entries(vocab.topics)].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTopic(k)}
            className={cx("shrink-0 rounded-full border px-3 py-1.5 text-sm", topic === k ? "border-ink bg-ink text-bg" : "border-line bg-surface")}
          >
            {label}
          </button>
        ))}
      </div>
      {words.length === 0 ? (
        <Empty>Энэ сэдэвт үг алга.</Empty>
      ) : (
        <Card className="divide-y divide-line p-0">
          {words.map((w) => {
            const c = srs[w.id];
            return (
              <div key={w.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Ko text={w.ko} className="font-semibold" />
                  <span className="ml-2 text-sm text-muted">{w.mn}</span>
                </div>
                <span className="shrink-0 text-xs text-muted">
                  {!c ? "шинэ" : c.known ? "мэднэ" : c.reps === 0 ? "сурч байна" : c.interval >= 21 ? "эзэмшсэн" : `${c.interval} өдөр`}
                </span>
                {(!c || c.known) && (
                  <button
                    onClick={() =>
                      update((s) => {
                        if (c?.known) delete s.srs[w.id];
                        else s.srs[w.id] = markKnown(undefined, today());
                      })
                    }
                    className={cx(
                      "shrink-0 rounded-full border px-2.5 py-1 text-xs",
                      c?.known ? "border-vocab bg-vocab-soft text-vocab" : "border-line text-muted hover:bg-line",
                    )}
                    aria-label={c?.known ? "Мэднэ тэмдгийг болиулах" : "Мэднэ гэж тэмдэглэх"}
                  >
                    {c?.known ? "✓ Мэднэ" : "Мэднэ"}
                  </button>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </Page>
  );
}
