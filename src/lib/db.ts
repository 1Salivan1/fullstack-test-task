import { PrismaClient } from "@prisma/client";

// Reuse one client across hot reloads in dev and across warm serverless
// invocations in production. DATABASE_URL points at Neon's pooler, so each
// instance holds a single pooled connection.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
