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

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    if (!file || !albumId) {
      return NextResponse.json(
        { error: "File and albumId are required" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit" },
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

    // Update album cover photo if it doesn't have one
    if (!album[0].coverPhotoUrl) {
      await db
        .update(albums)
        .set({ coverPhotoUrl: photoUrl })
        .where(eq(albums.id, albumId));
    }

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

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("id");

    if (!photoId) {
      return NextResponse.json(
        { error: "Photo ID is required" },
        { status: 400 },
      );
    }

    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    // Get photo details first to verify ownership and get URL for storage deletion
    const photo = await db
      .select()
      .from(photos)
      .where(eq(photos.id, photoId))
      .limit(1);

    if (photo.length === 0) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const photoToDelete = photo[0];

    // Verify ownership
    if (photoToDelete.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete from database
    await db.delete(photos).where(eq(photos.id, photoId));

    // Handle Album Cover cleanup
    // If this photo was the cover photo, remove it
    await db
      .update(albums)
      .set({ coverPhotoUrl: null })
      .where(
        and(
          eq(albums.id, photoToDelete.albumId),
          eq(albums.coverPhotoUrl, photoToDelete.url),
        ),
      );

    // Delete from storage
    try {
      const isDevelopment = process.env.NODE_ENV === "development";
      const storage = getStorageProvider(env, isDevelopment);

      // Attempt to extract key from URL
      // Key format: userId/albumId/photoId-filename
      const keyStart = `${userId}/${photoToDelete.albumId}/${photoId}`;
      const url = photoToDelete.url;
      const keyIndex = url.indexOf(keyStart);

      if (keyIndex !== -1) {
        const key = url.substring(keyIndex);
        await storage.delete(key);
      } else {
        console.warn("Could not extract storage key from photo URL:", url);
      }
    } catch (err) {
      console.error("Failed to delete file from storage:", err);
      // We don't fail the request here since the DB record is gone
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete photo error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
