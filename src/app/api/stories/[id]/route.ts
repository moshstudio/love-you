import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db";
import { stories } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and } from "drizzle-orm";

export async function GET(
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

    const story = await db
      .select()
      .from(stories)
      .where(and(eq(stories.id, id), eq(stories.userId, userId)))
      .limit(1);

    if (story.length === 0) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    return NextResponse.json(story[0]);
  } catch (error) {
    console.error("Get story error:", error);
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

    const { title, content } = await request.json();

    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    // Verify ownership
    const story = await db
      .select()
      .from(stories)
      .where(and(eq(stories.id, id), eq(stories.userId, userId)))
      .limit(1);

    if (story.length === 0) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    await db
      .update(stories)
      .set({
        title: title || story[0].title,
        content: content || story[0].content,
        updatedAt: new Date(),
      })
      .where(eq(stories.id, id));

    const updatedStory = await db
      .select()
      .from(stories)
      .where(eq(stories.id, id))
      .limit(1);

    return NextResponse.json(updatedStory[0]);
  } catch (error) {
    console.error("Update story error:", error);
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
    const story = await db
      .select()
      .from(stories)
      .where(and(eq(stories.id, id), eq(stories.userId, userId)))
      .limit(1);

    if (story.length === 0) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    await db.delete(stories).where(eq(stories.id, id));

    return NextResponse.json({ message: "Story deleted successfully" });
  } catch (error) {
    console.error("Delete story error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
