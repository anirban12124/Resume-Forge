"use client";

import { useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { ForgeRunRequest, ForgeStatusResponse, ForgeResultResponse } from "@/types/forge";

export function useForge() {
  const [isForging, setIsForging] = useState<boolean>(false);
  const [forgeStatus, setForgeStatus] = useState<ForgeStatusResponse | null>(null);
  const [forgeResult, setForgeResult] = useState<ForgeResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsForging(false);
    setForgeStatus(null);
    setForgeResult(null);
    setError(null);
  }, []);

  const triggerForge = useCallback(async (config: ForgeRunRequest) => {
    reset();
    setIsForging(true);
    
    try {
      // 1. POST /forge/run
      const runRes = await api.post("/forge/run", config);
      if (!runRes.ok) {
        let errMsg = "Failed to start forge pipeline";
        try {
          const errData = await runRes.json();
          errMsg = errData.detail || errMsg;
        } catch {}
        throw new Error(errMsg);
      }
      
      const { task_id } = await runRes.json();
      setForgeStatus({ task_id, status: "queued", error_message: null });
      
      const startTime = Date.now();
      
      // 2. Poll status every 2 seconds
      pollIntervalRef.current = setInterval(async () => {
        try {
          // Check timeout (120 seconds overall timeout)
          if (Date.now() - startTime > 120000) {
            reset();
            setError("The optimization pipeline timed out after 120 seconds.");
            return;
          }

          const statusRes = await api.get(`/forge/status/${task_id}`);
          if (!statusRes.ok) {
            // Keep polling unless severe
            return;
          }
          
          const statusData: ForgeStatusResponse = await statusRes.json();
          setForgeStatus(statusData);
          
          if (statusData.status === "completed") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            
            // Fetch Result
            const resultRes = await api.get(`/forge/result/${task_id}`);
            if (!resultRes.ok) {
              throw new Error("Failed to retrieve optimization results");
            }
            const resultData: ForgeResultResponse = await resultRes.json();
            setForgeResult(resultData);
            setIsForging(false);
          } else if (statusData.status === "failed") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setError(statusData.error_message || "The forge pipeline failed during processing.");
            setIsForging(false);
          }
        } catch (err: any) {
          console.error("Error polling forge status:", err);
          // Let it continue polling or stop on error
        }
      }, 2000);
      
    } catch (err: any) {
      console.error("Error triggering forge:", err);
      setError(err.message || "An unexpected error occurred while starting the forge pipeline.");
      setIsForging(false);
    }
  }, [reset]);

  return {
    triggerForge,
    forgeStatus,
    forgeResult,
    isForging,
    error,
    reset
  };
}
