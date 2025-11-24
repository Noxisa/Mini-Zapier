import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { executeWorkflow } from "@/lib/workflowEngine";

// POST - Execute a workflow manually
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if workflow belongs to user and is active
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: id,
        userId: session.user.id,
        isActive: true,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found or inactive" },
        { status: 404 }
      );
    }

    // Check user's usage limits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const usageLimit = user.subscriptionId === "free" ? 100 :
                      user.subscriptionId === "pro" ? 5000 :
                      Infinity;

    if (user.currentUsage >= usageLimit) {
      return NextResponse.json(
        { error: "Usage limit exceeded for your subscription tier" },
        { status: 403 }
      );
    }

    // Get optional input data from request body
    const body = await request.json().catch(() => ({}));
    const inputData = body.data || {};

    // Execute the workflow
    const result = await executeWorkflow(workflow, inputData);

    // Update usage count
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        currentUsage: user.currentUsage + 1,
      },
    });

    // Update workflow execution count and last executed timestamp
    await prisma.workflow.update({
      where: { id: id },
      data: {
        executionCount: workflow.executionCount + 1,
        lastExecuted: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error executing workflow:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}