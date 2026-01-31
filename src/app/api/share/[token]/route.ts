import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db";
import { sharedLinks, albums, photos, stories } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  try {
    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    // Find share link by token
    const link = await db
      .select()
      .from(sharedLinks)
      .where(eq(sharedLinks.token, params.token))
      .limit(1);

    if (link.length === 0) {
      return NextResponse.json(
        { error: "Share link not found" },
        { status: 404 },
      );
    }

    const shareLink = link[0];

    // Check if link has expired
    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
      return NextResponse.json(
        { error: "Share link has expired" },
        { status: 410 },
      );
    }

    // Get album details
    const album = await db
      .select()
      .from(albums)
      .where(eq(albums.id, shareLink.albumId))
      .limit(1);

    if (album.length === 0) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    // Get album photos
    const albumPhotos = await db
      .select()
      .from(photos)
      .where(eq(photos.albumId, shareLink.albumId));

    // Get album stories
    const albumStories = await db
      .select()
      .from(stories)
      .where(eq(stories.albumId, shareLink.albumId));

    return NextResponse.json({
      album: album[0],
      photos: albumPhotos,
      stories: albumStories,
    });
  } catch (error) {
    console.error("Get shared album error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
