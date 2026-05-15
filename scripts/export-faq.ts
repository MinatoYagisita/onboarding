// モックで回答可能な質問と回答を、PM テスト用の Markdown として出力するスクリプト。
// 実行: pnpm run export-faq
// 出力: output/supported-questions.md（1ファイルに集約）

import { promises as fs } from "node:fs";
import path from "node:path";
import { FAQ_ITEMS } from "../lib/mockData.ts";
import { FAQ_CATEGORY_LABELS, type Answer } from "../types/index.ts";

async function main() {
  const now = new Date();
  const lines: string[] = [];

  lines.push("# モックで回答可能な質問一覧");
  lines.push("");
  lines.push("モック版オンボーディング Q&A で、現時点で回答が返ってくる質問の一覧。");
  lines.push("PM がテスト時に、何を入力すればどんな回答が来るかを確認するためのドキュメント。");
  lines.push("");
  const followupCount = FAQ_ITEMS.reduce(
    (acc, f) => acc + (f.followups?.length ?? 0),
    0,
  );
  lines.push(`- 自動生成: ${now.toISOString()}`);
  lines.push(`- 主要質問: ${FAQ_ITEMS.length} 件`);
  lines.push(`- 追加質問パターン: ${followupCount} 件`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const faq of FAQ_ITEMS) {
    lines.push(`## ${faq.question}`);
    lines.push("");
    lines.push(`- **カテゴリ**: ${FAQ_CATEGORY_LABELS[faq.category]}`);
    lines.push(`- **質問された回数（モック値）**: ${faq.askedCount}`);
    lines.push("");
    appendAnswer(lines, faq.answer);

    if (faq.followups && faq.followups.length > 0) {
      lines.push("### 追加で質問できる例");
      lines.push("");
      lines.push(
        "この質問の回答中に、同じ会話スレッドで続けて次の質問を投げると、文脈を踏まえた回答が返る。",
      );
      lines.push("");
      for (const followup of faq.followups) {
        lines.push(`#### Q: ${followup.question}`);
        lines.push("");
        lines.push(
          `- **認識キーワード**: ${followup.keywords.map((k) => `\`${k}\``).join(" / ")}`,
        );
        lines.push("");
        appendAnswer(lines, followup.answer, true);
      }
    }

    lines.push("---");
    lines.push("");
  }

  const outputDir = path.join(process.cwd(), "output");
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "supported-questions.md");
  await fs.writeFile(outputPath, lines.join("\n"), "utf-8");
  console.log(`Wrote: ${outputPath}`);
}

function appendAnswer(lines: string[], answer: Answer, isFollowup = false) {
  const prefix = isFollowup ? "#####" : "###";
  lines.push(`${prefix} 結論`);
  lines.push(answer.conclusion);
  lines.push("");
  lines.push(`${prefix} 根拠`);
  lines.push(answer.evidence);
  lines.push("");
  if (answer.supplement) {
    lines.push(`${prefix} 補足`);
    lines.push(answer.supplement);
    lines.push("");
  }
  if (answer.caution) {
    lines.push(`${prefix} 注意点`);
    lines.push(answer.caution);
    lines.push("");
  }
  lines.push(`${prefix} 相談先`);
  lines.push(answer.contact);
  lines.push("");
  lines.push(`${prefix} 出典`);
  for (const src of answer.sources) {
    lines.push(`- ${src.title}${src.section ? ` (${src.section})` : ""}`);
  }
  lines.push("");
}

main().catch((e: unknown) => {
  const message = e instanceof Error ? e.message : String(e);
  console.error("Failed to export FAQ:", message);
  process.exit(1);
});
