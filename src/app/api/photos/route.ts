import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db";
import { photos, albums } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getStorageProvider } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const albumId = formData.get("albumId") as string;
    const caption = formData.get("caption") as string;
    const latitude = formData.get("latitude") as string;
    const longitude = formData.get("longitude") as string;

    if (!file || !albumId) {
      return NextResponse.json(
        { error: "File and albumId are required" },
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

    // Upload to storage (R2 in production, local filesystem in development)
    const photoId = randomUUID();
    const fileName = `${userId}/${albumId}/${photoId}-${file.name}`;
    const buffer = await file.arrayBuffer();

    const isDevelopment = process.env.NODE_ENV === "development";
    const storage = getStorageProvider(env, isDevelopment);

    await storage.put(fileName, buffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Get the public URL
    const photoUrl = storage.getPublicUrl(fileName);

    // Save photo metadata to database
    await db.insert(photos).values({
      id: photoId,
      albumId,
      userId: userId,
      url: photoUrl,
      caption,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
    });

    const newPhoto = await db
      .select()
      .from(photos)
      .where(eq(photos.id, photoId))
      .limit(1);

    return NextResponse.json(newPhoto[0], { status: 201 });
  } catch (error) {
    console.error("Upload photo error:", error);
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

      const albumPhotos = await db
        .select()
        .from(photos)
        .where(eq(photos.albumId, albumId));

      return NextResponse.json(albumPhotos);
    }

    // Get all photos for user
    const userPhotos = await db
      .select()
      .from(photos)
      .where(eq(photos.userId, userId));

    return NextResponse.json(userPhotos);
  } catch (error) {
    console.error("Get photos error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
