import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db";
import { sharedLinks, albums } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { albumId, expiresIn } = await request.json();

    if (!albumId) {
      return NextResponse.json(
        { error: "Album ID is required" },
        { status: 400 },
      );
    }

    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    // Verify album ownership
    const album = await db
      .select()
      .from(albums)
      .where(and(eq(albums.id, albumId), eq(albums.userId, userId)))
      .limit(1);

    if (album.length === 0) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    // Generate share token
    const shareToken = randomUUID();
    const linkId = randomUUID();
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : undefined;

    await db.insert(sharedLinks).values({
      id: linkId,
      albumId,
      userId: userId,
      token: shareToken,
      expiresAt,
    });

    const shareUrl = `${new URL(request.url).origin}/share/${shareToken}`;

    return NextResponse.json(
      {
        id: linkId,
        shareUrl,
        token: shareToken,
        expiresAt,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create share link error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const albumId = searchParams.get("albumId");

    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    if (albumId) {
      // Verify album ownership
      const album = await db
        .select()
        .from(albums)
        .where(and(eq(albums.id, albumId), eq(albums.userId, userId)))
        .limit(1);

      if (album.length === 0) {
        return NextResponse.json({ error: "Album not found" }, { status: 404 });
      }

      const links = await db
        .select()
        .from(sharedLinks)
        .where(eq(sharedLinks.albumId, albumId));

      return NextResponse.json(links);
    }

    // Get all share links for user
    const userLinks = await db
      .select()
      .from(sharedLinks)
      .where(eq(sharedLinks.userId, userId));

    return NextResponse.json(userLinks);
  } catch (error) {
    console.error("Get share links error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
