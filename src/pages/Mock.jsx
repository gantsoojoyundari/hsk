import { useState } from "react";
import listening from "../data/listening.json";
import reading from "../data/reading.json";
import writing from "../data/writing.json";
import { update, useStore, recordAttempt, recordMistake, markTask } from "../lib/store.js";
import { today } from "../lib/dates.js";
import { levelFor, thresholdFor, examFor } from "../lib/score.js";
import { MAX_SCORE, TASK_LABEL, emptyAnswer, answerText, hasAnswer, promptText, autoGrade, countChars } from "../lib/writing.js";
import { Question } from "../components/Question.jsx";
import { ArrangeInput, HanziInput, TaskPrompt } from "./Writing.jsx";
import { Page, Card, Button, Bar, Clock, useCountdown, Pill, Empty, cx } from "../components/ui.jsx";

// Бодит HSK шалгалтын хэсэг бүрийн хугацаа (минут). Хариулт бөглөх 5 минутыг оруулаагүй.
const REAL_MIN = {
  1: { listening: 15, reading: 17, writing: 0 },
  2: { listening: 25, reading: 22, writing: 0 },
  3: { listening: 35, reading: 30, writing: 15 },
  4: { listening: 30, reading: 40, writing: 25 },
  5: { listening: 30, reading: 45, writing: 40 },
  6: { listening: 35, reading: 50, writing: 45 },
};
// Богиносгосон горимд асуулт/даалгавар тутамд оногдох минут.
const PER_ITEM = { listening: 0.9, reading: 1.2 };
const PER_TASK = { arrange: 1.5, hanzi: 1.5, sentence: 3, essay: 15 };

const SECTION_ZH = { listening: "听力", reading: "阅读", writing: "书写" };

/** Зорилтот түвшинд тохирох бичгийн даалгаврууд: HSK 1–2 → байхгүй, 3–4 → тухайн түвшин хүртэл, 5–6 → бүгд. */
function writingTasksFor(level) {
  if (!examFor(level).sections.includes("writing")) return [];
  return writing.filter((t) => t.level <= Math.max(3, level));
}

function minutesFor(section, items, real, level) {
  if (real) return REAL_MIN[level]?.[section] || 10;
  if (section === "writing") return Math.max(5, Math.ceil(items.reduce((s, t) => s + (PER_TASK[t.task] ?? 2), 0)));
  return Math.max(5, Math.ceil(PER_ITEM[section] * items.length));
}

