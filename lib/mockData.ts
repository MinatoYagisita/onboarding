import type { Answer, ChatThread, FaqItem } from "@/types";

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "faq-break-minutes",
    category: "leave-break",
    question: "休憩は何分取れますか？",
    askedCount: 124,
    answer: {
      conclusion:
        "勤務が6時間を超える場合は45分、8時間を超える場合は60分の休憩が取れます。",
      evidence:
        "就業規則 第4章「勤務時間・休憩・休日」第18条に、労働基準法に準拠した休憩時間の規定があります。",
      supplement:
        "休憩は勤務時間の途中で一括取得が原則です。分割取得したい場合は店長への事前相談が必要です。",
      caution:
        "休憩中はタイムカードを必ず切ってください。切り忘れは勤怠修正申請が必要になります。",
      contact: "勤怠に関する質問は、各店舗の店長または本社人事部までご連絡ください。",
      sources: [
        { title: "就業規則.pdf", section: "第18条 休憩時間" },
        { title: "勤怠運用マニュアル.pdf", section: "2. 休憩の取り方" },
      ],
    },
    followups: [
      {
        keywords: ["分割", "分ける", "分けて"],
        question: "休憩は分割して取得できますか？",
        answer: {
          conclusion:
            "分割取得は原則認められていません。必要な場合は店長への事前相談が必要です。",
          evidence:
            "勤怠運用マニュアル 2-3「休憩の分割取得について」では、業務運営上の理由を除き一括取得を原則としています。",
          supplement:
            "ピーク時間帯に業務が集中する店舗では、個別に分割パターンを申請できるケースがあります。",
          contact: "分割取得の相談は所属店舗の店長までご連絡ください。",
          sources: [
            { title: "勤怠運用マニュアル.pdf", section: "2-3 休憩の分割取得" },
          ],
        },
      },
      {
        keywords: ["外出", "外で", "抜け"],
        question: "休憩中に外出してもよいですか？",
        answer: {
          conclusion:
            "休憩中の外出は可能ですが、タイムカードを切った上で店長へ一声かけてから出てください。",
          evidence:
            "店舗運営マニュアル「休憩時間の過ごし方」に、店外に出る場合の連絡ルールが記載されています。",
          caution:
            "事故・体調不良時の緊急対応のため、連絡なしの外出は避けてください。",
          contact: "店舗ごとの運用ルールは所属店長の案内に従ってください。",
          sources: [
            { title: "店舗運営マニュアル.pdf", section: "休憩時間の過ごし方" },
          ],
        },
      },
    ],
  },
  {
    id: "faq-paid-leave",
    category: "leave-break",
    question: "有給はいつから付与されますか？",
    askedCount: 98,
    answer: {
      conclusion:
        "入社日から6ヶ月経過後に10日付与されます。以降は毎年同じ月に加算されます。",
      evidence:
        "就業規則 第5章第23条および労働基準法第39条に基づく付与ルールです。出勤率80%以上が条件となります。",
      supplement:
        "パート・アルバイトの方も所定労働日数に応じて比例付与されます。週の勤務日数によって付与日数が変わります。",
      caution:
        "有給は取得希望日の2週間前までに申請が必要です。繁忙期は時季変更をお願いする場合があります。",
      contact: "有給の残日数確認・申請は勤怠システム、または本社人事部までご連絡ください。",
      sources: [
        { title: "就業規則.pdf", section: "第23条 年次有給休暇" },
        { title: "有給取得ガイド.pdf" },
      ],
    },
    followups: [
      {
        keywords: ["半日", "半休"],
        question: "半日有給は取得できますか？",
        answer: {
          conclusion:
            "半日単位の有給取得は可能です。AM休またはPM休で申請してください。",
          evidence:
            "就業規則 第23条の2に、半日単位年休の取得要件が記載されています。",
          supplement:
            "半日の境界（AM/PMの切れ目）は各店舗の営業時間によって異なります。店長にご確認ください。",
          caution:
            "時間単位年休（1時間単位）は一部の拠点のみ対応です。利用可否は店長へご確認を。",
          contact: "申請は勤怠システム、運用の相談は所属店長・本社人事部まで。",
          sources: [{ title: "就業規則.pdf", section: "第23条の2 半日単位年休" }],
        },
      },
      {
        keywords: ["繰り越し", "繰越", "持ち越し", "次年度"],
        question: "使い切れなかった有給は翌年度に繰り越せますか？",
        answer: {
          conclusion:
            "使い切れなかった分は翌年度に繰り越し可能ですが、繰り越せる上限は10日分までです。",
          evidence:
            "就業規則 第23条第5項に、未消化有給の繰越上限と時効が定められています。",
          supplement:
            "付与から2年で時効消滅するため、取得促進期には積極的な消化をお勧めします。",
          contact: "有給残の確認は勤怠システム、または本社人事部まで。",
          sources: [{ title: "就業規則.pdf", section: "第23条第5項" }],
        },
      },
    ],
  },
  {
    id: "faq-shift-change",
    category: "attendance",
    question: "シフトを変更したい場合はどうすればよいですか？",
    askedCount: 87,
    answer: {
      conclusion:
        "シフト確定後の変更は、最低でも3日前までに店長へ相談し、代理を立てた上で申請してください。",
      evidence:
        "勤怠運用マニュアル 第3章に、シフト変更の申請フローと期限が記載されています。",
      supplement:
        "緊急時（体調不良・家族の事情など）は、分かった時点で店長へ電話連絡してください。代理探しは店側でも協力します。",
      caution:
        "無断欠勤・当日連絡なしの欠勤は就業規則違反となります。必ず連絡を入れてください。",
      contact: "シフト変更は所属店舗の店長が一次窓口です。",
      sources: [
        { title: "勤怠運用マニュアル.pdf", section: "第3章 シフト変更" },
      ],
    },
    followups: [
      {
        keywords: ["当日", "急", "体調", "朝"],
        question: "当日に体調不良で休む場合はどう連絡すればよいですか？",
        answer: {
          conclusion:
            "分かった時点で、電話で店長へ直接連絡してください。LINE やメッセージのみでの連絡は不可です。",
          evidence:
            "勤怠運用マニュアル 3-2「当日欠勤の連絡方法」に、電話優先の理由とフローが記載されています。",
          supplement:
            "店長不在時は、副店長・本日責任者の順に連絡してください。連絡先リストは休憩室に掲示されています。",
          caution:
            "連絡が取れない状態で無断欠勤扱いになると、評価・シフトに影響が出ます。",
          contact: "当日欠勤の連絡は所属店舗の店長へ電話してください。",
          sources: [
            { title: "勤怠運用マニュアル.pdf", section: "3-2 当日欠勤の連絡" },
          ],
        },
      },
      {
        keywords: ["代理", "交代", "代わり", "見つからない"],
        question: "交代してくれる人が見つからない場合はどうすればよいですか？",
        answer: {
          conclusion:
            "まず店長へ相談してください。店舗側でも代理探しに協力します。",
          evidence:
            "勤怠運用マニュアル 3-3「代理者が見つからない場合の手順」が定められています。",
          supplement:
            "近隣店舗からの応援要請、本社派遣スタッフの手配など、複数の選択肢があります。",
          contact: "代理探しが難航している時点で早めに店長まで連絡してください。",
          sources: [
            { title: "勤怠運用マニュアル.pdf", section: "3-3 代理者探しの協力" },
          ],
        },
      },
    ],
  },
  {
    id: "faq-dress-code",
    category: "dress-code",
    question: "服装や持ち物の決まりはありますか？",
    askedCount: 63,
    answer: {
      conclusion:
        "支給される制服の着用が必須です。初日は黒のパンツ・白シャツ・黒の革靴でお越しください。",
      evidence:
        "店舗運営マニュアル「身だしなみ基準」に、髪色・アクセサリー・爪の長さまで規定があります。",
      supplement:
        "名札・エプロンは初日に支給します。マスク・三角巾は各自で用意してください。",
      caution: "長い髪は必ず束ねてください。香水・強い整髪料は厨房エリアでは禁止です。",
      contact: "服装規定の詳細は、入社時オリエンテーションで説明します。",
      sources: [{ title: "店舗運営マニュアル.pdf", section: "身だしなみ基準" }],
    },
    followups: [
      {
        keywords: ["夏", "暑", "半袖"],
        question: "夏場の服装はどうすればよいですか？",
        answer: {
          conclusion:
            "クールビズ期間（6〜9月）は半袖の夏用制服が支給されます。着用は任意ですが、衛生面から推奨されます。",
          evidence:
            "店舗運営マニュアル「季節別ドレスコード」に夏用制服の支給時期と基準が記載されています。",
          supplement:
            "熱中症対策として、休憩中の水分補給・塩分タブレットの配布も実施されています。",
          contact: "夏用制服の支給相談は所属店舗の店長まで。",
          sources: [
            { title: "店舗運営マニュアル.pdf", section: "季節別ドレスコード" },
          ],
        },
      },
      {
        keywords: ["アクセサリー", "指輪", "ピアス", "ネックレス"],
        question: "アクセサリーの着用は可能ですか？",
        answer: {
          conclusion:
            "衛生上・安全上の理由から、接客・調理担当は指輪・ネックレス・ピアスの着用は原則禁止です。",
          evidence:
            "店舗運営マニュアル「身だしなみ基準」第3項にアクセサリー規定が記載されています。",
          supplement:
            "結婚指輪は例外として可ですが、調理中はグローブ下に収める必要があります。",
          contact: "例外運用の相談は所属店舗の店長まで。",
          sources: [
            { title: "店舗運営マニュアル.pdf", section: "身だしなみ基準 第3項" },
          ],
        },
      },
    ],
  },
  {
    id: "faq-first-day-time",
    category: "first-day",
    question: "初日は何時に来ればよいですか？",
    askedCount: 55,
    answer: {
      conclusion:
        "入社初日は始業時刻の15分前にお越しください。オリエンテーションがあるため、早めの集合となります。",
      evidence: "入社案内書に、初日の集合時刻と場所が記載されています。",
      supplement:
        "交通機関の遅延に備えて、余裕を持った出発をおすすめします。遅延の場合は店長へ連絡してください。",
      contact: "当日の集合に関する質問は、採用担当または配属店舗の店長までご連絡ください。",
      sources: [{ title: "入社案内書.pdf" }],
    },
  },
  {
    id: "faq-store-key",
    category: "store-rule",
    question: "店舗の鍵の取り扱いはどうすればよいですか？",
    askedCount: 32,
    answer: {
      conclusion:
        "開閉店担当者以外は店舗の鍵を預かりません。合鍵の作成・持ち出しは禁止です。",
      evidence: "店舗運営マニュアル「鍵・金庫管理」に、鍵の受け渡し手順と責任範囲が記載されています。",
      caution:
        "鍵を紛失した場合は、速やかに店長・本社総務部へ連絡してください。シリンダー交換の費用が発生する場合があります。",
      contact: "鍵管理の詳細は店長までご確認ください。",
      sources: [{ title: "店舗運営マニュアル.pdf", section: "鍵・金庫管理" }],
    },
  },
  {
    id: "faq-injury",
    category: "trouble",
    question: "勤務中にケガをした場合はどうすればよいですか？",
    askedCount: 28,
    answer: {
      conclusion:
        "まず止血など応急処置を行い、店長に報告してください。業務中のケガは労災申請の対象になります。",
      evidence: "安全衛生ガイド 第2章「労働災害発生時の対応」に手順が定められています。",
      supplement:
        "病院にかかる際は、健康保険証ではなく「労災扱い」と伝えてください。医療費の自己負担はありません。",
      caution: "軽傷であっても必ず報告してください。後日症状が悪化した場合に労災認定が難しくなります。",
      contact: "労災申請は本社総務部が窓口です。",
      sources: [
        { title: "安全衛生ガイド.pdf", section: "第2章 労働災害対応" },
      ],
    },
  },
  {
    id: "faq-clothes-lost",
    category: "dress-code",
    question: "制服を汚してしまった・紛失した場合は？",
    askedCount: 21,
    answer: {
      conclusion:
        "制服を汚損・紛失した場合は店長へ報告してください。代替品の貸出または再支給を手配します。",
      evidence: "店舗運営マニュアル「制服管理」に貸出・返却ルールがあります。",
      supplement: "自己都合による紛失が繰り返される場合、実費請求となることがあります。",
      contact: "制服に関する相談は所属店舗の店長まで。",
      sources: [{ title: "店舗運営マニュアル.pdf", section: "制服管理" }],
    },
  },
];

