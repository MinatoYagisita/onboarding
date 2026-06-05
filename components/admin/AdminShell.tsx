"use client";

import { useState } from "react";
import { PoweredBy } from "../PoweredBy";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";

type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function AdminShell({ title, description, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminHeader
          title={title}
          description={description}
          onToggleSidebar={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4 sm:px-6 sm:py-6">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white py-2">
          <PoweredBy />
        </footer>
      </div>
    </div>
  );
}
