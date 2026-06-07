"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  DISCOVER_LAYOUT_LABELS,
  DiscoverLayout,
  type PublicUser,
} from "@trustlayer/shared";

interface BlockedEntry {
  id: string;
  createdAt: string;
  user: PublicUser;
}

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [interests, setInterests] = useState(
    (user?.interests ?? []).join(", "),
  );
  const [birthDate, setBirthDate] = useState(toDateInputValue(user?.birthDate));
  const [addressLine, setAddressLine] = useState(user?.addressLine ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  const [country, setCountry] = useState(user?.country ?? "");
  const [discoverLayout, setDiscoverLayout] = useState<DiscoverLayout>(
    user?.discoverLayout ?? DiscoverLayout.DATING_STACK,
  );
  const [blocks, setBlocks] = useState<BlockedEntry[]>([]);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setBio(user.bio ?? "");
    setInterests((user.interests ?? []).join(", "));
    setBirthDate(toDateInputValue(user.birthDate));
    setAddressLine(user.addressLine ?? "");
    setCity(user.city ?? "");
    setCountry(user.country ?? "");
    setDiscoverLayout(user.discoverLayout ?? DiscoverLayout.DATING_STACK);
  }, [user]);

  useEffect(() => {
    apiFetch<BlockedEntry[]>("/blocks").then(setBlocks);
  }, []);

  async function save() {
    await apiFetch("/users/me", {
      method: "PATCH",
      body: JSON.stringify({
        displayName,
        bio,
        interests: interests
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        birthDate: birthDate || null,
        addressLine: addressLine.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        discoverLayout,
      }),
    });
    await refresh();
    setSavedAt(new Date().toLocaleTimeString());
  }

  async function unblock(username: string) {
    await apiFetch(`/blocks/${username}`, { method: "DELETE" });
    setBlocks((prev) => prev.filter((b) => b.user.username !== username));
  }

  if (!user) return null;

  return (
    <div className="space-y-8">
      <section className="surface-elevated p-6 space-y-4">
        <h1 className="text-xl font-semibold">Profile</h1>
        <div>
          <label className="label">Display name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input mt-1"
            maxLength={40}
          />
        </div>
        <div>
          <label className="label">Bio</label>
          <textarea
            value={bio ?? ""}
            onChange={(e) => setBio(e.target.value)}
            className="input mt-1"
            rows={3}
            maxLength={280}
          />
        </div>
        <div>
          <label className="label">Interests (comma-separated)</label>
          <input
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            className="input mt-1"
          />
        </div>
      </section>

      <section className="surface-elevated p-6 space-y-4">
        <h2 className="text-lg font-semibold">Personal details</h2>
        <p className="text-sm text-muted">
          Your city and age appear on Discover cards. Your street address stays
          private and is never shown to others.
        </p>
        <div>
          <label className="label">Date of birth</label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="input mt-1"
          />
        </div>
        <div>
          <label className="label">Address</label>
          <input
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
            className="input mt-1"
            maxLength={200}
            placeholder="Street address"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">City</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input mt-1"
              maxLength={80}
            />
          </div>
          <div>
            <label className="label">Country</label>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="input mt-1"
              maxLength={80}
            />
          </div>
        </div>
      </section>

      <section className="surface-elevated p-6 space-y-4">
        <h2 className="text-lg font-semibold">Discover experience</h2>
        <p className="text-sm text-muted">
          Choose how profiles appear when you browse Discover.
        </p>
        <div className="space-y-2">
          {(
            Object.entries(DISCOVER_LAYOUT_LABELS) as [
              DiscoverLayout,
              string,
            ][]
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 transition hover:bg-surface"
            >
              <input
                type="radio"
                name="discoverLayout"
                value={value}
                checked={discoverLayout === value}
                onChange={() => setDiscoverLayout(value)}
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3 px-1">
        <button onClick={save} className="btn-primary">
          Save changes
        </button>
        {savedAt ? (
          <p className="text-xs text-muted">Saved at {savedAt}</p>
        ) : null}
      </div>

      <section className="surface p-6">
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
                <span>@{b.user.username}</span>
                <button
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
    </div>
  );
}
