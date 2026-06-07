import type {
  PersonalityProfile,
  ReputationTag,
  User,
  UserReputationTag,
} from "@prisma/client";
import type { PublicUser } from "@trustlayer/shared";
import { computeAge } from "@trustlayer/shared";

type UserWithProfile = User & {
  personalityProfile: PersonalityProfile | null;
  reputationTags: (UserReputationTag & { tag: ReputationTag })[];
};

/**
 * Strip private fields (raw dimension scores, internal risk, etc.) before
 * any user object goes out over the wire. There is only one canonical
 * mapping so it stays consistent.
 */
export function toPublicUser(u: UserWithProfile): PublicUser {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    interests: u.interests,
    role: u.role,
    trustTier: u.trustTier,
    trustBand: u.trustBand,
    communicationStyle: u.personalityProfile?.communicationStyle ?? null,
    socialEnergy: u.personalityProfile?.socialEnergy ?? null,
    personalityType: u.personalityProfile?.personalityType ?? null,
    age: computeAge(u.birthDate),
    city: u.city ?? null,
    country: u.country ?? null,
    tags: u.reputationTags.map((t) => ({
      slug: t.tag.slug,
      label: t.tag.label,
      category: t.tag.category,
      strength: t.strength,
      earnedAt: t.earnedAt.toISOString(),
    })),
    createdAt: u.createdAt.toISOString(),
  };
}

export const publicUserInclude = {
  personalityProfile: true,
  reputationTags: { include: { tag: true } },
} as const;
