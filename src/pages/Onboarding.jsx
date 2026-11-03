import { useMemo, useState } from "react";
import { update, useStore, recordAttempt, recordMistake } from "../lib/store.js";
import { today, addDays, diffDays, formatMn } from "../lib/dates.js";
import { buildDiagnostic, DIAGNOSTIC_MINUTES } from "../data/diagnostic.js";
import { thresholdFor, maxFor, sectionsFor } from "../lib/score.js";
import { Button, Card, Bar, Clock, useCountdown, cx, TONE } from "../components/ui.jsx";
import { Question } from "../components/Question.jsx";
import Placement from "./Placement.jsx";

const LEVEL_OPTIONS = [
  { level: 1, note: "~150 үг · энгийн мэндчилгээ, өөрийгөө танилцуулах (200-аас 120+)" },
  { level: 2, note: "~300 үг · өдөр тутмын энгийн яриа, дэлгүүр, зам асуух (200-аас 120+)" },
  { level: 3, note: "~600 үг · аялал, ажил, сургуулийн үндсэн харилцаа; хэлний бэлтгэл анги, тэтгэлгийн доод шаардлага (300-аас 180+) · Санал болгох" },
  { level: 4, note: "~1200 үг · олон сэдвээр чөлөөтэй ярих; бакалаврын элсэлтийн түгээмэл шаардлага (300-аас 180+)" },
  { level: 5, note: "~2500 үг · сонин, кино ойлгох; магистр, хятад хэлээр заадаг хөтөлбөр (300-аас 180+)" },
  { level: 6, note: "~5000 үг · бараг төрөлх хэлтэн шиг; орчуулга, мэргэжлийн ажил (300-аас 180+)" },
];
const MINUTE_OPTIONS = [30, 60, 90, 120, 180];
const SECTION_LABEL = { listening: "听力 · Сонсгол", reading: "阅读 · Унших", writing: "书写 · Дүрэм/бичих", vocab: "词汇 · Үгсийн сан" };

function Shell({ step, total, children }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-8 pt-6">
      {step != null && (
        <div className="mb-6 flex gap-1.5">
          {Array.from({ length: total }, (_, i) => (
            <div key={i} className={cx("h-1 flex-1 rounded-full", i <= step ? "bg-ink" : "bg-line")} />
          ))}
        </div>
      )}
      {children}
    </div>
  );
}

function Choice({ selected, onClick, title, note }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "w-full rounded-2xl border p-4 text-left transition",
        selected ? "border-ink bg-surface ring-1 ring-ink" : "border-line bg-surface hover:bg-line",
      )}
    >
      <div className="font-semibold">{title}</div>
      {note && <div className="mt-0.5 text-sm text-muted">{note}</div>}
    </button>
  );
}

