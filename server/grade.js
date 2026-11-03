import Anthropic from "@anthropic-ai/sdk";

// HSK 书写 оноо (апп доторх хуваарь): 完成句子 4, 写汉字 4, 看词写句 10, 短文 (80字) 30.
// arrange/hanzi-г клиент шууд шалгадаг ч сервер мөн дэмжинэ.
export const MAX_SCORE = { arrange: 4, hanzi: 4, sentence: 10, essay: 30 };

const CRITERIA = {
  arrange: "完成句子（HSK 3/4）：用所给词语组成正确的句子。语序完全正确且使用了全部词语得4分；语序基本正确、有小错误得2分；不成句得0分。",
  hanzi: "看拼音写汉字（HSK 3）：每个空汉字完全正确得满分，错字、别字、拼音不对应得0分。criteria 按空分项。",
  sentence: "看词写句（HSK 4）：词语使用（必须使用所给词语，且用法、搭配正确）4分 / 语法与语序 4分 / 句子完整、意思清楚、汉字书写正确 2分。没有使用所给词语最多得2分。",
  essay: "短文（HSK 5，80字左右）：内容与任务完成（5个词语全部使用、用法正确、内容连贯有意义）10分 / 结构与连贯（开头-发展-结尾，关联词运用）6分 / 语言（语法准确、词汇丰富、汉字正确、标点）14分。每少用一个词语扣2分；字数明显不足60字或超过120字酌情扣分。",
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["score", "criteria", "corrected", "summary_mn", "corrections"],
  properties: {
    score: { type: "integer", description: "Нийт оноо" },
    criteria: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "score", "max", "comment_mn"],
        properties: {
          name: { type: "string", description: "Шалгуурын нэр (хятадаар, жишээ: 词语使用)" },
          score: { type: "integer" },
          max: { type: "integer" },
          comment_mn: { type: "string" },
        },
      },
    },
    corrected: { type: "string", description: "Засварласан хувилбар (хятадаар, 简体字)" },
    summary_mn: { type: "string", description: "Ерөнхий дүгнэлт, дараагийн алхам (монголоор)" },
    corrections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["original", "fixed", "why_mn"],
        properties: {
          original: { type: "string" },
          fixed: { type: "string" },
          why_mn: { type: "string" },
        },
      },
    },
  },
};

const SYSTEM = `你是HSK书写部分的阅卷老师。请严格、一致地按照评分标准打分，不要给分过宽。
学习者是蒙古人，从零开始学习汉语，目标是HSK 3–5级。反馈（comment_mn、summary_mn、why_mn）必须用蒙古语西里尔字母书写，简短、具体，适合初学者理解。
corrected 是在尽量保留学习者原有内容和结构的基础上，修改语法、词汇和汉字错误后的简体中文答案（不要重写成新文章）。
corrections 中最多列出8个最重要的错误。
criteria 的 max 之和必须等于本题满分，score 必须等于各项 criteria score 之和。`;

export async function gradeWriting({ task, prompt, answer, words }) {
  const max = Object.hasOwn(MAX_SCORE, task) ? MAX_SCORE[task] : null;
  if (!max || typeof answer !== "string" || !answer.trim()) {
    return { status: 400, json: { error: "task (arrange/hanzi/sentence/essay) болон answer шаардлагатай." } };
  }
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return {
      status: 503,
      json: { error: "AI үнэлгээ тохируулагдаагүй байна: .env.local файлд ANTHROPIC_API_KEY нэмнэ үү." },
    };
  }

  const client = new Anthropic();
  const wordList = Array.isArray(words) && words.length ? `
必须使用的词语：${words.join("、")}` : "";
  const user = `题型：${task}（满分 ${max}分）
评分标准：${CRITERIA[task]}${wordList}

<题目>
${prompt}
</题目>

<学生答案 字数="${answer.replace(/\s/g, "").length}">
${answer}
</学生答案>`;

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
    });

    if (response.stop_reason === "refusal") {
      return { status: 422, json: { error: "AI энэ хариултыг үнэлэхээс татгалзлаа. Текстээ шалгаад дахин оролдоно уу." } };
    }
    if (response.stop_reason === "max_tokens") {
      return { status: 502, json: { error: "AI-ийн хариу дутуу тасарлаа. Дахин оролдоно уу." } };
    }
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const result = JSON.parse(text);
    result.score = Math.max(0, Math.min(max, result.score));
    return { status: 200, json: { ...result, max } };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { status: 503, json: { error: "API түлхүүр буруу байна." } };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { status: 429, json: { error: "Хүсэлт хэт олон байна. Хэсэг хүлээгээд дахин оролдоно уу." } };
    }
    if (error instanceof Anthropic.APIError) {
      return { status: 502, json: { error: `AI үйлчилгээний алдаа (${error.status}).` } };
    }
    if (error instanceof SyntaxError) {
      return { status: 502, json: { error: "AI-ийн хариуг уншиж чадсангүй. Дахин оролдоно уу." } };
    }
    return { status: 500, json: { error: "Сүлжээний алдаа. Дахин оролдоно уу." } };
  }
}