type KeywordRule = {
  keywords: string[];
  faqId: string;
};

// 質問文から該当 FAQ を引き当てるための簡易ルール（モック検索）。
// 実装時は claude API に置き換える想定。
const KEYWORD_RULES: KeywordRule[] = [
  { keywords: ["休憩", "ブレイク", "break"], faqId: "faq-break-minutes" },
  { keywords: ["有給", "ゆうきゅう", "年休"], faqId: "faq-paid-leave" },
  { keywords: ["シフト", "変更", "交代"], faqId: "faq-shift-change" },
  { keywords: ["服装", "制服", "身だしなみ", "持ち物"], faqId: "faq-dress-code" },
  { keywords: ["初日", "入社", "何時"], faqId: "faq-first-day-time" },
  { keywords: ["鍵", "合鍵", "金庫"], faqId: "faq-store-key" },
  { keywords: ["ケガ", "怪我", "労災", "事故"], faqId: "faq-injury" },
  { keywords: ["汚し", "汚れ", "紛失", "無くした"], faqId: "faq-clothes-lost" },
];

export type SearchResult =
  | { kind: "hit"; answer: Answer; faqId: string }
  | { kind: "miss"; relatedFaqIds: string[] };

/**
 * 質問に対する回答を引き当てる。
 * context.currentThread が渡されると、最初にヒットした FAQ の followups を優先的にチェックする。
 * これで「追加質問」は親 FAQ の文脈に沿った回答を返せる。
 */