export default function Onboarding() {
  const profile = useStore((s) => s.profile);
  const stored = useStore((s) => s.diagnostic);
  const placement = useStore((s) => s.placement);
  // Тест дуусаад дүнгээ үзэж дуустал Placement-ийг харуулсаар байна.
  const [placing, setPlacing] = useState(!placement || placement.pending);
  // Тест дууссан ч дүнг үзээгүй (жишээ нь хуудсыг refresh хийсэн) бол дүн рүү шууд орно.
  const [step, setStep] = useState(stored?.scores ? 6 : profile ? 4 : 0);
  const [level, setLevel] = useState(3);
  const [examDate, setExamDate] = useState(addDays(today(), 56));
  const [minutes, setMinutes] = useState(90);
  const [result, setResult] = useState(stored?.scores ? { scores: stored.scores, by: stored.detail } : null);

  const daysToExam = diffDays(today(), examDate);

  function saveProfile() {
    update((s) => {
      s.profile = { targetLevel: level, examDate, startDate: today(), minutesPerDay: minutes };
    });
    setStep(4);
  }

  if (step === 0) {
    return (
      <Shell>
        <div className="flex flex-1 flex-col justify-center">
          <p className="ko text-sm font-medium text-muted" lang="zh-CN">汉语水平考试</p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight">HSK Sprint</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            Тэгээс эхлээд HSK 3-т хүрэх 8 долоо хоногийн хувийн төлөвлөгөө. Эхлээд хэдэн асуулт, дараа нь түвшин тогтоох тест — пиньинь ба аялгаас эхэлнэ.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-2 text-center text-sm">
            {[
              ["听力", "HSK 3: 40 асуулт · 35 мин", "listening"],
              ["阅读", "HSK 3: 30 асуулт · 30 мин", "reading"],
              ["书写", "HSK 3: 10 даалгавар · 15 мин", "writing"],
            ].map(([ko, mn, tone]) => (
              <div key={ko} className={cx("rounded-2xl p-3", TONE[tone].soft)}>
                <div className={cx("ko text-lg font-bold", TONE[tone].text)}>{ko}</div>
                <div className="mt-1 text-xs text-muted">{mn}</div>
              </div>
            ))}
          </div>
        </div>
        <Button className="w-full" onClick={() => setStep(1)}>Эхлэх</Button>
      </Shell>
    );
  }

  if (step === 1) {
    return (
      <Shell step={0} total={4}>
        <h2 className="text-2xl font-bold">Зорилтот түвшин</h2>
        <p className="mt-1 text-muted">HSK 1–2: 听力 + 阅读 (200 оноо), HSK 3–6: + 书写 (300 оноо). Тэгээс эхэлж байгаа бол 8 долоо хоногт HSK 2–3 бодитой.</p>
        <div className="mt-6 grid flex-1 content-start gap-2">
          {LEVEL_OPTIONS.map((o) => (
            <Choice key={o.level} selected={level === o.level} onClick={() => setLevel(o.level)} title={`HSK ${o.level}`} note={o.note} />
          ))}
        </div>
        <Button className="mt-6 w-full" onClick={() => setStep(2)}>Үргэлжлүүлэх</Button>
      </Shell>
    );
  }

  if (step === 2) {
    const ok = daysToExam >= 7;
    return (
      <Shell step={1} total={4}>
        <h2 className="text-2xl font-bold">Шалгалтын огноо</h2>
        <p className="mt-1 text-muted">Төлөвлөгөө энэ өдрөөс ухарч тооцогдоно.</p>
        <input
          type="date"
          value={examDate}
          min={addDays(today(), 7)}
          onChange={(e) => e.target.value && setExamDate(e.target.value)}
          className="mt-6 w-full rounded-2xl border border-line bg-surface p-4 text-lg"
        />
        <p className={cx("mt-3 text-sm", ok ? "text-muted" : "text-bad")}>
          {ok
            ? `${daysToExam} хоног үлдсэн${daysToExam < 56 ? " — 8 долоо хоногийн хөтөлбөрийг шахаж хуваарилна." : daysToExam > 56 ? " — үе шатуудыг сунгаж хуваарилна." : "."}`
            : "Хамгийн багадаа 7 хоногийн дараах огноо сонгоно уу."}
        </p>
        <div className="flex-1" />
        <Button className="mt-6 w-full" disabled={!ok} onClick={() => setStep(3)}>Үргэлжлүүлэх</Button>
      </Shell>
    );
  }

  if (step === 3) {
    return (
      <Shell step={2} total={4}>
        <h2 className="text-2xl font-bold">Өдөрт хэдэн минут?</h2>
        <p className="mt-1 text-muted">Бодитоор тогтмол гаргаж чадах хугацаагаа сонгоорой.</p>
        <div className="mt-6 grid flex-1 content-start grid-cols-2 gap-2">
          {MINUTE_OPTIONS.map((m) => (
            <Choice key={m} selected={minutes === m} onClick={() => setMinutes(m)} title={m >= 60 ? `${m / 60} цаг` : `${m} минут`} note={m >= 120 ? "Эрчимтэй" : m <= 30 ? "Хамгийн бага" : null} />
          ))}
        </div>
        <Button className="mt-6 w-full" onClick={saveProfile}>Үргэлжлүүлэх</Button>
      </Shell>
    );
  }

  if (step === 4 && (placing || !placement || placement.pending)) {
    return (
      <Placement
        onDone={(result) => {
          if (result === "topik") return setPlacing(false);
          window.location.hash = "#/";
          update((s) => {
            s.diagnostic = { scores: null, skipped: true, seen: true, completedAt: Date.now() };
          });
        }}
      />
    );
  }

  if (step === 4) {
    return (
      <Shell step={3} total={4}>
        <h2 className="text-2xl font-bold">Оношлох тест</h2>
        <p className="mt-2 leading-relaxed text-muted">
          {DIAGNOSTIC_MINUTES} минут, 22 асуулт. Сонсгол, унших, дүрэм, үгсийн сангаас хэсэг тус бүрийн сул талыг тодорхойлж, төлөвлөгөөнд илүү цаг хуваарилна.
        </p>
        <Card className="mt-6 space-y-2 text-sm">
          <p>🎧 Сонсголын асуулт бүрийг <b>2 удаа</b> сонсож болно — чихэвч зүүгээрэй.</p>
          <p>⏱ Хугацаа дуусахад тест автоматаар дуусна.</p>
          <p>❔ Мэдэхгүй асуултаа алгасаж болно — таамгаар хариулахаас илүү үнэн зөв дүн гарна.</p>
        </Card>
        <div className="flex-1" />
        <Button className="mt-6 w-full" onClick={() => setStep(5)}>Тест эхлүүлэх</Button>
        <button
          className="mt-3 py-2 text-sm text-muted underline"
          onClick={() => update((s) => { s.diagnostic = { scores: null, skipped: true, seen: true, completedAt: Date.now() }; })}
        >
          Одоохондоо алгасах (төлөвлөгөө ерөнхий байна)
        </button>
      </Shell>
    );
  }

  if (step === 5) return <Diagnostic onDone={(r) => { setResult(r); setStep(6); }} />;

  return <DiagnosticResult result={result} />;
}

