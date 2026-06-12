"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Flame, Github, Chrome, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Form Inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  
  // Status hooks
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleOAuth = (provider: "github" | "google") => {
    const authUrl = provider === "github" 
      ? process.env.NEXT_PUBLIC_GITHUB_AUTH_URL || "http://localhost:8000/auth/github"
      : process.env.NEXT_PUBLIC_GOOGLE_AUTH_URL || "http://localhost:8000/auth/google";
    window.location.href = authUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const endpoint = isSignUp ? "/auth/signup" : "/auth/login";
      const payload = isSignUp 
        ? { email, password, full_name: fullName } 
        : { email, password };

      const response = await api.post(endpoint, payload);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Authentication failed. Please check your credentials.");
      }

      const data = await response.json();
      login(data.access_token, data.refresh_token);
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#030712] px-4 py-12">
      {/* Brand logo title */}
      <div className="flex items-center gap-2 mb-8 select-none">
        <Flame className="w-10 h-10 text-primary animate-pulse fill-primary/10" />
        <h1 className="text-3xl font-extrabold text-white tracking-tight">ResumeForge</h1>
      </div>

      <Card className="w-full max-w-md bg-slate-900 border border-slate-800 shadow-2xl">
        <CardHeader className="space-y-2 text-center pb-8 border-b border-slate-800">
          <CardTitle className="text-2xl font-bold">
            {isSignUp ? "Create an account" : "Sign in to ResumeForge"}
          </CardTitle>
          <CardDescription>
            {isSignUp 
              ? "Get started with parsing resumes and tracking project commits" 
              : "Access your dashboard to optimize LaTeX and PDF templates"}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-6">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm font-semibold bg-red-950/40 border border-red-900 text-red-400 rounded-lg animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* OAuth primary options */}
          <div className="grid grid-cols-1 gap-3">
            <div className="relative group">
              <Button 
                onClick={() => handleOAuth("github")}
                variant="default"
                className="w-full bg-[#181717] hover:bg-[#2c2b2b] text-white flex items-center justify-center gap-2.5 h-11 border border-slate-700/60 font-semibold"
              >
                <Github className="w-5 h-5" />
                <span>Continue with GitHub</span>
              </Button>
              <div className="mt-1.5 text-center text-[11px] text-slate-400 font-medium tracking-wide">
                ✨ Recommended &mdash; Enables automatic repo metadata analysis
              </div>
            </div>

            <Button 
              onClick={() => handleOAuth("google")}
              variant="outline"
              className="w-full border-slate-800 hover:bg-slate-800 text-slate-200 flex items-center justify-center gap-2.5 h-11 font-semibold"
            >
              <Chrome className="w-4 h-4 text-red-500" />
              <span>Continue with Google</span>
            </Button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <span className="relative bg-slate-900 px-3 text-xs font-semibold text-slate-500 uppercase tracking-widest">
              or
            </span>
          </div>

          {/* Email signup/login forms */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Full Name</label>
                <Input 
                  type="text" 
                  placeholder="John Doe" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Email Address</label>
              <Input 
                type="email" 
                placeholder="developer@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Password</label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary-hover h-11 font-bold text-sm tracking-wide shadow-lg mt-6"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isSignUp ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center border-t border-slate-800 py-5">
          <button 
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