export function searchAnswer(
  question: string,
  context?: { currentThread?: ChatThread | null },
): SearchResult {
  const normalized = question.trim();
  if (!normalized) {
    return { kind: "miss", relatedFaqIds: topRelatedFaqIds() };
  }

  // 追加質問コンテキストでの照合。
  const parentFaqId = findParentFaqId(context?.currentThread ?? null);
  if (parentFaqId) {
    const parent = FAQ_ITEMS.find((f) => f.id === parentFaqId);
    const followup = parent?.followups?.find((fu) =>
      fu.keywords.some((kw) => normalized.includes(kw)),
    );
    if (followup) {
      return { kind: "hit", answer: followup.answer, faqId: parentFaqId };
    }
  }

  // 通常の FAQ マッチ。
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((kw) => normalized.includes(kw))) {
      const faq = FAQ_ITEMS.find((f) => f.id === rule.faqId);
      if (faq) {
        return { kind: "hit", answer: faq.answer, faqId: faq.id };
      }
    }
  }

  return { kind: "miss", relatedFaqIds: topRelatedFaqIds() };
}

/**
 * スレッド内で直近にヒットした FAQ の id を返す。追加質問の文脈判定に使う。
 * turns を新しい順に遡って最初に見つかった matchedFaqId を採用。
 */
