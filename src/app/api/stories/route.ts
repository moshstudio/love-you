import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db";
import { stories, albums } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

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

      const albumStories = await db
        .select()
        .from(stories)
        .where(eq(stories.albumId, albumId));

      return NextResponse.json(albumStories);
    }

    // Get all stories for user
    const userStories = await db
      .select()
      .from(stories)
      .where(eq(stories.userId, userId));

    return NextResponse.json(userStories);
  } catch (error) {
    console.error("Get stories error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { albumId, title, content } = (await request.json()) as {
      albumId: string;
      title: string;
      content: string;
    };

    if (!albumId || !title || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    const storyId = randomUUID();
    await db.insert(stories).values({
      id: storyId,
      albumId,
      userId: userId,
      title,
      content,
    });

    const newStory = await db
      .select()
      .from(stories)
      .where(eq(stories.id, storyId))
      .limit(1);

    return NextResponse.json(newStory[0], { status: 201 });
  } catch (error) {
    console.error("Create story error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
