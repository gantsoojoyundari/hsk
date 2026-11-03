import { useState } from "react";
import { useStore } from "../lib/store.js";
import { PHASES, dayInfo, tasksForDay, weekRange } from "../lib/plan.js";
import { today, addDays, diffDays, formatMn } from "../lib/dates.js";
import { Page, Card, Pill, TONE, cx } from "../components/ui.jsx";

const EXAM_DAY = [
  "Шалгалтын хуудас (准考证) ба шалгалтад бүртгүүлсэн паспорт/иргэний үнэмлэх",
  "2B харандаа ба баллуур (цаасан шалгалт бол) — компьютерийн шалгалтад хятад бичих аргаа (пиньинь оруулга) урьдчилан дадлага хий",
  "Цагны зүүгээр (ухаалаг цаг хориотой)",
  "Шалгалт эхлэхээс 30 минутын өмнө байранд очих",
  "Ус, хөнгөн хоол; сонсголын хэсэгт чихээ сэргэг байлгахын тулд сайн унт",
];

export default function Plan() {
  const profile = useStore((s) => s.profile);
  const weakness = useStore((s) => s.diagnostic?.scores) ?? {};
  const now = today();
  const current = dayInfo(profile, now).week;
  const [open, setOpen] = useState(current);

  return (
    <Page title="8 долоо хоногийн төлөвлөгөө" back="#/">
      <p className="mb-4 text-sm text-muted">
        {formatMn(profile.startDate)} → {formatMn(profile.examDate)} · өдөрт {profile.minutesPerDay} мин
      </p>
      <div className="space-y-2">
        {Array.from({ length: 8 }, (_, i) => i + 1).map((w) => {
          const phase = PHASES.find((p) => p.weeks.includes(w));
          const { start, end } = weekRange(profile, w);
          const days = Math.max(0, diffDays(start, end) + 1);
          const isOpen = open === w;
          return (
            <Card key={w} className={cx("p-0", w === current && "border-ink")}>
              <button onClick={() => setOpen(isOpen ? null : w)} className="flex w-full items-center gap-3 p-4 text-left">
                <span className={cx("grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums", w === current ? "bg-ink text-bg" : w < current ? "bg-line text-muted" : "border border-line")}>
                  {w}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{phase.title}</p>
                  <p className="truncate text-sm text-muted">{phase.desc}</p>
                </div>
                {w === current && <Pill>Одоо</Pill>}
              </button>
              {isOpen && (
                <div className="space-y-3 border-t border-line p-4">
                  {Array.from({ length: days }, (_, d) => addDays(start, d)).map((date) => {
                    const tasks = tasksForDay(profile, weakness, date);
                    return (
                      <div key={date} className={cx(date === now && "rounded-xl bg-bg p-2 -mx-2")}>
                        <p className={cx("mb-1 text-xs", date === now ? "font-semibold" : "text-muted")}>
                          {formatMn(date)} {date === now && "· өнөөдөр"}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {tasks.map((t) => (
                            <span key={t.id} className={cx("rounded-md px-1.5 py-0.5 text-xs", (TONE[t.section] ?? TONE.mock).soft)}>
                              {t.title} {t.minutes}′
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <p className="font-semibold">Шалгалтын өдрийн бэлтгэл</p>
        <ul className="mt-2 space-y-1.5 text-sm">
          {EXAM_DAY.map((x) => (
            <li key={x} className="flex gap-2">
              <span className="text-muted">□</span>
              {x}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">Цагийн хуваарь шалгалтын газраас хамаарч өөр байж болно — 准考证 дээрх цагийг баримтлаарай.</p>
      </Card>
    </Page>
  );
}
