import jwt from "jsonwebtoken";

export interface JwtPayload {
  userId: string;
  email: string;
}

function secret(): string {
  return process.env.JWT_SECRET ?? "dev-secret-change-me";
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, secret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, secret()) as JwtPayload;
}
