"use client";

import { toast } from "sonner";
import {
  QueryClient,
  useMutation as useReactQueryMutation,
  useQuery as useReactQueryQuery,
} from "@tanstack/react-query";
import api from "@/services/api";

const rawAPIURL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const baseURL = rawAPIURL.includes("/api")
  ? rawAPIURL
  : `${rawAPIURL.replace(/\/+$/, "")}/api`;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 15 * 1000,
      },
    },
  });
}

export function useQuery(options) {
  return useReactQueryQuery(options);
}

export function useList({ key, url, params, enabled = true, staleTime }) {
  return useReactQueryQuery({
    queryKey: [key, params],
    queryFn: () => api.get(url, { params }).then((payload) => payload),
    enabled,
    staleTime,
  });
}

export function useMutation({ method = "post", url, onSuccessMessage = "Success", invalidate = [], success, ...rest }) {
  return useReactQueryMutation({
    mutationFn: async (body) => {
      if (method === "get") return api.get(url);
      if (method === "delete") return api.delete(url);
      if (method === "put") return api.put(url, body);
      if (method === "patch") return api.patch(url, body);
      return api.post(url, body);
    },
    onSuccess: (data) => {
      toast.success(onSuccessMessage);
      if (typeof success === "function") success(data);
    },
    onError: (err) => {
      toast.error(err?.message || "Request failed");
      if (rest.onError) rest.onError(err);
    },
    ...rest,
  });
}

export function authHeader() {
  if (typeof window === "undefined") return {};
  try {
    const auth = JSON.parse(localStorage.getItem("lunor_auth") || "null");
    return auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
  } catch {
    return {};
  }
}

export async function downloadFromServer(url, filename) {
  const res = await fetch(`${baseURL}${url}`, { headers: authHeader() });
  if (!res.ok) {
    let message = "Export failed";
    try {
      const j = await res.json();
      message = j.message || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const contentType = res.headers.get("content-type") || "";
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename || (contentType.includes("pdf") ? "report.pdf" : "export");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(href);
}