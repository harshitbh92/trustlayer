import { z } from "zod";
import { TrustTier, UserRole, DiscoverLayout } from "./enums";

export const publicTagSchema = z.object({
  slug: z.string(),
  label: z.string(),
  category: z.string(),
  strength: z.number(),
  earnedAt: z.string(),
});

export type PublicTag = z.infer<typeof publicTagSchema>;

/**
 * Shape returned by any API endpoint that exposes a user publicly.
 * Deliberately omits raw dimension scores, internal risk data, reports,
 * and any numeric reputation value.
 */
export const publicUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  bio: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  interests: z.array(z.string()),
  role: z.nativeEnum(UserRole),
  trustTier: z.nativeEnum(TrustTier),
  trustBand: z.string(),
  communicationStyle: z.string().nullable(),
  socialEnergy: z.string().nullable(),
  personalityType: z.string().nullable(),
  personalitySubType: z.string().nullable(),
  personalityScore: z.number().nullable(),
  age: z.number().int().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  tags: z.array(publicTagSchema),
  createdAt: z.string(),
});

export type PublicUser = z.infer<typeof publicUserSchema>;