function Diagnostic({ onDone }) {
  const items = useMemo(buildDiagnostic, []);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState({});
  const left = useCountdown(DIAGNOSTIC_MINUTES * 60, () => finish());
  const item = items[i];

  function finish() {
    const by = {};
    for (const [idx, q] of items.entries()) {
      by[q.section] ??= { correct: 0, total: 0 };
      by[q.section].total++;
      if (answers[idx] === q.answer) by[q.section].correct++;
      else if (q.kind !== "vocab") recordMistake(q.kind, q.qid, answers[idx] ?? null);
    }
    const scores = {};
    for (const [k, v] of Object.entries(by)) {
      scores[k] = v.correct / v.total;
      if (k !== "vocab") recordAttempt(k, v.correct, v.total, "diagnostic");
    }
    update((s) => {
      s.diagnostic = { scores, detail: by, completedAt: Date.now() };
    });
    onDone({ scores, by });
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-xl px-4 pb-8 pt-4">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className={cx("font-medium", TONE[item.section]?.text)}>{SECTION_LABEL[item.section]}</span>
        <Clock seconds={left} warnAt={120} />
      </div>
      <Bar value={((i + 1) / items.length) * 100} />
      <div className="mt-5">
        <Question
          key={i}
          item={item}
          mode="exam"
          number={i + 1}
          maxPlays={2}
          chosen={answers[i] ?? null}
          onChoose={(c) => setAnswers((a) => ({ ...a, [i]: c }))}
        />
      </div>
      <div className="mt-6 flex gap-2">
        <Button variant="outline" disabled={i === 0} onClick={() => setI(i - 1)}>Өмнөх</Button>
        {i < items.length - 1 ? (
          <Button className="flex-1" onClick={() => setI(i + 1)}>{answers[i] == null ? "Алгасах" : "Дараах"}</Button>
        ) : (
          <Button className="flex-1" onClick={finish}>Дуусгах</Button>
        )}
      </div>
    </div>
  );
}

function DiagnosticResult({ result }) {
  const profile = useStore((s) => s.profile);
  const entries = Object.entries(result.scores);
  const weakest = entries.reduce((a, b) => (b[1] < a[1] ? b : a));
  const withWriting = sectionsFor(profile.targetLevel).includes("writing");
  const est = Math.round(((result.scores.listening ?? 0) + (result.scores.reading ?? 0) + (withWriting ? (result.scores.writing ?? 0) * 0.8 : 0)) * 100);

  return (
    <Shell>
      <h2 className="text-2xl font-bold">Оношлогооны дүн</h2>
      <p className="mt-1 text-muted">Хэсэг тус бүрийн зөв хариултын хувь</p>
      <Card className="mt-5 space-y-4">
        {entries.map(([k, v]) => (
          <div key={k}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium">{SECTION_LABEL[k]}</span>
              <span className="tabular-nums text-muted">{result.by[k].correct}/{result.by[k].total} · {Math.round(v * 100)}%</span>
            </div>
            <Bar value={v * 100} tone={k} />
          </div>
        ))}
      </Card>
      <Card className="mt-3 text-sm leading-relaxed">
        <p>
          Хамгийн сул: <b>{SECTION_LABEL[weakest[0]]}</b>. Төлөвлөгөөнд энэ хэсэгт илүү цаг оногдсон.
        </p>
        <p className="mt-2 text-muted">
          Ойролцоо таамаг (HSK {profile.targetLevel}): ~{est} / {maxFor(profile.targetLevel)} оноо (тэнцэх {thresholdFor(profile.targetLevel)}+). 22 асуултаас гаргасан тул дадлага ихсэх тусам нарийсна.
        </p>
      </Card>
      <p className="mt-4 text-sm text-muted">Шалгалт: {formatMn(profile.examDate)}</p>
      <div className="flex-1" />
      <Button
        className="mt-6 w-full"
        onClick={() => {
          window.location.hash = "#/";
          update((s) => {
            s.diagnostic.seen = true;
          });
        }}
      >
        Төлөвлөгөөгөө харах
      </Button>
    </Shell>
  );
}
