import { z } from "zod";
import { DiscoverLayout } from "./enums";

export const submitPersonalitySchema = z.object({
  answers: z.record(z.string(), z.number().int().min(1).max(7)),
});
export type SubmitPersonalityInput = z.infer<typeof submitPersonalitySchema>;

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(40).optional(),
  bio: z.string().max(280).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  interests: z.array(z.string().min(1).max(30)).max(20).optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
    .nullable()
    .optional(),
  city: z.string().max(80).nullable().optional(),
  country: z.string().max(80).nullable().optional(),
  addressLine: z.string().max(200).nullable().optional(),
  discoverLayout: z.nativeEnum(DiscoverLayout).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const createPostSchema = z
  .object({
    content: z.string().max(1000).default(""),
    imageUrl: z.string().url().nullable().optional(),
    videoUrl: z.string().url().nullable().optional(),
  })
  .refine(
    (data) =>
      data.content.trim().length > 0 || data.imageUrl || data.videoUrl,
    { message: "Post needs text or media" },
  )
  .refine((data) => !(data.imageUrl && data.videoUrl), {
    message: "Post can include an image or a video, not both",
  });
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const createCommentSchema = z
  .object({
    content: z.string().max(1000).default(""),
    imageUrl: z.string().url().nullable().optional(),
    videoUrl: z.string().url().nullable().optional(),
    parentId: z.string().optional(),
  })
  .refine(
    (data) =>
      data.content.trim().length > 0 || data.imageUrl || data.videoUrl,
    { message: "Comment needs text or media" },
  )
  .refine((data) => !(data.imageUrl && data.videoUrl), {
    message: "Comment can include an image or a video, not both",
  });
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const mediaTypeSchema = z.enum(["image", "video"]);
export type MediaType = z.infer<typeof mediaTypeSchema>;

export const sendMessageSchema = z
  .object({
    content: z.string().max(2000).default(""),
    mediaUrl: z.string().url().nullable().optional(),
    mediaType: mediaTypeSchema.optional(),
  })
  .refine(
    (data) => data.content.trim().length > 0 || data.mediaUrl,
    { message: "Message needs text or media" },
  )
  .refine((data) => !data.mediaUrl || data.mediaType, {
    message: "Media type is required when media is attached",
  });
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const startMatchSchema = z.object({
  mood: z.string().min(1).max(40).optional(),
  topic: z.string().min(1).max(40).optional(),
  language: z.string().min(2).max(8).optional(),
});
export type StartMatchInput = z.infer<typeof startMatchSchema>;

export const sendAnonymousMessageSchema = z.object({
  sessionId: z.string(),
  content: z.string().min(1).max(2000),
});
export type SendAnonymousMessageInput = z.infer<
  typeof sendAnonymousMessageSchema
>;

export const createReportSchema = z.object({
  targetUserId: z.string(),
  reason: z.string().min(3).max(200),
  context: z.string().max(2000).optional(),
  sessionId: z.string().optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const usernameSchema = z
  .string()
  .min(3)
  .max(24)
  .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, and underscores only");

export const createConversationSchema = z.object({
  username: usernameSchema,
});
export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  username: usernameSchema,
  displayName: z.string().min(1).max(40),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(100),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z
    .string()
    .length(6)
    .regex(/^\d+$/, "Code must be 6 digits"),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z
    .string()
    .length(6)
    .regex(/^\d+$/, "Code must be 6 digits"),
  password: z.string().min(8).max(100),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const updateReportStatusSchema = z.object({
  status: z.enum(["REVIEWED", "ACTIONED", "DISMISSED"]),
});
export type UpdateReportStatusInput = z.infer<typeof updateReportStatusSchema>;

export const createModerationActionSchema = z.object({
  targetUserId: z.string(),
  type: z.enum(["WARN", "SHADOWBAN", "SUSPEND", "BAN"]),
  reason: z.string().min(3).max(500),
  reportId: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});
export type CreateModerationActionInput = z.infer<
  typeof createModerationActionSchema
>;

export const updateUserRoleSchema = z.object({
  role: z.enum(["GUEST", "STANDARD", "VERIFIED", "ADMIN"]),
});
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
