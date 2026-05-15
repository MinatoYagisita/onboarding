"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  orgProfile as defaultOrgProfile,
  type OrgProfile,
} from "@/lib/orgProfile";

const STORAGE_KEY = "ob_org_profile_override";
// 同一タブ内での localStorage 更新を購読者に通知するためのカスタムイベント。
const LOCAL_EVENT = "ob-org-profile-update";

type OrgContextValue = {
  profile: OrgProfile;
  updateProfile: (patch: Partial<OrgProfile>) => void;
  resetProfile: () => void;
};

const OrgContext = createContext<OrgContextValue | null>(null);

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LOCAL_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LOCAL_EVENT, callback);
  };
}

function getSnapshot(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

/**
 * 管理画面で編集された組織設定を localStorage で保持し、フロント全体へ配布する。
 * 本番実装では API `/org/settings` から取得した値を渡す。
 */
export function OrgProvider({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const profile = useMemo<OrgProfile>(() => {
    if (!raw) return defaultOrgProfile;
    try {
      const parsed = JSON.parse(raw) as Partial<OrgProfile>;
      return { ...defaultOrgProfile, ...parsed };
    } catch {
      return defaultOrgProfile;
    }
  }, [raw]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--color-brand-primary",
      profile.brandPrimary,
    );
  }, [profile.brandPrimary]);

  const updateProfile = useCallback((patch: Partial<OrgProfile>) => {
    let current: Partial<OrgProfile> = {};
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) current = JSON.parse(raw) as Partial<OrgProfile>;
    } catch {
      // 読み出し失敗は無視して default + patch で続行
    }
    const next = { ...defaultOrgProfile, ...current, ...patch };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(LOCAL_EVENT));
    } catch {
      // localStorage 書き込み失敗時は何もできない
    }
  }, []);

  const resetProfile = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new Event(LOCAL_EVENT));
    } catch {
      // noop
    }
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
