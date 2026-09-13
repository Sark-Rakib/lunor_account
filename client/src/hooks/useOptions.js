"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export function useProducts({ params = {}, enabled = true } = {}) {
  return useQuery({
    queryKey: ["products", { ...params, all: params.limit === -1 }],
    queryFn: () =>
      api.get("/products", {
        params: params.limit === -1 ? { ...params, limit: 250 } : params,
      }),
    enabled,
  });
}

export function useCustomers({ params = {}, enabled = true } = {}) {
  return useQuery({
    queryKey: ["customers", { ...params, all: params.limit === -1 }],
    queryFn: () =>
      api.get("/customers", {
        params: params.limit === -1 ? { ...params, limit: 250 } : params,
      }),
    enabled,
  });
}

export function useSuppliers({ params = {}, enabled = true } = {}) {
  return useQuery({
    queryKey: ["suppliers", { ...params, all: params.limit === -1 }],
    queryFn: () =>
      api.get("/suppliers", {
        params: params.limit === -1 ? { ...params, limit: 250 } : params,
      }),
    enabled,
  });
}

export function useAccounts({ enabled = true } = {}) {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: () => api.get("/accounts"),
    enabled,
  });
}

export function useStaticOptions(enabled = true) {
  return useQuery({
    queryKey: ["static-options"],
    queryFn: () => api.get("/products/static/options"),
    enabled,
  });
}