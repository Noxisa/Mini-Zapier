import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { encryptCredentials, decryptCredentials } from "@/lib/encryption";

const updateIntegrationSchema = z.object({
  name: z.string().min(1).optional(),
  credentials: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().optional(),
});

// GET - Get a specific integration (with decrypted credentials)
export async function GET(
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

    const integration = await prisma.integration.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    // Decrypt credentials for use
    const decryptedCredentials = decryptCredentials(integration.credentials as string);

    return NextResponse.json({
      success: true,
      data: {
        ...integration,
        credentials: decryptedCredentials,
      },
    });
  } catch (error) {
    console.error("Error fetching integration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update an integration
export async function PUT(
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

    const body = await request.json();
    const validatedData = updateIntegrationSchema.parse(body);

    // Check if integration belongs to user
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!existingIntegration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    // Encrypt new credentials if provided
    const updateData: any = { ...validatedData };
    if (validatedData.credentials) {
      updateData.credentials = encryptCredentials(validatedData.credentials);
    }

    const integration = await prisma.integration.update({
      where: { id: id },
      data: updateData,
    });

    // Return integration without credentials
    const { credentials: _, ...integrationWithoutCredentials } = integration;

    return NextResponse.json({
      success: true,
      data: integrationWithoutCredentials,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating integration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an integration
export async function DELETE(
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

    // Check if integration belongs to user
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!existingIntegration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    await prisma.integration.delete({
      where: { id: id },
    });

    return NextResponse.json({
      success: true,
      message: "Integration deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting integration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}