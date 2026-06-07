"use client";

import { ProfileCard } from "@/components/profile-card";
import { ConnectButton } from "@/components/connect-button";
import { toConnectUiStatus } from "@/lib/connections";
import type { DiscoverUser } from "@trustlayer/shared";

export function DiscoverGridView({
  users,
  onConnect,
  connectingId,
}: {
  users: DiscoverUser[];
  onConnect: (user: DiscoverUser) => void;
  connectingId: string | null;
}) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {users.map((user) => (
        <li key={user.id}>
          <ProfileCard
            user={user}
            emphasizePersonalityType
            action={
              <ConnectButton
                status={toConnectUiStatus(user.connectionStatus)}
                onConnect={() => onConnect(user)}
                busy={connectingId === user.id}
              />
            }
          />
        </li>
      ))}
    </ul>
  );
}
