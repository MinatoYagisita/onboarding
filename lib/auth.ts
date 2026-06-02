"use server";

import { redirect } from "next/navigation";
import { deleteSession } from "./session";

export async function logout(): Promise<void> {
  await deleteSession(false);
  redirect("/login");
}

export async function adminLogout(): Promise<void> {
  await deleteSession(true);
  redirect("/admin/login");
}