export default function Mock() {
  const mocks = useStore((s) => s.mocks);
  const target = useStore((s) => s.profile.targetLevel) ?? 3;
  const exam = examFor(target);
  const [phase, setPhase] = useState("intro");
  const [real, setReal] = useState(false);
  const [answers, setAnswers] = useState({ listening: {}, reading: {}, writing: {} });
  const [result, setResult] = useState(null);

  const L = listening.items;
  const R = reading.items;
  const W = writingTasksFor(target);
  const hasWriting = W.length > 0;

  function setAns(section, key, value) {
    setAnswers((a) => ({ ...a, [section]: { ...a[section], [key]: value } }));
  }

  async function grade() {
    setPhase("grading");
    const sectionScore = (items, ans, kind) => {
      let correct = 0;
      items.forEach((q) => {
        if (ans[q.id] === q.answer) correct++;
        else recordMistake(kind, q.id, ans[q.id] ?? null);
      });
      recordAttempt(kind, correct, items.length, "mock");
      return { correct, total: items.length, score: Math.round((correct / items.length) * 100) };
    };
    const lis = sectionScore(L, answers.listening, "listening");
    const rea = sectionScore(R, answers.reading, "reading");

    // Бичих: 完成句子/写汉字 шууд, 看词写句/短文 AI-аар (зэрэг). API тохируулаагүй бол бичгийн оноо null.
    const graded = await Promise.all(
      W.map(async (t) => {
        const raw = answers.writing[t.id] ?? emptyAnswer(t);
        const base = { id: t.id, task: t.task, max: MAX_SCORE[t.task] };
        if (!hasAnswer(t, raw)) return { ...base, score: 0, empty: true };
        const local = autoGrade(t, raw);
        if (local) return { ...base, score: local.score, result: local };
        try {
          const res = await fetch("/api/grade", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task: t.task, prompt: promptText(t), answer: answerText(t, raw), words: t.words ?? [] }),
          });
          const json = await res.json();
          if (!res.ok) return { ...base, error: json.error };
          return { ...base, score: json.score, max: json.max, result: json };
        } catch {
          return { ...base, error: "Сүлжээний алдаа" };
        }
      }),
    );
    const writingOk = graded.every((g) => g.error == null);
    const wMax = graded.reduce((s, g) => s + g.max, 0);
    const wri = !hasWriting ? null : writingOk ? Math.round((graded.reduce((s, g) => s + g.score, 0) / wMax) * 100) : null;

    const complete = !hasWriting || writingOk;
    const total = lis.score + rea.score + (wri ?? 0);
    const r = {
      at: Date.now(),
      real,
      target,
      max: exam.max,
      scores: { listening: lis.score, reading: rea.score, writing: wri },
      total: complete ? total : null,
      partial: complete ? null : lis.score + rea.score,
      level: complete ? levelFor(total, target) : null,
      writing: graded,
      writingError: graded.find((g) => g.error)?.error,
    };
    update((s) => {
      s.mocks.push({ at: r.at, scores: r.scores, total: r.total, level: r.level, target, max: exam.max });
      for (const g of graded) {
        if (g.result) s.writings.push({ id: g.id, task: g.task, answer: answerText(W.find((t) => t.id === g.id), answers.writing[g.id]), result: g.result, at: r.at });
      }
    });
    markTask(`${today()}:mock`);
    setResult(r);
    setPhase("result");
  }

  if (phase === "intro") {
    const rows = [
      ["一、听力", "Сонсгол", `${L.length} асуулт`],
      ["二、阅读", "Унших", `${R.length} асуулт`],
      ...(hasWriting ? [["三、书写", "Бичих", `${W.length} даалгавар`]] : []),
    ];
    const realTotal = Object.values(REAL_MIN[target] ?? REAL_MIN[3]).reduce((a, b) => a + b, 0);
    const shortParts = [minutesFor("listening", L, false, target), minutesFor("reading", R, false, target), ...(hasWriting ? [minutesFor("writing", W, false, target)] : [])];
    return (
      <Page title={`Жишиг шалгалт · HSK ${target}`}>
        <Card className="space-y-3">
          {rows.map(([a, b, c]) => (
            <div key={a} className="flex items-center gap-3">
              <span className="ko w-20 font-semibold" lang="zh-CN">{a}</span>
              <span className="flex-1 text-sm text-muted">{b}</span>
              <span className="text-sm text-muted">{c}</span>
            </div>
          ))}
          <p className="border-t border-line pt-3 text-sm text-muted">
            Нийт {exam.max} оноо · тэнцэх {exam.pass}+ (хэсэг бүр 100)
          </p>
        </Card>
        <Card className="mt-3">
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={real} onChange={(e) => setReal(e.target.checked)} className="mt-1 size-4 accent-current" />
            <span className="text-sm">
              <span className="font-medium">Бодит HSK {target}-ийн хугацаа (~{realTotal} мин)</span>
              <span className="block text-muted">Унтраалттай үед асуултын тоонд тохируулсан хугацаа: {shortParts.join(" + ")} мин.</span>
            </span>
          </label>
        </Card>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Асуултын сан нэмэгдэх тусам бодит шалгалтын хэмжээнд ойртоно. Сонсголыг нэг л удаа сонсгоно (бодит HSK-д 2 удаа уншдаг ч энд
          хүндрүүлсэн).{hasWriting ? " 完成句子/写汉字-г шууд, 看词写句/短文-ийг шалгалтын дараа AI үнэлнэ." : ""}
        </p>
        <Button className="mt-4 w-full" onClick={() => setPhase("listening")}>Эхлэх</Button>

        <h2 className="mb-2 mt-8 font-semibold">Өмнөх дүнгүүд</h2>
        {mocks.length === 0 ? (
          <Empty>Одоохондоо жишиг шалгалт өгөөгүй байна.</Empty>
        ) : (
          <Card className="divide-y divide-line p-0">
            {[...mocks].reverse().map((m) => (
              <div key={m.at} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-muted">{new Date(m.at).toLocaleDateString("mn-MN")}</span>
                <span className="tabular-nums">
                  {m.total ?? "—"} / {m.max ?? 300} {m.level ? <Pill className="ml-2">HSK {m.level}</Pill> : null}
                </span>
              </div>
            ))}
          </Card>
        )}
      </Page>
    );
  }

  if (phase === "listening") {
    return (
      <Section
        title="一、听力"
        tone="listening"
        minutes={minutesFor("listening", L, real, target)}
        items={L}
        answers={answers.listening}
        onAnswer={(id, c) => setAns("listening", id, c)}
        onDone={() => setPhase("reading")}
        maxPlays={1}
        nextLabel="阅读 руу шилжих"
      />
    );
  }

  if (phase === "reading") {
    return (
      <Section
        title="二、阅读"
        tone="reading"
        minutes={minutesFor("reading", R, real, target)}
        items={R}
        answers={answers.reading}
        onAnswer={(id, c) => setAns("reading", id, c)}
        onDone={hasWriting ? () => setPhase("writing") : grade}
        nextLabel={hasWriting ? "书写 руу шилжих" : "Шалгалт дуусгах"}
      />
    );
  }

  if (phase === "writing") {
    return (
      <WritingSection
        tasks={W}
        minutes={minutesFor("writing", W, real, target)}
        answers={answers.writing}
        onAnswer={(id, v) => setAns("writing", id, v)}
        onDone={grade}
      />
    );
  }

  if (phase === "grading") {
    return (
      <Page title="Дүн гаргаж байна">
        <Card className="py-10 text-center text-muted">Бичгийн даалгаврыг үнэлж байна… (~30 сек)</Card>
      </Page>
    );
  }

  return <MockResult result={result} answers={answers} onClose={() => setPhase("intro")} />;
}

