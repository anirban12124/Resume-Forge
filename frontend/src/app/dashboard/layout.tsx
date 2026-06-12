"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Auth Flicker Shield: Render a skeleton shell during authentication state resolution
  if (isLoading) {
    return (
      <div className="flex h-screen bg-slate-950 text-white overflow-hidden select-none">
        {/* Skeleton Sidebar */}
        <div className="hidden md:flex flex-col w-64 bg-slate-950 border-r border-slate-900 animate-pulse">
          <div className="h-16 border-b border-slate-900 px-6 flex items-center">
            <div className="h-6 w-32 bg-slate-800 rounded" />
          </div>
          <div className="flex-1 space-y-3 p-4">
            <div className="h-10 bg-slate-800 rounded" />
            <div className="h-10 bg-slate-800 rounded" />
            <div className="h-10 bg-slate-800 rounded" />
          </div>
        </div>

        {/* Skeleton Main Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Skeleton Header */}
          <div className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between animate-pulse">
            <div className="h-4 w-48 bg-slate-800 rounded" />
            <div className="h-8 w-8 bg-slate-800 rounded-full" />
          </div>
          {/* Skeleton Main Content */}
          <div className="flex-grow p-6 space-y-6 animate-pulse">
            <div className="h-6 w-32 bg-slate-900 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="h-32 bg-slate-900 rounded-xl" />
              <div className="h-32 bg-slate-900 rounded-xl" />
              <div className="h-32 bg-slate-900 rounded-xl" />
              <div className="h-32 bg-slate-900 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-grow overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
