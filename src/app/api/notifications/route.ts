import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createNotificationSchema = z.object({
  type: z.enum(["workflow_success", "workflow_error", "usage_warning"]),
  message: z.string().min(1, "Message is required"),
  metadata: z.any().optional(),
});

// GET - List notifications for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where = {
      userId: session.user.id,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    const totalCount = await prisma.notification.count({
      where,
    });

    return NextResponse.json({
      success: true,
      data: notifications,
      meta: {
        totalCount,
        unreadCount: await prisma.notification.count({
          where: {
            userId: session.user.id,
            isRead: false,
          },
        }),
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new notification (internal use)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createNotificationSchema.parse(body);

    // This endpoint should be used internally by the system
    // We might want to add an API key check here for internal calls
    const notification = await prisma.notification.create({
      data: {
        ...validatedData,
        userId: body.userId, // userId should be provided in the body for internal calls
      },
    });

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}