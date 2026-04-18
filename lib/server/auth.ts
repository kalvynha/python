import { NextRequest } from "next/server";
import { verifyBearerToken } from "@/lib/firebase/admin";

export interface AuthedUser {
  uid: string;
  email?: string;
}

/**
 * Resolve the current Firebase user from the Authorization header.
 * Throws a NextResponse-friendly error (callers catch and return 401).
 */
export async function requireUser(req: NextRequest): Promise<AuthedUser> {
  const decoded = await verifyBearerToken(req.headers.get("authorization"));
  return { uid: decoded.uid, email: decoded.email };
}
