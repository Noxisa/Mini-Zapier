import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createWorkflowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  triggerType: z.enum(["webhook", "schedule", "manual", "email"]),
  configuration: z.object({
    triggers: z.array(z.any()),
    actions: z.array(z.any()),
  }),
  scheduleConfig: z.any().optional(),
});

// GET - List workflows for the authenticated user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const workflows = await prisma.workflow.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            executions: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: workflows,
    });
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new workflow
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createWorkflowSchema.parse(body);

    // Check user's workflow limit based on subscription
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const existingWorkflowsCount = await prisma.workflow.count({
      where: { userId: session.user.id },
    });

    // Free tier: 2 workflows, Pro tier: 50, Enterprise: unlimited
    const workflowLimit = user.subscriptionId === "free" ? 2 :
                         user.subscriptionId === "pro" ? 50 :
                         Infinity;

    if (existingWorkflowsCount >= workflowLimit) {
      return NextResponse.json(
        { error: "Workflow limit exceeded for your subscription tier" },
        { status: 403 }
      );
    }

    const workflow = await prisma.workflow.create({
      data: {
        ...validatedData,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating workflow:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}