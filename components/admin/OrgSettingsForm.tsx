"use client";

import { useState } from "react";
import { useOrg } from "../OrgProvider";
import {
  orgProfile as defaultOrgProfile,
  type OrgProfile,
} from "@/lib/orgProfile";

export function OrgSettingsForm() {
  const { profile, updateProfile, resetProfile } = useOrg();
  const [draft, setDraft] = useState<OrgProfile>(profile);
  const [saved, setSaved] = useState(false);

  const setField = <K extends keyof OrgProfile>(key: K, value: OrgProfile[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/org/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgName: draft.orgName,
        productSubtitle: draft.productSubtitle,
        logoUrl: draft.logoUrl,
        brandPrimary: draft.brandPrimary,
        welcomeHeroTitle: draft.welcomeHeroTitle,
        welcomeHeroDescription: draft.welcomeHeroDescription,
        askTabLabel: draft.askTabLabel,
        faqTabLabel: draft.faqTabLabel,
      }),
    });
    if (res.ok) {
      updateProfile(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleReset = () => {
    resetProfile();
    setDraft(defaultOrgProfile);
    setSaved(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Section title="基本情報">
        <Field label="組織名" htmlFor="orgName">
          <input
            id="orgName"
            type="text"
            required
            value={draft.orgName}
            onChange={(e) => setField("orgName", e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
          />
        </Field>

        <Field label="プロダクトのサブタイトル" htmlFor="productSubtitle">
          <input
            id="productSubtitle"
            type="text"
            required
            value={draft.productSubtitle}
            onChange={(e) => setField("productSubtitle", e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
          />
        </Field>

        <Field label="組織ロゴURL（空欄でデフォルトマーク）" htmlFor="logoUrl">
          <input
            id="logoUrl"
            type="url"
            value={draft.logoUrl ?? ""}
            onChange={(e) => setField("logoUrl", e.target.value || null)}
            placeholder="https://..."
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
          />
        </Field>
      </Section>

      <Section title="ブランドカラー">
        <Field
          label="ブランドカラー（hex）"
          htmlFor="brandPrimary"
          description="この1色から、ボタン・アクセント・背景など階調が自動で生成されます。"
        >
          <div className="flex items-center gap-2">
            <input
              id="brandPrimary"
              type="color"
              value={draft.brandPrimary}
              onChange={(e) => setField("brandPrimary", e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border border-slate-300"
            />
            <input
              type="text"
              required
              pattern="^#[0-9a-fA-F]{6}$"
              value={draft.brandPrimary}
              onChange={(e) => setField("brandPrimary", e.target.value)}
              className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
            />
          </div>
        </Field>
      </Section>

      <Section title="ウェルカム画面の文言">
        <Field label="見出し" htmlFor="welcomeHeroTitle">
          <input
            id="welcomeHeroTitle"
            type="text"
            required
            value={draft.welcomeHeroTitle}
            onChange={(e) => setField("welcomeHeroTitle", e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
          />
        </Field>

        <Field label="説明文" htmlFor="welcomeHeroDescription">
          <textarea
            id="welcomeHeroDescription"
            required
            rows={2}
            value={draft.welcomeHeroDescription}
            onChange={(e) =>
              setField("welcomeHeroDescription", e.target.value)
            }
            className="w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
          />
        </Field>
      </Section>

      <Section title="タブラベル">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="質問タブ" htmlFor="askTabLabel">
            <input
              id="askTabLabel"
              type="text"
              required
              value={draft.askTabLabel}
              onChange={(e) => setField("askTabLabel", e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
            />
          </Field>

          <Field label="FAQタブ" htmlFor="faqTabLabel">
            <input
              id="faqTabLabel"
              type="text"
              required
              value={draft.faqTabLabel}
              onChange={(e) => setField("faqTabLabel", e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
            />
          </Field>
        </div>
      </Section>

      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          デフォルトに戻す
        </button>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-xs text-green-700">保存しました</span>
          )}
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            保存する
          </button>
        </div>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  description,
  children,
}: {
  label: string;
  htmlFor: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs font-medium text-gray-700">
        {label}
      </label>
      {description && (
        <p className="text-[11px] text-gray-500 leading-relaxed">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
