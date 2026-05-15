"use client";

import { useOrg } from "./OrgProvider";
import { LogoMark } from "./Logo";

type Props = {
  size?: number;
  className?: string;
};

// 組織ロゴが設定されていればそれを、無ければ default の新芽マークを表示する。
export function OrgLogo({ size = 28, className }: Props) {
  const { profile } = useOrg();
  if (profile.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.logoUrl}
        alt={profile.orgName}
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: "contain" }}
        className={`rounded ${className ?? ""}`}
      />
    );
  }
  return <LogoMark size={size} className={className} />;
}
