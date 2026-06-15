import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Returns the signed-in user's id, or null when unauthenticated. */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

/** Thrown by route handlers to short-circuit with a specific HTTP status. */
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Returns the user id or throws a 401 HttpError. */
export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new HttpError(401, "Sign in required");
  return userId;
}
