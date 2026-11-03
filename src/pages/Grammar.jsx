import { useState } from "react";
import grammar from "../data/grammar.json";
import { useStore } from "../lib/store.js";
import { playClips } from "../lib/sound.js";
import { PracticeSet } from "../components/PracticeSet.jsx";
import { Page, Card, Button, Pill, Ko } from "../components/ui.jsx";

export function grammarItems(g) {
  return g.exercise.map((ex, i) => ({
    id: `${g.id}:${i}`,
    question: "( ) хоосон зайд тохирох үгийг сонгоно уу.",
    passage: ex.q,
    options: ex.options,
    answer: ex.answer,
    explain_mn: ex.explain_mn,
  }));
}

export default function Grammar() {
  const [open, setOpen] = useState(null);
  const [drill, setDrill] = useState(false);
  const mistakes = useStore((s) => s.mistakes);
  const g = grammar.find((x) => x.id === open);

  if (g) {
    const close = (
      <button
        className="text-sm text-muted"
        onClick={() => {
          setOpen(null);
          setDrill(false);
        }}
      >
        Хаах
      </button>
    );
    return (
      <Page title={<span className="ko" lang="zh-CN">{g.pattern}</span>} action={close}>
        {drill ? (
          <PracticeSet items={grammarItems(g)} section="writing" kind="grammar" onExit={() => setDrill(false)} />
        ) : (
          <div className="space-y-3">
            <Card>
              <p className="text-lg font-semibold">{g.meaning_mn}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{g.explain_mn}</p>
            </Card>
            <Card className="space-y-3">
              <p className="text-sm font-medium text-muted">Жишээ</p>
              {g.examples.map((e, i) => (
                <div key={i} className="flex gap-2">
                  <button
                    onClick={() => playClips([`grammar/${g.id}-${i}`], e.ko)}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-sm hover:bg-bg"
                    aria-label="Сонсох"
                  >
                    🔊
                  </button>
                  <div>
                    <Ko text={e.ko} className="leading-relaxed" galigClassName="text-sm" />
                    <p className="text-sm text-muted">{e.mn}</p>
                  </div>
                </div>
              ))}
            </Card>
            <Card className="space-y-3">
              <p className="text-sm font-medium text-muted">Ойролцоо хэв маягтай харьцуулах</p>
              {g.compare.map((c, i) => (
                <div key={i} className="text-sm">
                  <span className="ko font-semibold text-writing" lang="zh-CN">{c.pattern}</span>
                  <p className="mt-0.5 leading-relaxed text-muted">{c.note_mn}</p>
                </div>
              ))}
            </Card>
            <Button className="w-full" onClick={() => setDrill(true)}>
              Дасгал ажиллах ({g.exercise.length})
            </Button>
          </div>
        )}
      </Page>
    );
  }

  return (
    <Page title="Дүрмийн сан" back="#/practice">
      <Card className="divide-y divide-line p-0">
        {grammar.map((x) => {
          const wrong = mistakes.some((m) => !m.resolved && m.kind === "grammar" && m.qid.startsWith(`${x.id}:`));
          return (
            <button key={x.id} onClick={() => setOpen(x.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-line/40">
              <div className="min-w-0 flex-1">
                <p className="ko font-semibold" lang="zh-CN">{x.pattern}</p>
                <p className="truncate text-sm text-muted">{x.meaning_mn}</p>
              </div>
              {wrong && <Pill tone="mistakes">алдаатай</Pill>}
              <span className="text-muted">›</span>
            </button>
          );
        })}
      </Card>
    </Page>
  );
}
