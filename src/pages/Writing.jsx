import { useEffect, useState } from "react";
import writing from "../data/writing.json";
import { update, useStore, markTask } from "../lib/store.js";
import { today } from "../lib/dates.js";
import { MAX_SCORE, TASK_LABEL, isAuto, countChars, emptyAnswer, answerText, hasAnswer, promptText, autoGrade } from "../lib/writing.js";
import { Page, Card, Button, Bar, Pill, Bow, cx } from "../components/ui.jsx";

export { countChars };

const COLS = 20; // 方格纸 нэг мөрөнд 20 нүд

function draftKey(id) {
  return `hsk-sprint:draft:${id}`;
}
function loadDraft(id) {
  try {
    return JSON.parse(localStorage.getItem(draftKey(id)));
  } catch {
    return null;
  }
}
function saveDraft(id, value) {
  try {
    localStorage.setItem(draftKey(id), JSON.stringify(value));
  } catch {
    /* хувийн цонх г.м. */
  }
}

export default function Writing() {
  const [open, setOpen] = useState(null);
  const writings = useStore((s) => s.writings);
  const task = writing.find((w) => w.id === open);

  if (task) return <Task task={task} onClose={() => setOpen(null)} />;

  return (
    <Page title="书写 · Бичих" back="#/practice">
      <div className="space-y-2">
        {writing.map((w) => {
          const last = [...writings].reverse().find((x) => x.id === w.id && x.result);
          return (
            <button key={w.id} onClick={() => setOpen(w.id)} className="block w-full text-left">
              <Card className="flex items-center gap-3 hover:bg-line/40">
                <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-writing-soft text-sm font-bold text-writing">
                  HSK{w.level}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{w.title}</p>
                  <p className="text-sm text-muted">
                    {MAX_SCORE[w.task]} оноо{w.task === "essay" ? ` · ${w.min}–${w.max} ханз` : ""}
                    {isAuto(w) ? " · шууд шалгана" : " · AI үнэлгээ"}
                  </p>
                </div>
                {last && (
                  <Pill tone="writing">
                    {last.result.score}/{last.result.max}
                  </Pill>
                )}
              </Card>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        完成句子 ба 写汉字 даалгаврыг апп шууд шалгана. 看词写句 ба 短文-ийг AI нь HSK-ийн шалгуураар (内容 · 结构 · 语言) үнэлж, засварласан
        хувилбар болон монгол тайлбар гаргана. Бодит шалгагчийн оноотой зөрж болно — чиг хандлагаа харахад ашиглаарай.
      </p>
    </Page>
  );
}

function Grid({ text, cells }) {
  // Мөр шилжилтийг шинэ мөр болгож, мөрийн үлдэгдлийг хоосон нүдээр дүүргэнэ.
  const out = [];
  for (const para of text.split("\n")) {
    const chars = [...para.replace(/\s/g, "")];
    for (let i = 0; i < Math.max(1, chars.length); i += COLS) {
      const row = chars.slice(i, i + COLS);
      while (row.length < COLS) row.push("");
      out.push(...row);
    }
  }
  while (out.length < cells) out.push("");
  return (
    <div className="overflow-x-auto">
      <div className="ko grid min-w-[20rem] border-l border-t border-writing/40" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }} lang="zh-CN">
        {out.map((c, i) => (
          <div key={i} className={cx("relative grid aspect-square place-items-center border-b border-r border-writing/40 text-[13px]", (i + 1) % 100 === 0 && "bg-writing-soft")}>
            {c}
          </div>
        ))}
      </div>
    </div>
  );
}

/** 完成句子: үгийн чипүүдийг дарж өгүүлбэр угсрах. value = индексийн массив. */
export function ArrangeInput({ task, value, onChange }) {
  const used = new Set(value);
  return (
    <div className="space-y-3">
      <div className="ko flex min-h-14 flex-wrap items-center gap-1.5 rounded-xl border border-dashed border-writing/50 bg-surface p-2 text-[17px]" lang="zh-CN">
        {value.length === 0 && <span className="px-1 text-sm text-muted">Доорх үгсийг дарааллаар нь дар</span>}
        {value.map((idx, pos) => (
          <button
            key={`${idx}-${pos}`}
            onClick={() => onChange(value.filter((_, p) => p !== pos))}
            className="rounded-lg bg-writing-soft px-2.5 py-1 font-medium text-writing"
            title="Буцааж авах"
          >
            {task.words[idx]}
          </button>
        ))}
        {value.length === task.words.length && <span className="text-lg">。</span>}
      </div>
      <div className="ko flex flex-wrap gap-1.5 text-[17px]" lang="zh-CN">
        {task.words.map((w, idx) => (
          <button
            key={idx}
            disabled={used.has(idx)}
            onClick={() => onChange([...value, idx])}
            className={cx("rounded-lg border border-line px-2.5 py-1", used.has(idx) ? "opacity-30" : "bg-surface hover:border-writing")}
          >
            {w}
          </button>
        ))}
        {value.length > 0 && (
          <button onClick={() => onChange([])} className="ml-auto text-sm text-muted underline">
            Арилгах
          </button>
        )}
      </div>
    </div>
  );
}

/** 写汉字: пиньинь бүрт ханз бичих нүд. value = мөрийн массив. */
export function HanziInput({ task, value, onChange }) {
  return (
    <div className="space-y-3">
      {task.blanks.map((b, i) => (
        <label key={b.label} className="flex items-center gap-3">
          <span className="w-6 text-lg text-writing">{b.label}</span>
          <span className="w-16 text-[15px] font-medium">{b.pinyin}</span>
          <input
            value={value[i] ?? ""}
            onChange={(e) => onChange(value.map((a, j) => (j === i ? e.target.value : a)))}
            className="ko min-h-12 w-24 rounded-xl border border-line bg-surface px-3 text-center text-xl outline-none focus:border-writing"
            lang="zh-CN"
            maxLength={4}
            placeholder="汉字"
          />
        </label>
      ))}
    </div>
  );
}

/** Даалгаврын нөхцөл (заавар, үгс, текст). */
export function TaskPrompt({ task, compact = false }) {
  return (
    <>
      <p className={cx("ko font-medium leading-relaxed", compact ? "text-sm" : "text-[15px]")} lang="zh-CN">{task.instruction}</p>
      {task.instruction_mn && <p className="text-sm text-muted">{task.instruction_mn}</p>}
      {task.text && (
        <div className={cx("ko whitespace-pre-line rounded-xl border border-line bg-bg p-3 leading-8", compact ? "text-[15px]" : "text-lg")} lang="zh-CN">
          {task.text}
        </div>
      )}
      {task.words && task.task !== "arrange" && (
        <div className="ko flex flex-wrap gap-1.5" lang="zh-CN">
          {task.words.map((w) => (
            <span key={w} className="rounded-lg bg-writing-soft px-2.5 py-1 text-[17px] font-medium text-writing">{w}</span>
          ))}
        </div>
      )}
    </>
  );
}

function Task({ task, onClose }) {
  const [answer, setAnswer] = useState(() => {
    const d = loadDraft(task.id);
    const empty = emptyAnswer(task);
    return d != null && Array.isArray(d) === Array.isArray(empty) ? d : empty;
  });
  const [view, setView] = useState("text");
  const [state, setState] = useState({ loading: false, error: null, result: null });

  useEffect(() => saveDraft(task.id, answer), [task.id, answer]);

  const isText = task.task === "sentence" || task.task === "essay";
  const n = isText ? countChars(answer) : 0;
  const inRange = isText && n >= task.min && n <= task.max;
  const canSubmit = isText ? n >= Math.min(task.min, task.task === "essay" ? 30 : 4) : hasAnswer(task, answer);

  function save(result) {
    update((s) => {
      s.writings.push({ id: task.id, task: task.task, answer: answerText(task, answer), result, at: Date.now() });
    });
  }

  async function submit() {
    // Бичээд илгээсэн бол (AI үнэлгээ ажиллахгүй байсан ч) өнөөдрийн 书写 даалгавар биелнэ.
    markTask(`${today()}:writing`);
    const local = autoGrade(task, answer);
    if (local) {
      setState({ loading: false, error: null, result: local });
      save(local);
      return;
    }
    setState({ loading: true, error: null, result: null });
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: task.task, prompt: promptText(task), answer: answerText(task, answer), words: task.words ?? [] }),
      });
      const json = await res.json().catch(() => ({ error: "Серверээс буруу хариу ирлээ." }));
      if (!res.ok) throw new Error(json.error ?? `Алдаа (${res.status})`);
      setState({ loading: false, error: null, result: json });
      save(json);
    } catch (e) {
      setState({ loading: false, error: e.message, result: null });
    }
  }

  const missing = task.task === "essay" ? task.words.filter((w) => !answer.includes(w)) : [];

  return (
    <Page title={task.title} action={<button className="text-sm text-muted" onClick={onClose}>Хаах</button>}>
      <Card className="relative space-y-3">
        <Bow className="absolute -right-2 -top-3 w-10 rotate-12" />
        <TaskPrompt task={task} />
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-writing">Зөвлөмж</summary>
          <p className="mt-1 leading-relaxed text-muted">{task.tips_mn}</p>
        </details>
      </Card>

      <div className="mt-4">
        {task.task === "arrange" && <ArrangeInput task={task} value={answer} onChange={setAnswer} />}
        {task.task === "hanzi" && <HanziInput task={task} value={answer} onChange={setAnswer} />}
        {isText && (
          <>
            <div className="mb-2 flex items-center justify-between">
              {task.task === "essay" ? (
                <div className="flex rounded-lg bg-line p-0.5 text-sm">
                  {[["text", "Бичих"], ["grid", "方格纸"]].map(([k, label]) => (
                    <button key={k} onClick={() => setView(k)} className={cx("rounded-md px-3 py-1", view === k && "bg-surface shadow-sm")}>
                      {label}
                    </button>
                  ))}
                </div>
              ) : (
                <span />
              )}
              <span className={cx("text-sm tabular-nums", inRange ? "text-good" : n > task.max ? "text-bad" : "text-muted")}>
                {n} / {task.min}–{task.max} ханз
              </span>
            </div>
            {task.task === "essay" && <Bar value={(n / task.max) * 100} tone={n > task.max ? "mistakes" : "writing"} className="mb-2" />}
            {view === "text" || task.task !== "essay" ? (
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={task.task === "essay" ? 8 : 3}
                className="ko w-full rounded-xl border border-line bg-surface p-3 text-[17px] leading-8 outline-none focus:border-writing"
                lang="zh-CN"
                placeholder={task.task === "essay" ? "在这里写短文…" : `用“${task.words[0]}”写一个句子…`}
              />
            ) : (
              <Grid text={answer} cells={task.max} />
            )}
            {task.task === "essay" && missing.length > 0 && n > 0 && (
              <p className="mt-1 text-sm text-muted">
                Ашиглаагүй үг: <span className="ko text-writing" lang="zh-CN">{missing.join("、")}</span>
              </p>
            )}
          </>
        )}
      </div>

      <Button className="mt-4 w-full" disabled={!canSubmit || state.loading} onClick={submit}>
        {state.loading ? "AI үнэлж байна… (20–40 сек)" : isAuto(task) ? "Шалгах" : "AI-аар үнэлүүлэх"}
      </Button>

      {state.error && (
        <Card className="mt-4 border-bad/40">
          <p className="text-sm font-medium text-bad">{state.error}</p>
          {task.model && (
            <div className="mt-3 text-sm">
              <p className="font-medium">Жишиг хариулт — өөрөө харьцуулж шалгаарай:</p>
              <p className="ko mt-1 text-[15px] leading-7" lang="zh-CN">{Array.isArray(task.model) ? task.model.join(" / ") : task.model}</p>
            </div>
          )}
        </Card>
      )}

      {state.result && <Result result={state.result} task={task} />}
    </Page>
  );
}

