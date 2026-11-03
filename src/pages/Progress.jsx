import { useState } from "react";
import { useStore } from "../lib/store.js";
import { estimateSections, reachProbability, levelFor, thresholdFor, SECTIONS, sectionsFor } from "../lib/score.js";
import { masteryStats } from "../lib/srs.js";
import { dayInfo, weekRange } from "../lib/plan.js";
import { today, toKey } from "../lib/dates.js";
import vocab from "../data/vocab.json";
import { Page, Card, Bar, Empty, cx } from "../components/ui.jsx";

/** Төлөвлөгөөний 8 долоо хоног тус бүрийн хийсэн ажил: SRS давталт + хариулсан асуулт + нарийвчлал. */
function weeklyActivity(state) {
  const weeks = Array.from({ length: 8 }, (_, i) => ({ week: i + 1, reviews: 0, answered: 0, correct: 0, ...weekRange(state.profile, i + 1) }));
  const weekOf = (key) => dayInfo(state.profile, key).week;
  for (const [date, d] of Object.entries(state.log)) {
    if (date < state.profile.startDate) continue;
    weeks[weekOf(date) - 1].reviews += d.reviews ?? 0;
  }
  for (const a of state.attempts) {
    const key = toKey(new Date(a.at));
    if (key < state.profile.startDate) continue;
    const w = weeks[weekOf(key) - 1];
    w.answered += a.total;
    w.correct += a.correct;
  }
  return weeks;
}

function WeeklyChart({ weeks, current }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(10, ...weeks.map((w) => w.reviews + w.answered));
  const H = 120;
  return (
    <div>
      <div className="relative flex h-[140px] items-end gap-[2px] border-b border-line" onMouseLeave={() => setHover(null)}>
        {weeks.map((w, i) => {
          const v = w.reviews + w.answered;
          const h = (v / max) * H;
          return (
            <button
              key={w.week}
              className="group relative flex h-full flex-1 items-end justify-center"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onClick={() => setHover(i)}
              aria-label={`${w.week}-р долоо хоног: ${v}`}
            >
              <div
                className={cx("w-full max-w-9 rounded-t-[4px] transition-opacity", w.week === current ? "bg-ink" : "bg-muted/50", hover != null && hover !== i && "opacity-40")}
                style={{ height: v ? Math.max(3, h) : 0 }}
              />
            </button>
          );
        })}
        {hover != null && (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-sm"
            style={{ left: `${((hover + 0.5) / weeks.length) * 100}%` }}
          >
            <p className="font-medium">{weeks[hover].week}-р долоо хоног</p>
            <p className="text-muted">{weeks[hover].reviews} давталт · {weeks[hover].answered} асуулт</p>
            {weeks[hover].answered > 0 && (
              <p className="text-muted">Нарийвчлал {Math.round((weeks[hover].correct / weeks[hover].answered) * 100)}%</p>
            )}
          </div>
        )}
      </div>
      <div className="mt-1 flex gap-[2px] text-center text-[11px] text-muted">
        {weeks.map((w) => (
          <span key={w.week} className={cx("flex-1 tabular-nums", w.week === current && "font-semibold text-ink")}>
            {w.week}
          </span>
        ))}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted">Хүснэгтээр харах</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-1 font-medium">Долоо хоног</th>
              <th className="font-medium">Давталт</th>
              <th className="font-medium">Асуулт</th>
              <th className="font-medium">Зөв %</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.week} className="border-t border-line">
                <td className="py-1">{w.week}</td>
                <td>{w.reviews}</td>
                <td>{w.answered}</td>
                <td>{w.answered ? Math.round((w.correct / w.answered) * 100) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

export default function Progress() {
  const state = useStore();
  const { scores, samples } = estimateSections(state);
  const target = state.profile.targetLevel;
  const reach = reachProbability(scores, samples, target);
  const weeks = weeklyActivity(state);
  const current = dayInfo(state.profile, today()).week;
  const vs = masteryStats(vocab.words, state.srs);
  const lastMock = state.mocks.at(-1);

  return (
    <Page title="Явц">
      <Card>
        <p className="text-sm text-muted">Тооцоолсон нийт оноо · HSK {target}</p>
        {reach ? (
          <>
            <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight">
              {reach.total}
              <span className="text-lg text-muted">/{reach.max}</span>
            </p>
            <p className="mt-1 text-sm">
              {levelFor(reach.total, target) ? `≈ HSK ${levelFor(reach.total, target)}` : "HSK 1-д ч хүрэхгүй байна — түвшин тогтоогдохгүй"}
            </p>
            <div className="mt-4 rounded-xl bg-bg p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm">
                  HSK {target} ({thresholdFor(target)}/{reach.max}+) тэнцэх магадлал
                </span>
                <span className="text-2xl font-bold tabular-nums">{Math.round(reach.p * 100)}%</span>
              </div>
              <Bar className="mt-2" value={reach.p * 100} />
              <p className="mt-2 text-xs text-muted">
                Сүүлийн дадлагын нарийвчлал, оношлох тест, AI бичгийн үнэлгээнээс тооцсон. Өгөгдөл ихсэх тусам таамаг нарийсна.
              </p>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">Хэсэг бүрээс дор хаяж нэг дадлага хийвэл тооцоолно.</p>
        )}
      </Card>

      <Card className="mt-3 space-y-4">
        {Object.entries(SECTIONS).filter(([k]) => sectionsFor(target).includes(k)).map(([k, s]) => (
          <div key={k}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium">
                <span className="ko" lang="zh-CN">{s.ko}</span> · {s.mn}
              </span>
              <span className="tabular-nums text-muted">{scores[k] ?? "—"}/100</span>
            </div>
            <Bar value={scores[k] ?? 0} tone={k} />
          </div>
        ))}
      </Card>

      <Card className="mt-3">
        <div className="mb-4 flex items-baseline justify-between">
          <p className="font-semibold">Долоо хоногийн ажил</p>
          <p className="text-xs text-muted">давталт + асуулт</p>
        </div>
        {weeks.every((w) => w.reviews + w.answered === 0) ? <Empty>Өгөгдөл хараахан алга.</Empty> : <WeeklyChart weeks={weeks} current={current} />}
      </Card>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-muted">Үгсийн сан</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {vs.learned}
            <span className="text-sm text-muted">/{vs.total}</span>
          </p>
          <p className="text-xs text-muted">{vs.mature} бат эзэмшсэн</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Сүүлийн жишиг шалгалт</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{lastMock?.total ?? "—"}</p>
          <p className="text-xs text-muted">
            {lastMock ? new Date(lastMock.at).toLocaleDateString("mn-MN") : "Өгөөгүй"}
          </p>
        </Card>
      </div>
    </Page>
  );
}

