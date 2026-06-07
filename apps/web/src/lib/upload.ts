import { getAuthToken } from "./auth-token";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface UploadResult {
  url: string;
  mediaType: "image" | "video";
}

export async function uploadMedia(file: File): Promise<UploadResult> {
  const token = getAuthToken();
  const form = new FormData();
  form.append("file", file);

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/uploads`, {
    method: "POST",
    headers,
    body: form,
  });

  if (!res.ok) {
    throw new Error("Upload failed");
  }

  return (await res.json()) as UploadResult;
}