export function Result({ result, task }) {
  return (
    <div className="mt-4 space-y-3">
      <Card>
        <div className="flex items-baseline justify-between">
          <span className="font-semibold">{result.auto ? "Дүн" : "AI үнэлгээ"}</span>
          <span className="text-3xl font-bold tabular-nums text-writing">
            {result.score}
            <span className="text-base text-muted">/{result.max}</span>
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {result.criteria.map((c) => (
            <div key={c.name}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="ko font-medium" lang="zh-CN">{c.name}</span>
                <span className="tabular-nums text-muted">
                  {c.score}/{c.max}
                </span>
              </div>
              <Bar value={(c.score / c.max) * 100} tone="writing" />
              <p className="mt-1 text-sm leading-relaxed text-muted">{c.comment_mn}</p>
            </div>
          ))}
        </div>
      </Card>
      {result.summary_mn && (
        <Card>
          <p className="text-sm font-medium">Дүгнэлт</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{result.summary_mn}</p>
        </Card>
      )}
      {result.corrections?.length > 0 && (
        <Card className="space-y-3">
          <p className="text-sm font-medium">Засвар</p>
          {result.corrections.map((c, i) => (
            <div key={i} className="text-sm">
              <p className="ko text-[15px]" lang="zh-CN">
                <span className="text-bad line-through decoration-bad/60">{c.original}</span>
                <span className="mx-1.5 text-muted">→</span>
                <span className="font-medium text-good">{c.fixed}</span>
              </p>
              <p className="mt-0.5 text-muted">{c.why_mn}</p>
            </div>
          ))}
        </Card>
      )}
      <Card>
        <p className="text-sm font-medium">{result.auto ? "Зөв хариулт" : "Засварласан хувилбар"}</p>
        <p className="ko mt-2 whitespace-pre-line text-[17px] leading-8" lang="zh-CN">{result.corrected}</p>
        {!result.auto && task?.model && (
          <>
            <p className="mt-3 text-sm font-medium">Жишиг хариулт</p>
            <p className="ko mt-1 text-[15px] leading-7 text-muted" lang="zh-CN">{Array.isArray(task.model) ? task.model.join(" / ") : task.model}</p>
          </>
        )}
      </Card>
    </div>
  );
}
