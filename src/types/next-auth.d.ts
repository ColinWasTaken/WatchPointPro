import type { DefaultSession } from "next-auth";

export type UserRole = "homeowner" | "homewatcher";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole | null;
  }
}
