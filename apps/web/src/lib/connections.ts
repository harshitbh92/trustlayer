import {
  ViewerConnectionStatus,
  type PublicUser,
} from "@trustlayer/shared";

export interface ConnectionsResponse {
  incoming: {
    id: string;
    status: string;
    requester: PublicUser;
  }[];
  mine: {
    id: string;
    status: string;
    requester: PublicUser;
    receiver: PublicUser;
  }[];
}

export type ConnectionUiStatus =
  | "none"
  | "connected"
  | "requested"
  | "incoming";

export function toConnectUiStatus(
  status: ViewerConnectionStatus,
): ConnectionUiStatus {
  switch (status) {
    case ViewerConnectionStatus.CONNECTED:
      return "connected";
    case ViewerConnectionStatus.REQUESTED:
      return "requested";
    case ViewerConnectionStatus.INCOMING:
      return "incoming";
    default:
      return "none";
  }
}

export function connectionStatusFromPostResponse(
  status: string,
  connectionStatus?: ViewerConnectionStatus,
): ViewerConnectionStatus {
  if (connectionStatus) return connectionStatus;
  return status === "ACCEPTED"
    ? ViewerConnectionStatus.CONNECTED
    : ViewerConnectionStatus.REQUESTED;
}
