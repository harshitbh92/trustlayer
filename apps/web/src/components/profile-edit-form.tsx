"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Globe,
  MapPin,
  Sparkles,
  UserRound,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth, type AuthUser } from "@/lib/auth-context";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { UserAvatar } from "@/components/user-avatar";
import { formatLocation, type PublicUser } from "@trustlayer/shared";

interface BlockedEntry {
  id: string;
  createdAt: string;
  user: PublicUser;
}

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function ProfileEditForm() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [interests, setInterests] = useState(
    (user?.interests ?? []).join(", "),
  );
  const [birthDate, setBirthDate] = useState(toDateInputValue(user?.birthDate));
  const [addressLine, setAddressLine] = useState(user?.addressLine ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  const [country, setCountry] = useState(user?.country ?? "");
  const [blocks, setBlocks] = useState<BlockedEntry[]>([]);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retakeOpen, setRetakeOpen] = useState(false);
  const [retakeBusy, setRetakeBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    syncFromUser(user);
  }, [user]);

  useEffect(() => {
    apiFetch<BlockedEntry[]>("/blocks").then(setBlocks);
  }, []);

  function syncFromUser(next: AuthUser) {
    setDisplayName(next.displayName);
    setBio(next.bio ?? "");
    setAvatarUrl(next.avatarUrl ?? "");
    setInterests((next.interests ?? []).join(", "));
    setBirthDate(toDateInputValue(next.birthDate));
    setAddressLine(next.addressLine ?? "");
    setCity(next.city ?? "");
    setCountry(next.country ?? "");
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          displayName,
          bio,
          avatarUrl: avatarUrl.trim() || null,
          interests: interests
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          birthDate: birthDate || null,
          addressLine: addressLine.trim() || null,
          city: city.trim() || null,
          country: country.trim() || null,
        }),
      });
      await refresh();
      setSavedAt(new Date().toLocaleTimeString());
    } catch {
      setError("Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function unblock(username: string) {
    await apiFetch(`/blocks/${username}`, { method: "DELETE" });
    setBlocks((prev) => prev.filter((b) => b.user.username !== username));
  }

  async function confirmRetake() {
    setRetakeBusy(true);
    try {
      await apiFetch("/personality/retake", {
        method: "POST",
        body: JSON.stringify({ confirm: true }),
      });
      router.push("/onboarding");
    } finally {
      setRetakeBusy(false);
      setRetakeOpen(false);
    }
  }

  if (!user) return null;

  const interestList = interests
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const locationPreview = formatLocation(city, country);

  return (
    <div className="space-y-6 pb-24">
      <section className="surface-elevated overflow-hidden">
        <div className="bg-gradient-to-br from-accent/15 via-transparent to-accent-deep/10 px-6 py-8 sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <UserAvatar
              displayName={displayName || user.displayName}
              avatarUrl={avatarUrl || user.avatarUrl}
              size="lg"
              className="h-20 w-20 text-xl ring-2 ring-background"
            />
            <div className="min-w-0 flex-1">
              <p className="label">Editing profile</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                {displayName || "Your name"}
              </h1>
              <p className="text-sm text-muted">@{user.username}</p>
              {locationPreview ? (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                  <MapPin className="h-3.5 w-3.5" />
                  {locationPreview}
                </p>
              ) : null}
              {user.personalityType ? (
                <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-accent">
                  <Sparkles className="h-3.5 w-3.5" />
                  {user.personalityType}
                  {user.personalitySubType ? ` · ${user.personalitySubType}` : ""}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="surface-elevated p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-2">
          <UserRound className="h-4 w-4 text-accent" />
          <h2 className="text-lg font-semibold">Public profile</h2>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <label className="label">Display name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input mt-1"
              maxLength={40}
              placeholder="How people see your name"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="label">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="input mt-1 min-h-[100px] resize-y"
              rows={4}
              maxLength={280}
              placeholder="A short intro about you"
            />
            <p className="mt-1 text-xs text-muted">{bio.length}/280</p>
          </div>
          <div>
            <label className="label">Profile photo URL</label>
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="input mt-1"
              placeholder="https://…"
            />
          </div>
          <div>
            <label className="label">Interests</label>
            <input
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              className="input mt-1"
              placeholder="music, hiking, philosophy"
            />
            <p className="mt-1 text-xs text-muted">Comma-separated</p>
          </div>
        </div>
        {interestList.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {interestList.map((item) => (
              <span
                key={item}
                className="rounded-full border border-border bg-surface px-3 py-1 text-xs"
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="surface-elevated p-6 sm:p-8">
        <div className="mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-accent" />
          <h2 className="text-lg font-semibold">Personal details</h2>
        </div>
        <p className="mb-6 text-sm text-muted">
          Your city and age appear on Discover. Your street address stays private
          and is never shown to others.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label">Date of birth</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="input mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Address</label>
            <input
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              className="input mt-1"
              maxLength={200}
              placeholder="Street address (private)"
            />
          </div>
          <div>
            <label className="label">City</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input mt-1"
              maxLength={80}
              placeholder="San Francisco"
            />
          </div>
          <div>
            <label className="label">Country</label>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="input mt-1"
              maxLength={80}
              placeholder="United States"
            />
          </div>
        </div>
      </section>

      <section className="surface p-6 sm:p-8">
        <div className="mb-2 flex items-center gap-2">
          <Globe className="h-4 w-4 text-accent" />
          <h2 className="text-lg font-semibold">Personality questionnaire</h2>
        </div>
        <p className="text-sm text-muted">
          Retaking the test clears all personality tags and resets your
          personality score. Feedback history stays, but earned tags will be
          removed.
        </p>
        <button
          type="button"
          onClick={() => setRetakeOpen(true)}
          className="btn-ghost mt-4 text-sm text-rose-600 dark:text-rose-300"
        >
          Retake personality test
        </button>
      </section>

      <section className="surface p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Blocked users</h2>
        {blocks.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No one blocked.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {blocks.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-border px-3 py-2"
              >
                <span className="text-sm">@{b.user.username}</span>
                <button
                  type="button"
                  onClick={() => unblock(b.user.username)}
                  className="text-xs text-accent hover:underline"
                >
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="sticky bottom-4 z-20 mx-auto max-w-3xl">
        <div className="surface-elevated flex flex-wrap items-center justify-between gap-3 border border-border px-4 py-3 shadow-lg backdrop-blur">
          <div className="min-w-0">
            {error ? (
              <p className="text-sm text-rose-500">{error}</p>
            ) : savedAt ? (
              <p className="text-sm text-muted">Saved at {savedAt}</p>
            ) : (
              <p className="text-sm text-muted">Changes apply to your public profile</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="btn-primary min-w-[140px]"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={retakeOpen}
        title="Retake personality test?"
        description="This will remove all your personality tags and reset your personality score. Feedback history stays, but earned tags will be cleared. This cannot be undone."
        confirmLabel={retakeBusy ? "Resetting…" : "Retake test"}
        onConfirm={() => void confirmRetake()}
        onClose={() => setRetakeOpen(false)}
      />
    </div>
  );
}
