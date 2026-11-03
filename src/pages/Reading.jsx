import { useState } from "react";
import reading from "../data/reading.json";
import { PracticeSet, TypeFilter } from "../components/PracticeSet.jsx";
import { Page, Button, Card } from "../components/ui.jsx";

// Бодит HSK 3: 30 асуулт / 30 мин ≈ асуулт бүрт 60 секунд (HSK 4–5-д ~1 мин 10 сек орчим).
const SECONDS_PER_ITEM = 60;

const STRATEGY = {
  match: "Асуулт ба хариултыг тааруул: 什么 → юм, 谁 → хүн, 哪儿 → газар, 几/多少 → тоо, 什么时候 → цаг гэсэн асуух үгийг эхлээд ол.",
  blank: "Хоосон зайны өмнө, хойно юу байгааг хар: 很 + тэмдэг нэр, 一 + 本/个 (тооны нэр), үйл үг + 了/过. Үгийн аймгаар нь сонголтыг хасаж болно.",
  true_false: "★ өгүүлбэрийг эх бичвэртэй үг үгээр нь тулга. 不/没 үгүйсгэл, 都/只/也, тоо, цагт онцгой анхаар — нэг үг л утгыг эсрэг болгоно.",
  detail: "Эхлээд асуултаа уншаад, дараа нь бичвэрээс түлхүүр үгийг хай. Сонголт бүрийг эх бичвэртэй тулга — тоо, цаг, үгүйсгэлд анхаар.",
  order: "Эхний өгүүлбэрт 但是、所以、他/她/这 зэрэг холбох, заах үг байдаггүй. 因为…所以…, 虽然…但是…, 先…然后… хослолыг ажигла.",
};

export default function Reading() {
  const [type, setType] = useState("all");
  const [running, setRunning] = useState(false);
  const items = reading.items.filter((x) => type === "all" || x.type === type);

  return (
    <Page title="阅读 · Унших" back={running ? undefined : "#/practice"}>
      {running ? (
        <PracticeSet items={items} section="reading" kind="reading" secondsPerItem={SECONDS_PER_ITEM} onExit={() => setRunning(false)} />
      ) : (
        <>
          <TypeFilter types={reading.types} items={reading.items} value={type} onChange={setType} section="reading" />
          <Card className="text-sm leading-relaxed">
            <p className="font-medium text-reading">Стратеги</p>
            <p className="mt-1 text-muted">
              {type === "all" ? "Асуулт бүрт ~1 мин. Нэг асуултад гацвал алгасаад буцаж ир — HSK-д буруу хариултад оноо хасдаггүй тул хоосон бүү орхи." : STRATEGY[type]}
            </p>
          </Card>
          <Button className="mt-4 w-full" disabled={!items.length} onClick={() => setRunning(true)}>
            {items.length} асуулт · {Math.ceil((items.length * SECONDS_PER_ITEM) / 60)} мин
          </Button>
        </>
      )}
    </Page>
  );
}
