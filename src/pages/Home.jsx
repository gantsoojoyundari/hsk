import { useStore, markTask, dayLog, streak } from "../lib/store.js";
import { today, formatMn } from "../lib/dates.js";
import { dayInfo, tasksForDay, newWordsPerDay } from "../lib/plan.js";
import { buildQueue, pickOldMix } from "../lib/srs.js";
import { beginnerState, beginnerTasks } from "../lib/beginner.js";
import vocab from "../data/vocab.json";
import { Page, Card, Bar, Pill, TONE, Bow, cx } from "../components/ui.jsx";
import { BeginnerPath } from "../components/BeginnerPath.jsx";

export function useToday() {
  const state = useStore();
  const date = today();
  const { profile } = state;
  const weakness = state.diagnostic?.scores ?? {};
  const info = dayInfo(profile, date);
  // Эхлэгч: HSK-ийн даалгаврын оронд пиньинь → үг → сонсгол → өгүүлбэр дараалал.
  const beginner = beginnerState(state);
  const log = dayLog(state, date);
  const tasks = [
    ...(beginner.graduated ? tasksForDay(profile, weakness, date) : beginnerTasks(beginner, date)),
    // Өдрийн төгсгөлд: өнөөдөр үзсэн үгсээрээ шалгалт (алдсан үг давтлагад буцна).
    { id: `${date}:dailytest`, kind: "dailytest", section: "mock", title: "Өдрийн шалгалт", route: "#/daily-test", minutes: 5, detail: "Өнөөдөр үзсэн үгсээ шалгана" },
  ];
  // Эхлэгч байх үед зөвхөн анхан шатны үгс, өдөрт 10 шинэ үг.
  const pool = beginner.graduated ? vocab.words : vocab.words.filter((w) => w.topic === "basic" || state.srs[w.id]);
  const remainingNew = pool.filter((w) => !state.srs[w.id]).length;
  const perDay = beginner.graduated ? newWordsPerDay(profile, remainingNew, date) : 10;
  const newLimit = Math.max(0, perDay - log.newWords);
  const base = buildQueue(pool, state.srs, { newLimit, now: date });
  // Хугацаа нь болоогүй хуучин үгсээс өдөрт 4-ийг нэмж давтана.
  const mix = pickOldMix(pool, state.srs, { now: date, n: 4, exclude: log.words ?? [] });
  const queue = { ...base, due: [...base.due, ...mix], mix };
  return { state, date, info, tasks, log, queue, beginner };
}

export default function Home() {
  const { state, date, info, tasks, log, queue, beginner } = useToday();
  const s = streak(state.log, date);
  const vocabLeft = queue.due.length + queue.fresh.length;
  const openMistakes = state.mistakes.filter((m) => !m.resolved).length;
  // Даалгавар зөвхөн дасгалаа хийж дуусгахад биелнэ (PracticeSet / бичгийн илгээлт / картууд дууссан).
  const isDone = (t) =>
    !!log.done[t.id] ||
    (t.kind === "vocab" && vocabLeft === 0 && log.reviews > 0) ||
    (t.kind === "mistakes" && openMistakes === 0);
  const doneCount = tasks.filter(isDone).length;

  return (
    <Page>
      <header className="mb-5 flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">{formatMn(date)}</p>
          <h1 className="mt-0.5 flex items-center gap-2 text-2xl font-bold tracking-tight">Өнөөдрийн даалгавар <Bow className="w-7 -rotate-12" /></h1>
        </div>
        <a href="#/settings" className="rounded-lg p-2 text-muted hover:bg-line" aria-label="Тохиргоо">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
          </svg>
        </a>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Card className="flex flex-col justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Шалгалт хүртэл</span>
          <span className="mt-2 text-4xl font-bold tabular-nums tracking-tight">
            D-{Math.max(0, info.daysLeft)}
          </span>
          <span className="text-xs text-muted">{formatMn(state.profile.examDate)}</span>
        </Card>
        <Card className="flex flex-col justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Streak</span>
          <span className="mt-2 flex items-baseline gap-1 text-4xl font-bold tabular-nums tracking-tight">
            {s}
            <span className={cx("text-2xl", s > 0 ? "" : "opacity-30 grayscale")}>🔥</span>
          </span>
          <span className="text-xs text-muted">{s > 0 ? "өдөр дараалан" : "Өнөөдөр эхлүүлээрэй"}</span>
        </Card>
      </div>

      {!beginner.graduated && (
        <div className="mt-3">
          <BeginnerPath b={beginner} />
        </div>
      )}
      <a href="#/plan" className={cx("mt-3 block", !beginner.graduated && "hidden")}>
        <Card className="hover:bg-line/40">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">
              {info.week}-р долоо хоног · {info.phase.title}
            </span>
            <span className="text-xs text-muted">Төлөвлөгөө ›</span>
          </div>
          <p className="mt-0.5 text-sm text-muted">{info.phase.desc}</p>
          <Bar className="mt-3" value={((info.index + 1) / info.totalDays) * 100} />
        </Card>
      </a>

      <div className="mb-2 mt-6 flex items-baseline justify-between">
        <h2 className="font-semibold">Даалгавар</h2>
        <span className="text-sm text-muted tabular-nums">
          {doneCount}/{tasks.length} · {tasks.reduce((a, t) => a + t.minutes, 0)} мин
        </span>
      </div>
      <div className="space-y-2">
        {tasks.map((t) => {
          const done = isDone(t);
          const tone = TONE[t.section] ?? TONE.mock;
          return (
            <Card key={t.id} className={cx("flex items-center gap-3 p-3", done && "opacity-60")}>
              {/* Зөвхөн «шалгалтын өдрийн бэлтгэл»-ийг гараар тэмдэглэнэ — бусад нь дасгал дуусахад автоматаар. */}
              <button
                onClick={t.kind === "examday" ? () => markTask(t.id, !log.done[t.id]) : () => (location.hash = t.route)}
                className={cx(
                  "grid size-7 shrink-0 place-items-center rounded-full border-2 transition",
                  done ? `${tone.bg} ${tone.border} text-white` : "border-line",
                )}
                aria-label={done ? "Дууссан" : "Дасгал руу орох"}
              >
                {done && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5 9-10" /></svg>
                )}
              </button>
              <a href={t.route} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cx("font-medium", done && "line-through")}>{t.title}</span>
                  <span className={cx("size-1.5 rounded-full", tone.bg)} />
                </div>
                <p className="truncate text-sm text-muted">
                  {t.kind === "vocab"
                    ? vocabLeft > 0
                      ? `${queue.due.length} давтах · ${queue.fresh.length} шинэ үг`
                      : "Өнөөдрийн картууд дууссан"
                    : t.kind === "mistakes"
                      ? `${openMistakes} шийдээгүй алдаа`
                      : t.detail}
                </p>
              </a>
              <Pill tone={t.section}>{t.minutes} мин</Pill>
            </Card>
          );
        })}
      </div>

      {doneCount === tasks.length && (
        <p className="mt-4 rounded-2xl bg-writing-soft p-4 text-center text-sm font-medium text-writing">
          Өнөөдрийн бүх даалгавар дууслаа. Сайн байна! 🎉
        </p>
      )}
    </Page>
  );
}
