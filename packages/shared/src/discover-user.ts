import { z } from "zod";
import { ViewerConnectionStatus } from "./enums";
import { publicUserSchema } from "./public-user";

export const discoverUserSchema = publicUserSchema.extend({
  connectionStatus: z.nativeEnum(ViewerConnectionStatus),
});

export type DiscoverUser = z.infer<typeof discoverUserSchema>;