function Section({ title, tone, minutes, items, answers, onAnswer, onDone, maxPlays, nextLabel }) {
  const [i, setI] = useState(0);
  const left = useCountdown(minutes * 60, onDone);
  const item = items[i];
  const answered = Object.keys(answers).length;
  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-28 pt-4">
      <div className="mb-2 flex items-center justify-between">
        <span className={cx("ko font-semibold", tone === "listening" ? "text-listening" : "text-reading")} lang="zh-CN">{title}</span>
        <Clock seconds={left} warnAt={300} />
      </div>
      <Bar value={(answered / items.length) * 100} tone={tone} />
      <div className="mt-4">
        <Question key={item.id} item={item} mode="exam" number={i + 1} maxPlays={maxPlays} chosen={answers[item.id] ?? null} onChoose={(c) => onAnswer(item.id, c)} />
      </div>
      <div className="mt-5 flex gap-2">
        <Button variant="outline" disabled={i === 0} onClick={() => setI(i - 1)}>Өмнөх</Button>
        {i < items.length - 1 ? (
          <Button className="flex-1" onClick={() => setI(i + 1)}>Дараах</Button>
        ) : (
          <Button className="flex-1" onClick={onDone}>{nextLabel}</Button>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {items.map((q, j) => (
          <button
            key={q.id}
            onClick={() => setI(j)}
            className={cx("size-8 rounded-lg text-xs tabular-nums", j === i ? "bg-ink text-bg" : answers[q.id] != null ? "bg-line" : "border border-line")}
          >
            {j + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

function WritingSection({ tasks, minutes, answers, onAnswer, onDone }) {
  const left = useCountdown(minutes * 60, onDone);
  return (
    <div className="mx-auto w-full max-w-xl space-y-4 px-4 pb-28 pt-4">
      <div className="flex items-center justify-between">
        <span className="ko font-semibold text-writing" lang="zh-CN">三、书写</span>
        <Clock seconds={left} warnAt={180} />
      </div>
      {tasks.map((t, n) => {
        const val = answers[t.id] ?? emptyAnswer(t);
        return (
          <Card key={t.id} className="space-y-3">
            <p className="text-xs font-semibold text-muted">
              {n + 1}. <span className="ko" lang="zh-CN">{TASK_LABEL[t.task]}</span> · {MAX_SCORE[t.task]} оноо
            </p>
            <TaskPrompt task={t} compact />
            {t.task === "arrange" && <ArrangeInput task={t} value={val} onChange={(v) => onAnswer(t.id, v)} />}
            {t.task === "hanzi" && <HanziInput task={t} value={val} onChange={(v) => onAnswer(t.id, v)} />}
            {(t.task === "sentence" || t.task === "essay") && (
              <>
                <textarea
                  value={val}
                  onChange={(e) => onAnswer(t.id, e.target.value)}
                  rows={t.task === "essay" ? 7 : 2}
                  className="ko w-full rounded-xl border border-line bg-surface p-3 text-[17px] leading-8"
                  lang="zh-CN"
                />
                <p className="text-right text-xs tabular-nums text-muted">
                  {countChars(val)} / {t.min}–{t.max} ханз
                </p>
              </>
            )}
          </Card>
        );
      })}
      <Button className="w-full" onClick={onDone}>Шалгалт дуусгах</Button>
    </div>
  );
}

function MockResult({ result, answers, onClose }) {
  const [review, setReview] = useState(null);
  const target = result.target;
  const need = thresholdFor(target);

  if (review) {
    const items = review === "listening" ? listening.items : reading.items;
    return (
      <Page title={`${SECTION_ZH[review]} тайлбар`} action={<button className="text-sm text-muted" onClick={() => setReview(null)}>Буцах</button>}>
        <div className="space-y-6">
          {items.map((q, i) => (
            <Card key={q.id}>
              <Question item={q} mode="review" number={i + 1} chosen={answers[review][q.id] ?? null} />
            </Card>
          ))}
        </div>
      </Page>
    );
  }

  const shown = result.total ?? result.partial;
  const sections = examFor(target).sections;
  return (
    <Page title="Жишиг шалгалтын дүн">
      <Card className="text-center">
        <p className="text-sm text-muted">{result.total == null ? "Бичихгүйгээр (听力 + 阅读)" : `Нийт оноо · HSK ${target}`}</p>
        <p className="mt-1 text-5xl font-bold tabular-nums">
          {shown}
          <span className="text-xl text-muted">/{result.total == null ? 200 : result.max}</span>
        </p>
        <p className="mt-2 font-medium">
          {result.level ? `Тооцоолсон түвшин: HSK ${result.level}` : result.total == null ? "Бичгийн оноо гараагүй" : "HSK 1-д ч хүрэхгүй байна"}
        </p>
        {result.total != null && (
          <p className={cx("mt-1 text-sm", result.total >= need ? "text-good" : "text-muted")}>
            HSK {target} тэнцэх босго ({need}+): {result.total >= need ? "тэнцсэн ✓" : `${need - result.total} оноо дутуу`}
          </p>
        )}
      </Card>
      <Card className="mt-3 space-y-3">
        {sections.map((k) => (
          <div key={k}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="ko font-medium" lang="zh-CN">{SECTION_ZH[k]}</span>
              <span className="tabular-nums text-muted">{result.scores[k] ?? "—"}/100</span>
            </div>
            <Bar value={result.scores[k] ?? 0} tone={k} />
          </div>
        ))}
        {result.writingError && <p className="text-sm text-bad">Бичгийн үнэлгээ: {result.writingError}</p>}
      </Card>
      {result.writing.length > 0 && (
        <Card className="mt-3 space-y-2 text-sm">
          <p className="font-medium">Бичгийн даалгавар</p>
          {result.writing.map((w, i) => (
            <div key={w.id} className="flex justify-between">
              <span>
                {i + 1}. <span className="ko" lang="zh-CN">{TASK_LABEL[w.task]}</span>
              </span>
              <span className="tabular-nums text-muted">{w.error ? "—" : `${w.score}/${w.max}`}</span>
            </div>
          ))}
          <p className="text-xs text-muted">Дэлгэрэнгүй тайлбарыг «书写» хэсгийн даалгавар бүрээс харна.</p>
        </Card>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => setReview("listening")}>听力 тайлбар</Button>
        <Button variant="outline" onClick={() => setReview("reading")}>阅读 тайлбар</Button>
      </div>
      <Button className="mt-2 w-full" onClick={onClose}>Дуусгах</Button>
    </Page>
  );
}
