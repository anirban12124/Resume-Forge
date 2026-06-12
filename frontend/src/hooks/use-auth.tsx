"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@/types/auth";
import { getAccessToken, setTokens, clearTokens, getUserFromToken } from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Initial verification on app mount
    const verifyAuth = () => {
      try {
        const token = getAccessToken();
        if (token) {
          const decodedUser = getUserFromToken(token);
          if (decodedUser) {
            setUser(decodedUser);
            setIsAuthenticated(true);
          } else {
            clearTokens();
          }
        }
      } catch (error) {
        console.error("Authentication mount verification failed:", error);
        clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, []);

  const login = (accessToken: string, refreshToken: string) => {
    setTokens(accessToken, refreshToken);
    const decodedUser = getUserFromToken(accessToken);
    if (decodedUser) {
      setUser(decodedUser);
      setIsAuthenticated(true);
    }
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
