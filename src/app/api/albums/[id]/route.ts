import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db";
import { albums } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }, // Params are Promises in Next.js 15+ but let's stick to what works or check. Next.js 15 requires awaiting params
) {
  try {
    const { id } = await params; // Await params in newer Next.js
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    const album = await db
      .select()
      .from(albums)
      .where(and(eq(albums.id, id), eq(albums.userId, userId)))
      .limit(1);

    if (album.length === 0) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    return NextResponse.json(album[0]);
  } catch (error) {
    console.error("Get album error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
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

    const { title, description, location, startDate, endDate, coverPhotoUrl } =
      (await request.json()) as {
        title?: string;
        description?: string;
        location?: string;
        startDate?: string;
        endDate?: string;
        coverPhotoUrl?: string;
      };

    const { env } = await getCloudflareContext({ async: true });
    const db = getDb(env.DB);

    // Verify ownership
    const album = await db
      .select()
      .from(albums)
      .where(and(eq(albums.id, id), eq(albums.userId, userId)))
      .limit(1);

    if (album.length === 0) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    await db
      .update(albums)
      .set({
        title: title || album[0].title,
        description:
          description !== undefined ? description : album[0].description,
        location: location || album[0].location,
        startDate: startDate ? new Date(startDate) : album[0].startDate,
        endDate: endDate ? new Date(endDate) : album[0].endDate,
        coverPhotoUrl: coverPhotoUrl || album[0].coverPhotoUrl,
        updatedAt: new Date(),
      })
      .where(eq(albums.id, id));

    const updatedAlbum = await db
      .select()
      .from(albums)
      .where(eq(albums.id, id))
      .limit(1);

    return NextResponse.json(updatedAlbum[0]);
  } catch (error) {
    console.error("Update album error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

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
    const album = await db
      .select()
      .from(albums)
      .where(and(eq(albums.id, id), eq(albums.userId, userId)))
      .limit(1);

    if (album.length === 0) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    await db.delete(albums).where(eq(albums.id, id));

    return NextResponse.json({ message: "Album deleted successfully" });
  } catch (error) {
    console.error("Delete album error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
