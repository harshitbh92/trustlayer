import { z } from "zod";
import { ViewerConnectionStatus } from "./enums";
import { publicUserSchema } from "./public-user";

export const discoverUserSchema = publicUserSchema.extend({
  connectionStatus: z.nativeEnum(ViewerConnectionStatus),
  followerCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
  viewerFollows: z.boolean(),
});

export type DiscoverUser = z.infer<typeof discoverUserSchema>;
