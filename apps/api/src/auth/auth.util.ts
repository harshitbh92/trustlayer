import type { User } from "@prisma/client";

/** Never send password hashes to clients. */
export function omitPasswordHash<T extends User>(user: T): Omit<T, "passwordHash"> {
  const { passwordHash: _, ...safe } = user;
  return safe;
}
