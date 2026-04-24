import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />
        <main className="flex-1 overflow-hidden animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
