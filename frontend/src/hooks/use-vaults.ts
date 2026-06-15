"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Vault, VaultListResponse, VaultCreate, VaultUpdate } from "@/types/vault";

export function useVaultList() {
  const [vaults, setVaults] = useState<VaultListResponse[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVaults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/vaults");
      if (!response.ok) {
        let errMsg = "Failed to fetch vaults";
        try {
          const errData = await response.json();
          errMsg = errData.detail || errMsg;
        } catch {
          // ignore parsing error
        }
        throw new Error(errMsg);
      }
      const data = await response.json();
      setVaults(data);
    } catch (err: any) {
      console.error("Error in useVaultList:", err);
      setError(err.message || "Something went wrong while loading vaults");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVaults();
  }, [fetchVaults]);

  return { vaults, loading, error, mutate: fetchVaults };
}

export function useVault(id: string | null) {
  const [vault, setVault] = useState<Vault | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVault = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/vaults/${id}`);
      if (!response.ok) {
        let errMsg = "Failed to fetch vault details";
        try {
          const errData = await response.json();
          errMsg = errData.detail || errMsg;
        } catch {
          // ignore parsing error
        }
        throw new Error(errMsg);
      }
      const data = await response.json();
      setVault(data);
    } catch (err: any) {
      console.error("Error in useVault:", err);
      setError(err.message || "Failed to load vault details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchVault();
    } else {
      setVault(null);
      setLoading(false);
    }
  }, [id, fetchVault]);

  return { vault, loading, error, mutate: fetchVault };
}

export function useCreateVault() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createVault = async (data: VaultCreate): Promise<Vault> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/vaults", data);
      if (!response.ok) {
        let errMsg = "Failed to create vault";
        try {
          const errData = await response.json();
          errMsg = errData.detail || errMsg;
        } catch {
          // ignore parsing error
        }
        throw new Error(errMsg);
      }
      const newVault = await response.json();
      return newVault;
    } catch (err: any) {
      setError(err.message || "Failed to create vault");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createVault, loading, error };
}

export function useUpdateVault() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateVault = async (id: string, data: VaultUpdate): Promise<Vault> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.put(`/vaults/${id}`, data);
      if (!response.ok) {
        let errMsg = "Failed to update vault";
        try {
          const errData = await response.json();
          errMsg = errData.detail || errMsg;
        } catch {
          // ignore parsing error
        }
        throw new Error(errMsg);
      }
      const updatedVault = await response.json();
      return updatedVault;
    } catch (err: any) {
      setError(err.message || "Failed to update vault");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateVault, loading, error };
}

export function useDeleteVault() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteVault = async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.delete(`/vaults/${id}`);
      if (!response.ok) {
        let errMsg = "Failed to delete vault";
        try {
          const errData = await response.json();
          errMsg = errData.detail || errMsg;
        } catch {
          // ignore parsing error
        }
        throw new Error(errMsg);
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete vault");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deleteVault, loading, error };
}
