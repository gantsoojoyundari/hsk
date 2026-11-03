import { test } from "node:test";
import assert from "node:assert/strict";
import { beginnerState, beginnerTasks } from "../src/lib/beginner.js";
import { pinyin } from "pinyin-pro";
import hangul from "../src/data/pinyin.json" with { type: "json" };
import vocab from "../src/data/vocab.json" with { type: "json" };

test("эхлэгч: эхэндээ зөвхөн үсгийн даалгавар", () => {
  const b = beginnerState({});
  assert.deepEqual(beginnerTasks(b, "2026-11-02").map((t) => t.kind), ["hangul"]);
  assert.equal(b.graduated, false);
});

test("эхлэгч: үндсэн пиньинь → үг нээгдэнэ; 40/60 үг → сонсгол/өгүүлбэр", () => {
  const hs = Object.fromEntries(hangul.letters.filter((l) => ["consonant", "vowel", "tone"].includes(l.group)).map((l) => [l.id, 2]));
  const basics = vocab.words.filter((w) => w.topic === "basic");
  const srs = (n) => Object.fromEntries(basics.slice(0, n).map((w) => [w.id, { due: "2026-11-03" }]));
  assert.deepEqual(beginnerTasks(beginnerState({ hangul: hs }), "d").map((t) => t.kind), ["hangul", "vocab"]);
  assert.deepEqual(beginnerTasks(beginnerState({ hangul: hs, srs: srs(40) }), "d").map((t) => t.kind), ["hangul", "vocab", "listening"]);
  assert.deepEqual(beginnerTasks(beginnerState({ hangul: hs, srs: srs(60) }), "d").map((t) => t.kind), ["hangul", "vocab", "listening", "sentence"]);
});

test("эхлэгч: бүх пиньинь + бүх анхан шатны үг → төгссөн", () => {
  const hs = Object.fromEntries(hangul.letters.map((l) => [l.id, 2]));
  const srs = Object.fromEntries(vocab.words.filter((w) => w.topic === "basic").map((w) => [w.id, {}]));
  assert.equal(beginnerState({ hangul: hs, srs }).graduated, true);
});

test("пиньинь: тэмдэгтэй, 多音字-г контекстоор", () => {
  assert.equal(pinyin("你好"), "nǐ hǎo");
  assert.equal(pinyin("银行"), "yín háng");
  assert.equal(pinyin("我们"), "wǒ men");
});
