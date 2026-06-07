"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PersonalityDashboard } from "@/components/personality-dashboard";
import type { PublicUser } from "@trustlayer/shared";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    apiFetch<PublicUser>("/users/me")
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return <p className="text-sm text-muted">Loading your dashboard…</p>;
  }

  if (!profile) return null;

  return <PersonalityDashboard profile={profile} isOwner />;
}
