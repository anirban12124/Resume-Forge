"use client";

import React, { useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;

    const token = searchParams.get("token");
    const refresh = searchParams.get("refresh");

    if (token && refresh) {
      processedRef.current = true;
      login(token, refresh);
      router.replace("/dashboard");
    } else {
      processedRef.current = true;
      router.replace("/login");
    }
  }, [searchParams, login, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#030712] text-white">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      <p className="mt-4 text-slate-400 text-sm font-semibold tracking-wide">Authenticating your account...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense 
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#030712] text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-slate-400 text-sm font-semibold tracking-wide">Loading authentication context...</p>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
