# TrustLayer Database Architecture Diagram — Generation Prompt

Copy everything below the line into ChatGPT, Claude, FigJam, Mermaid Live Editor, or any diagramming tool.

---

## Prompt

Create a **database architecture diagram** for **TrustLayer**, a trust-and-compatibility social platform. The diagram must reflect the Prisma/PostgreSQL schema below.

### Product context

TrustLayer has three pillars:
1. **Public identity** — profiles, feed, connections, follows
2. **Anonymous discovery** — random chat sessions with aliases (real identity hidden)
3. **Feel-based reputation** — positive/neutral tags (never punitive public scores); negative signals stay internal

### Diagram requirements

1. **Style**: Entity-relationship diagram (ERD) grouped into colored/swimlane **domains**
2. **Center hub**: `User` is the central entity — most tables connect to it
3. **Show**:
   - All models and enums
   - Cardinality (1:1, 1:N, N:M via join tables)
   - Key unique constraints (`@@unique`) as notes
   - Which data is **public** vs **internal-only** (never shown on profiles)
4. **Phase labels**:
   - **Phase 1 (active)**: Identity, Reputation, Social graph, Anonymous discovery, Safety
   - **Phase 2+ (scaffolded)**: Verification, Moderation, AI flags, Risk, Snapshots, Compatibility, Matching, Notifications, DMs, Communities, Public threads, Reconnect
5. **Legend** must include:
   - Public-facing data
   - Internal/moderation-only data
   - Phase 2+ (not yet wired in app logic)
6. **Output format**: Mermaid `erDiagram` (preferred) or SVG. If too large, split into 3 diagrams:
   - Diagram A: User hub + Identity + Reputation
   - Diagram B: Social graph + Anonymous discovery + Feedback
   - Diagram C: Safety + Phase 2+ scaffolding

---

### Enums

| Enum | Values |
|------|--------|
| UserRole | GUEST, STANDARD, VERIFIED, ADMIN |
| TrustTier | NEW, VERIFIED_PRESENCE, TRUSTED_COMMUNICATOR, COMMUNITY_FAVORITE, ELITE_CONVERSATIONALIST |
| ConnectionStatus | PENDING, ACCEPTED, REJECTED |
| AnonymousSessionStatus | WAITING, ACTIVE, ENDED |
| ReportStatus | OPEN, REVIEWED, ACTIONED, DISMISSED |
| ModerationActionType | WARN, SHADOWBAN, SUSPEND, BAN |

---

### Domain 1 — Identity (Phase 1)

**User** (central)
- id, email (unique), passwordHash, username (unique), displayName, bio?, avatarUrl?, interests[], role, trustTier, trustBand, isVerified, timestamps

**PersonalityProfile** (1:1 with User)
- communicationStyle?, socialEnergy?, empathy/openness/reliability/humor/authenticity scores, internalScore, questionnaireComplete, answers (Json)

---

### Domain 2 — Reputation (Phase 1)

**ReputationTag** — catalog of positive/neutral tags (slug unique, label, category, description)

**UserReputationTag** (N:M join: User ↔ ReputationTag)
- strength, earnedAt; unique [userId, tagId]

**UserDimensionScore** (1:N per User, **internal only**)
- dimension, score, samples; unique [userId, dimension]

---

### Domain 3 — Social graph (Phase 1)

**Follow** — followerId → followingId (self-referential User); unique [followerId, followingId]

**Connection** — requesterId → receiverId; status (PENDING/ACCEPTED/REJECTED); unique [requesterId, receiverId]

**Post** — authorId → User; content, imageUrl?

**PostLike** — postId + userId; unique [postId, userId]

---

### Domain 4 — Anonymous discovery (Phase 1)

**AnonymousSession** — status, topic?, mood?, language?, ageRange?, expiresAt?, endedAt?

**AnonymousSessionParticipant** — sessionId + userId + alias; unique [sessionId, userId]

**AnonymousMessage** — sessionId, senderId, alias, content

**InteractionFeedback** — giverId → receiverId; optional sessionId; 6 Likert scores + overallFeeling; unique [sessionId, giverId]

---

### Domain 5 — Safety (Phase 1, internal only)

**Block** — blockerId → blockedId; unique [blockerId, blockedId]

**Report** — reporterId → targetId; reason, context?, sessionId?, status

---

### Domain 6 — Phase 2+ scaffolding (no business logic yet)

| Model | Purpose | Key fields |
|-------|---------|------------|
| UserVerification | Identity verification | phone/age/identity flags |
| ModerationAction | Admin actions | type, targetId, actorId, reportId? |
| AIModerationFlag | ML toxicity/nsfw/spam scores | userId?, messageId?, rawJson |
| UserRiskProfile | Internal risk scoring | riskScore, anomalies |
| ReputationSnapshot | Historical reputation windows | userId, window, data (Json) |
| CompatibilityProfile | Match vectors | tags[], vector (Json) |
| MatchPreference | User match filters | enabled, filters (Json) |
| MatchSuggestion | Suggested matches | userId, targetId, score |
| Notification | In-app notifications | kind, payload, read |
| Conversation + Message | Direct messages | conversationId, senderId |
| Community | Topic communities | slug, name |
| PublicThread | Public discussion threads | authorId, topic, title |
| ReconnectRequest | Post-anonymous reconnect | fromUserId, toUserId, sessionId? |

Note: Phase 2+ models have **no Prisma relation to User** yet (standalone FK strings only).

---

### Key relationships summary

```
User 1──1 PersonalityProfile
User 1──N UserReputationTag N──1 ReputationTag
User 1──N UserDimensionScore (internal)
User 1──N Post, PostLike, Follow (both sides), Connection (both sides)
User 1──N AnonymousSessionParticipant N──1 AnonymousSession
AnonymousSession 1──N AnonymousMessage, InteractionFeedback
User 1──N InteractionFeedback (giver + receiver)
User 1──N Block (both sides), Report (both sides)
```

### Privacy rules to annotate on diagram

- **Public on profile**: displayName, bio, avatar, interests, trustTier, trustBand, reputation tags
- **Never public**: UserDimensionScore, Block, Report, ModerationAction, AIModerationFlag, UserRiskProfile, internalScore
- **Anonymous sessions**: user identity hidden via alias; userId stored server-side only

---

### Suggested layout

Place **User** at center. Arrange domains clockwise:
Identity (top) → Reputation (top-right) → Social (right) → Anonymous (bottom) → Safety (bottom-left) → Phase 2+ (left, dashed border)

Use dashed boxes for Phase 2+ models to indicate scaffolding only.
