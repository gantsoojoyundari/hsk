import { useState } from "react";
import listening from "../data/listening.json";
import { PracticeSet, TypeFilter } from "../components/PracticeSet.jsx";
import { Page, Button, Card } from "../components/ui.jsx";

export default function Listening() {
  const [type, setType] = useState("all");
  const [running, setRunning] = useState(false);
  const items = listening.items.filter((x) => type === "all" || x.type === type);

  return (
    <Page title="听力 · Сонсгол" back={running ? undefined : "#/practice"}>
      {running ? (
        <PracticeSet items={items} section="listening" kind="listening" onExit={() => setRunning(false)} />
      ) : (
        <>
          <a href="#/easy-listening" className="mb-4 block">
            <Card className="flex items-center gap-3 border-accent hover:bg-line/40">
              <span className="text-2xl">🎧</span>
              <div className="flex-1">
                <p className="font-semibold">Энгийн сонсгол (эхлэгч)</p>
                <p className="text-sm text-muted">Энгийн үг, богино өгүүлбэр сонсоод утгыг нь сонгоно</p>
              </div>
              <span className="text-muted">›</span>
            </Card>
          </a>
          <p className="mb-2 text-sm font-semibold text-muted">HSK сонсгол (шалгалтын хэлбэр)</p>
          <TypeFilter types={listening.types} items={listening.items} value={type} onChange={setType} section="listening" />
          <Card className="space-y-2 text-sm leading-relaxed text-muted">
            <p>
              Бодит HSK-д сонсголын бичлэг бүрийг <b className="text-ink">хоёр удаа</b> (HSK 5–6-д нэг удаа) сонсгоно. Дадлагад дахин
              сонсож болох ч эхний удаад хариулахыг хичээгээрэй.
            </p>
            <p>Аялгад (声调) анхаар — mǎi (авах) ба mài (зарах) шиг аялга л ялгаатай үгс олон. Хурдыг 1.1–1.2x болгож дасвал шалгалтын хурд амар санагдана. Transcript нь хариулсны дараа нээгдэнэ.</p>
          </Card>
          <Button className="mt-4 w-full" disabled={!items.length} onClick={() => setRunning(true)}>
            {items.length} асуулт эхлүүлэх
          </Button>
        </>
      )}
    </Page>
  );
}
