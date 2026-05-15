// 組織プロファイル: 管理画面で組織ごとに設定する値のモック。
// 将来的には認証後に API から取得して OrgProvider へ渡す想定（/api/org/me）。

export type OrgProfile = {
  /** 組織名（サイドバー左上に表示） */
  orgName: string;
  /** プロダクトのサブタイトル（組織名の下に小さく表示） */
  productSubtitle: string;
  /** 組織ロゴの URL。null の場合はデフォルトマークを表示 */
  logoUrl: string | null;
  /** ブランドのメインカラー（hex 形式、例 "#84cc16"）。
   *  階調 (brand-50〜brand-900) は CSS の color-mix で自動生成される。 */
  brandPrimary: string;
  /** ウェルカム画面の見出し */
  welcomeHeroTitle: string;
  /** ウェルカム画面の説明文 */
  welcomeHeroDescription: string;
  /** サイドバーのチャットタブのラベル */
  askTabLabel: string;
  /** サイドバーの FAQ タブのラベル */
  faqTabLabel: string;
};

// 管理画面が未実装のため、ここを書き換えると組織設定として反映される。
// 本番実装時は API (/api/org/me) から取得した値で置き換える。
export const orgProfile: OrgProfile = {
  orgName: "Sprout",
  productSubtitle: "オンボーディング Q&A",
  logoUrl: null,
  brandPrimary: "#84cc16",
  welcomeHeroTitle: "今日は何を知りたいですか？",
  welcomeHeroDescription:
    "勤怠・服装・店舗ルールまで、組織の資料からAIが答えます。",
  askTabLabel: "質問する",
  faqTabLabel: "よくある質問",
};
