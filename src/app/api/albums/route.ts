import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db";
import { albums, users, photos } from "@/db/schema";
import { auth } from "@/auth"; // Updated auth import
import { eq, getTableColumns, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    const userAlbums = await db
      .select({
        ...getTableColumns(albums),
        latestPhotoUrl: sql<string>`(SELECT ${photos.url} FROM ${photos} WHERE ${photos.albumId} = ${albums.id} ORDER BY ${photos.uploadedAt} DESC LIMIT 1)`,
      })
      .from(albums)
      .where(eq(albums.userId, userId));

    const albumsWithCover = userAlbums.map((album) => ({
      ...album,
      coverPhotoUrl: album.coverPhotoUrl || album.latestPhotoUrl,
    }));

    return NextResponse.json(albumsWithCover);
  } catch (error) {
    console.error("Get albums error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

interface CreateAlbumRequest {
  title: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { title, description, location, startDate, endDate } =
      (await request.json()) as CreateAlbumRequest;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    // Verify user exists to avoid foreign key constraint error
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { error: "User not found. Please log out and log in again." },
        { status: 401 },
      );
    }

    const albumId = randomUUID();
    await db.insert(albums).values({
      id: albumId,
      userId: userId,
      title,
      description,
      location,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    const newAlbum = await db
      .select()
      .from(albums)
      .where(eq(albums.id, albumId))
      .limit(1);

    return NextResponse.json(newAlbum[0], { status: 201 });
  } catch (error) {
    console.error("Create album error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
