import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { executeWorkflow } from "@/lib/workflowEngine";

// POST - Webhook endpoint for external triggers
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await params;
    // Find the workflow by ID (no authentication required for webhooks)
    const workflow = await prisma.workflow.findUnique({
      where: {
        id: workflowId,
        isActive: true,
        triggerType: "webhook",
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Webhook not found or inactive" },
        { status: 404 }
      );
    }

    // Get request body data as trigger input
    let inputData = {};
    const contentType = request.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      try {
        inputData = await request.json();
      } catch {
        // If JSON parsing fails, use empty object
      }
    } else {
      // For form data or other content types, try to get text
      const body = await request.text();
      if (body) {
        try {
          // Try to parse as JSON again
          inputData = JSON.parse(body);
        } catch {
          // If not JSON, store as text
          inputData = { raw_body: body };
        }
      }
    }

    // Also include headers and method information
    inputData = {
      ...inputData,
      headers: Object.fromEntries(request.headers.entries()),
      method: request.method,
      query: Object.fromEntries(request.nextUrl.searchParams.entries()),
    };

    // Execute the workflow
    const result = await executeWorkflow(workflow, inputData);

    // Update usage count for the workflow owner
    await prisma.user.update({
      where: { id: workflow.userId },
      data: {
        currentUsage: {
          increment: 1,
        },
      },
    });

    // Update workflow execution count and last executed timestamp
    await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        executionCount: workflow.executionCount + 1,
        lastExecuted: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Webhook received and workflow executed",
      executionId: result.executionId,
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}