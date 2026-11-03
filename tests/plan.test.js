import { test } from "node:test";
import assert from "node:assert/strict";
import { dayInfo, tasksForDay, newWordsPerDay, adjustWeights } from "../src/lib/plan.js";
import { addDays } from "../src/lib/dates.js";

const profile = { startDate: "2026-11-02", examDate: "2026-12-28", minutesPerDay: 90, targetLevel: 4 }; // 56 хоног

test("56 хоногт 8 долоо хоног, үе шатууд дарааллаараа", () => {
  const phases = [];
  for (let i = 0; i < 56; i++) {
    const info = dayInfo(profile, addDays(profile.startDate, i));
    if (phases.at(-1) !== info.phase.id) phases.push(info.phase.id);
    assert.ok(info.week >= 1 && info.week <= 8);
  }
  assert.deepEqual(phases, ["foundation", "intensify", "deep", "mock", "final"]);
});

test("богино (21 хоног) хугацаанд ч бүх үе шат орно", () => {
  const p = { ...profile, examDate: addDays(profile.startDate, 21) };
  const seen = new Set();
  for (let i = 0; i < 21; i++) seen.add(dayInfo(p, addDays(p.startDate, i)).phase.id);
  assert.equal(seen.size, 5);
});

test("энгийн өдрийн даалгаврын нийт минут өдрийн цагтай ойролцоо", () => {
  for (let i = 0; i < 40; i++) {
    const tasks = tasksForDay(profile, {}, addDays(profile.startDate, i));
    if (tasks.some((t) => t.kind === "mock")) continue;
    const sum = tasks.reduce((s, t) => s + t.minutes, 0);
    assert.ok(Math.abs(sum - 90) <= 15, `өдөр ${i}: ${sum} мин`);
  }
});

test("7-р долоо хоногт 2–3 жишиг шалгалт", () => {
  let mocks = 0;
  for (let i = 0; i < 56; i++) {
    const d = addDays(profile.startDate, i);
    if (dayInfo(profile, d).week === 7 && tasksForDay(profile, {}, d).some((t) => t.kind === "mock")) mocks++;
  }
  assert.ok(mocks >= 2 && mocks <= 3, `${mocks}`);
});

test("сул хэсэгт илүү цаг оногдоно", () => {
  const base = { vocab: 0.25, listening: 0.25, reading: 0.25, grammar: 0.25 };
  const w = adjustWeights(base, { listening: 0.3, reading: 0.9 });
  assert.ok(w.listening > w.reading);
  assert.ok(Math.abs(Object.values(w).reduce((a, b) => a + b) - 1) < 1e-9);
});

test("шалгалтаас 7 хоногийн өмнөөс шинэ үг үзэхгүй", () => {
  assert.equal(newWordsPerDay(profile, 50, addDays(profile.examDate, -5)), 0);
  assert.ok(newWordsPerDay(profile, 72, profile.startDate) >= 3);
});
