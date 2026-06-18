"use client";

import { getApiKey } from "./storage";
import type { Artifact, EditRequest, GenerateRequest, Lesson } from "./types";

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-key": getApiKey(),
    },
    body: JSON.stringify(body),
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    const message =
      (data as { error?: string })?.error ?? `Request failed (${res.status}).`;
    const error = new Error(message) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return data as T;
}

export async function generateArtifact(req: GenerateRequest): Promise<Artifact> {
  const { artifact } = await post<{ artifact: Artifact }>("/api/generate", req);
  return artifact;
}

export async function editLesson(req: EditRequest): Promise<Lesson> {
  const { artifact } = await post<{ artifact: Lesson }>("/api/edit", req);
  return artifact;
}
