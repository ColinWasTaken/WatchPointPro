import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type TokenType = "verify_email" | "reset_password";

const TTL_MS: Record<TokenType, number> = {
  verify_email: 24 * 60 * 60 * 1000,
  reset_password: 60 * 60 * 1000,
};
const RESEND_COOLDOWN_MS = 60 * 1000;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

// Returns null when a token of this type was issued too recently (email-spam guard).
export async function issueToken(userId: string, type: TokenType) {
  const recent = await prisma.authToken.findFirst({
    where: { userId, type, createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
  });
  if (recent) return null;

  await prisma.authToken.deleteMany({ where: { userId, type } });
  const token = randomBytes(32).toString("base64url");
  await prisma.authToken.create({
    data: { userId, type, tokenHash: hash(token), expiresAt: new Date(Date.now() + TTL_MS[type]) },
  });
  return token;
}

export async function peekToken(token: string, type: TokenType) {
  const row = await prisma.authToken.findUnique({ where: { tokenHash: hash(token) } });
  if (!row || row.type !== type || row.expiresAt < new Date()) return null;
  return row;
}

export async function consumeToken(id: string) {
  await prisma.authToken.delete({ where: { id } });
}
