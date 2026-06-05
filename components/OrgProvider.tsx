"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  orgProfile as defaultOrgProfile,
  type OrgProfile,
} from "@/lib/orgProfile";

type OrgContextValue = {
  profile: OrgProfile;
  updateProfile: (patch: Partial<OrgProfile>) => void;
  resetProfile: () => void;
};

const OrgContext = createContext<OrgContextValue | null>(null);

/**
 * 組織設定をアプリ全体へ配布する。
 * initialProfile はサーバーサイドの layout.tsx で DB から取得して渡す。
 * updateProfile は保存直後の楽観的UI更新に使う（PATCH API と合わせて呼ぶ）。
 */
export function OrgProvider({
  initialProfile,
  children,
}: {
  initialProfile?: OrgProfile;
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState<OrgProfile>(
    initialProfile ?? defaultOrgProfile,
  );

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--color-brand-primary",
      profile.brandPrimary,
    );
  }, [profile.brandPrimary]);

  const updateProfile = useCallback((patch: Partial<OrgProfile>) => {
    setProfile((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetProfile = useCallback(() => {
    setProfile(defaultOrgProfile);
  }, []);

  return (
    <OrgContext.Provider value={{ profile, updateProfile, resetProfile }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrg は OrgProvider の内側で呼ぶ必要があります");
  }
  return ctx;
}
