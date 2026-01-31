import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { type NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-key-change-me";

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.split(" ")[1];
}

export async function verifyToken(
  token: string,
): Promise<{ userId: string; email: string } | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
    };
    return decoded;
  } catch (error) {
    return null;
  }
}
