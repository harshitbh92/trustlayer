"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useMessagesPanel } from "@/lib/messages-panel-context";

export default function MessagesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { openInbox } = useMessagesPanel();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    openInbox();
    router.replace("/feed");
  }, [user, authLoading, router, openInbox]);

  return null;
}
