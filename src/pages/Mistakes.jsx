import { useState } from "react";
import listening from "../data/listening.json";
import reading from "../data/reading.json";
import grammar from "../data/grammar.json";
import { useStore, update } from "../lib/store.js";
import { grammarItems } from "./Grammar.jsx";
import { PracticeSet } from "../components/PracticeSet.jsx";
import { Page, Card, Button, Pill, Empty, cx } from "../components/ui.jsx";

const KIND = {
  listening: { label: "听力", section: "listening" },
  reading: { label: "阅读", section: "reading" },
  grammar: { label: "语法", section: "writing" },
};

const ALL_GRAMMAR = grammar.flatMap(grammarItems);

export function findItem(kind, qid) {
  if (kind === "listening") return listening.items.find((x) => x.id === qid);
  if (kind === "reading") return reading.items.find((x) => x.id === qid);
  if (kind === "grammar") return ALL_GRAMMAR.find((x) => x.id === qid);
  return null;
}

export default function Mistakes() {
  const mistakes = useStore((s) => s.mistakes);
  const [filter, setFilter] = useState("open");
  const [drill, setDrill] = useState(null);

  const list = mistakes
    .filter((m) => (filter === "open" ? !m.resolved : m.resolved))
    .map((m) => ({ ...m, item: findItem(m.kind, m.qid) }))
    .filter((m) => m.item && KIND[m.kind])
    .sort((a, b) => b.at - a.at);

  if (drill) {
    return (
      <Page title={`${KIND[drill.kind].label} алдаа давтах`}>
        {/* Багцыг эхлэх үед хадгална — зөв хариулахад жагсаалтаас хасагдаж багц багасахгүйн тулд. */}
        <PracticeSet
          items={drill.items}
          section={KIND[drill.kind].section}
          kind={drill.kind}
          task="mistakes"
          onExit={() => setDrill(null)}
        />
      </Page>
    );
  }

  const kinds = [...new Set(list.map((m) => m.kind))];

  return (
    <Page title="Алдааны дэвтэр" back="#/practice">
      <div className="mb-4 flex rounded-xl bg-line p-1 text-sm">
        {[
          ["open", "Шийдээгүй"],
          ["done", "Шийдсэн"],
        ].map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className={cx("flex-1 rounded-lg py-1.5", filter === k && "bg-surface font-medium shadow-sm")}>
            {label}
          </button>
        ))}
      </div>

      {filter === "open" && kinds.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          {kinds.map((k) => (
            <Button key={k} variant="outline" onClick={() => setDrill({ kind: k, items: list.filter((m) => m.kind === k).map((m) => m.item) })}>
              <span className="ko" lang="zh-CN">{KIND[k].label}</span> {list.filter((m) => m.kind === k).length}
            </Button>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <Empty>{filter === "open" ? "Шийдээгүй алдаа алга. Буруу хариулсан асуулт энд автоматаар нэмэгдэнэ." : "Одоохондоо шийдсэн алдаа алга."}</Empty>
      ) : (
        <div className="space-y-2">
          {list.map((m) => (
            <Card key={m.key} className="p-3">
              <div className="mb-1 flex items-center gap-2">
                <Pill tone={KIND[m.kind].section}>{KIND[m.kind].label}</Pill>
                {m.count > 1 && <Pill tone="mistakes">{m.count} удаа</Pill>}
                <span className="ml-auto text-xs text-muted">{new Date(m.at).toLocaleDateString("mn-MN")}</span>
              </div>
              <p className="ko line-clamp-2 text-sm" lang="zh-CN">
                {m.item.passage ?? m.item.script?.map((l) => l.t).join(" ") ?? m.item.question}
              </p>
              {filter === "done" && (
                <button
                  className="mt-1 text-xs text-muted underline"
                  onClick={() =>
                    update((s) => {
                      const x = s.mistakes.find((y) => y.key === m.key);
                      if (x) x.resolved = false;
                    })
                  }
                >
                  Дахин нээх
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </Page>
  );
}
