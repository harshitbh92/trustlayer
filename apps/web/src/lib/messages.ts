import { apiFetch } from "./api";

export async function startConversation(username: string) {
  return apiFetch<{ id: string }>("/conversations", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}
