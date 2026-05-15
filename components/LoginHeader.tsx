"use client";

import { OrgLogo } from "./OrgLogo";
import { useOrg } from "./OrgProvider";

// ログイン画面のヘッダー部分。Context 経由で組織ロゴ・名前・サブタイトルを表示する。
export function LoginHeader() {
  const { profile } = useOrg();
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <OrgLogo size={56} />
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          {profile.orgName}
        </h1>
        <p className="mt-1 text-xs text-gray-500">{profile.productSubtitle}</p>
      </div>
    </div>
  );
}
