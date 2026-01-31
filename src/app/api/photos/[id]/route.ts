import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db";
import { photos } from "@/db/schema";
import { auth } from "@/auth";
// Removed unused imports
import { eq, and } from "drizzle-orm";
import { getStorageProvider } from "@/lib/storage";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    // Verify ownership
    const photo = await db
      .select()
      .from(photos)
      .where(and(eq(photos.id, id), eq(photos.userId, userId)))
      .limit(1);

    if (photo.length === 0) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Delete from storage (R2/S3)
    const url = new URL(photo[0].url);
    const fileName = url.pathname.substring(1); // Remove leading slash

    const isDevelopment = process.env.NODE_ENV === "development";
    const storage = getStorageProvider(env, isDevelopment);

    await storage.delete(fileName);

    // Delete from database
    await db.delete(photos).where(eq(photos.id, id));

    return NextResponse.json({ message: "Photo deleted successfully" });
  } catch (error) {
    console.error("Delete photo error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
