"use client";

import { DiscoverUserCard } from "@/components/discover/discover-user-card";
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
    <ul className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {users.map((user) => (
        <li key={user.id} className="h-full">
          <DiscoverUserCard
            user={user}
            onConnect={() => onConnect(user)}
            connecting={connectingId === user.id}
          />
        </li>
      ))}
    </ul>
  );
}
