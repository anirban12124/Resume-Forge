"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { ArchiveListResponse, ArchiveDetailResponse } from "@/types/archive";

export function useArchiveList(page: number = 1) {
  const [archives, setArchives] = useState<ArchiveListResponse[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArchives = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/archive?page=${page}`);
      if (!response.ok) {
        let errMsg = "Failed to fetch archives";
        try {
          const errData = await response.json();
          errMsg = errData.detail || errMsg;
        } catch {}
        throw new Error(errMsg);
      }
      const data = await response.json();
      setArchives(data);
    } catch (err: any) {
      console.error("Error in useArchiveList:", err);
      setError(err.message || "Failed to load archived resumes.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchArchives();
  }, [fetchArchives]);

  return { archives, loading, error, mutate: fetchArchives };
}

export function useArchiveDetail(id: string | null) {
  const [archive, setArchive] = useState<ArchiveDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/archive/${id}`);
      if (!response.ok) {
        let errMsg = "Failed to fetch archive details";
        try {
          const errData = await response.json();
          errMsg = errData.detail || errMsg;
        } catch {}
        throw new Error(errMsg);
      }
      const data = await response.json();
      setArchive(data);
    } catch (err: any) {
      console.error("Error in useArchiveDetail:", err);
      setError(err.message || "Failed to load archive details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchDetail();
    } else {
      setArchive(null);
      setLoading(false);
    }
  }, [id, fetchDetail]);

  return { archive, loading, error, mutate: fetchDetail };
}

export function useDeleteArchive() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const deleteArchive = async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.delete(`/archive/${id}`);
      if (!response.ok) {
        let errMsg = "Failed to delete archive";
        try {
          const errData = await response.json();
          errMsg = errData.detail || errMsg;
        } catch {}
        throw new Error(errMsg);
      }
    } catch (err: any) {
      console.error("Error in useDeleteArchive:", err);
      setError(err.message || "Failed to delete archive.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deleteArchive, loading, error };
}
