import Link from "next/link";
import type { ConnectionUiStatus } from "@/lib/connections";

interface ConnectButtonProps {
  status: ConnectionUiStatus;
  onConnect: () => void;
  busy?: boolean;
  className?: string;
}

export function ConnectButton({
  status,
  onConnect,
  busy = false,
  className = "text-sm",
}: ConnectButtonProps) {
  const base = `${className} inline-flex items-center justify-center rounded-lg px-4 py-2 font-medium transition`;

  if (status === "connected") {
    return (
      <button type="button" disabled className={`${base} btn-ghost cursor-default`}>
        Connected
      </button>
    );
  }

  if (status === "requested") {
    return (
      <button type="button" disabled className={`${base} btn-ghost cursor-default`}>
        Requested
      </button>
    );
  }

  if (status === "incoming") {
    return (
      <Link href="/connections" className={`${base} btn-primary`}>
        Respond
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onConnect}
      disabled={busy}
      className={`${base} btn-primary`}
    >
      {busy ? "Sending…" : "Connect"}
    </button>
  );
}
