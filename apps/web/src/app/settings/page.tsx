"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    router.replace(`/profile/${user.username}?view=edit`);
  }, [loading, router, user]);

  return (
    <p className="text-sm text-muted">Opening profile editor…</p>
  );
}