function findParentFaqId(thread: ChatThread | null): string | null {
  if (!thread) return null;
  for (let i = thread.turns.length - 1; i >= 0; i--) {
    const t = thread.turns[i];
    if (t.matchedFaqId) return t.matchedFaqId;
  }
  return null;
}

function topRelatedFaqIds(): string[] {
  return [...FAQ_ITEMS]
    .sort((a, b) => b.askedCount - a.askedCount)
    .slice(0, 4)
    .map((f) => f.id);
}

export function getFaqById(id: string): FaqItem | undefined {
  return FAQ_ITEMS.find((f) => f.id === id);
}

/** 未回答質問のモック（管理画面の未回答一覧で使う） */
export type UnansweredItem = {
  id: string;
  question: string;
  askedCount: number;
  lastAskedAt: string;
};

export const UNANSWERED_ITEMS: UnansweredItem[] = [
  {
    id: "un-salary-date",
    question: "給料日はいつですか？",
    askedCount: 12,
    lastAskedAt: "2026-04-22T10:15:00Z",
  },
  {
    id: "un-training-days",
    question: "入社後の研修は何日ありますか？",
    askedCount: 8,
    lastAskedAt: "2026-04-21T16:40:00Z",
  },
  {
    id: "un-retirement-steps",
    question: "退職する場合の手続きは何から始めればよいですか？",
    askedCount: 5,
    lastAskedAt: "2026-04-20T09:02:00Z",
  },
  {
    id: "un-transport-fee",
    question: "交通費の申請方法を教えてください",
    askedCount: 4,
    lastAskedAt: "2026-04-19T18:30:00Z",
  },
  {
    id: "un-uniform-wash",
    question: "制服のクリーニングは自己負担ですか？",
    askedCount: 3,
    lastAskedAt: "2026-04-19T11:25:00Z",
  },
];
