import { test } from "node:test";
import assert from "node:assert/strict";
import { review, buildQueue, markKnown, NEW_CARD, LADDER } from "../src/lib/srs.js";
import { streak } from "../src/lib/streak.js";

const D = "2026-11-02";

test("шинэ карт: good → 1 хоног, easy → 3 хоног", () => {
  assert.equal(review(NEW_CARD, "good", D).due, "2026-11-03");
  assert.equal(review(NEW_CARD, "easy", D).due, "2026-11-05");
});

test("интервал өсөж, 60 хоногоос хэтрэхгүй", () => {
  let c = NEW_CARD;
  const seen = [];
  for (let i = 0; i < 12; i++) {
    c = review(c, "good", D);
    seen.push(c.interval);
  }
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i] >= seen[i - 1]);
  assert.equal(seen.at(-1), 60);
});

test("again: өнөөдөр дахин гарч, lapse тоологдоно, ease буурна", () => {
  const learned = review(review(NEW_CARD, "good", D), "good", D);
  const c = review(learned, "again", D);
  assert.equal(c.due, D);
  assert.equal(c.reps, 0);
  assert.equal(c.lapses, 1);
  assert.ok(c.ease < learned.ease);
  assert.ok(review(c, "again", D).ease >= 1.3);
});

test("дараалал: хоцорсон нь эхэнд, шинэ үг хязгаартай", () => {
  const words = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
  const srs = { a: { ...NEW_CARD, reps: 1, due: "2026-11-02" }, b: { ...NEW_CARD, reps: 1, due: "2026-10-30" }, c: { ...NEW_CARD, reps: 1, due: "2026-11-09" } };
  const q = buildQueue(words, srs, { newLimit: 1, now: D });
  assert.deepEqual(q.due, ["b", "a"]);
  assert.deepEqual(q.fresh, ["d"]);
});

test("streak: өнөөдөр хийгээгүй ч өчигдрөөс тасраагүй бол хадгалагдана", () => {
  const act = { reviews: 3, done: {} };
  const log = { "2026-10-31": act, "2026-11-01": act };
  assert.equal(streak(log, D), 2);
  assert.equal(streak({ ...log, [D]: act }, D), 3);
  assert.equal(streak({ "2026-10-30": act }, D), 0);
});

test("markKnown: шинэ үгийн дараалал болон өнөөдрийн давталтаас гарна", () => {
  const srs = { a: markKnown(undefined, D) };
  assert.equal(srs.a.interval, 60);
  assert.equal(srs.a.due, "2027-01-01");
  const q = buildQueue([{ id: "a" }, { id: "b" }], srs, { newLimit: 10, now: D });
  assert.deepEqual(q, { due: [], fresh: ["b"] });
});

test("шат: зөв бүрт 1→3→7→14→30→60, алдвал эхнээс", () => {
  let c = NEW_CARD;
  const seen = [];
  for (let i = 0; i < 7; i++) {
    c = review(c, "good", D);
    seen.push(c.interval);
  }
  assert.deepEqual(seen, [...LADDER, 60]);
  c = review(c, "again", D);
  assert.equal(c.due, D);
  assert.equal(review(c, "good", D).interval, 1);
});
