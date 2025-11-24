import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { encryptCredentials } from "@/lib/encryption";

const createIntegrationSchema = z.object({
  service: z.enum(["gmail", "outlook", "sendgrid", "webhook", "custom_api", "twilio", "database"]),
  name: z.string().min(1, "Name is required"),
  credentials: z.record(z.string(), z.any()),
});

// GET - List integrations for the authenticated user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const integrations = await prisma.integration.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Don't return encrypted credentials
    const integrationsWithoutCredentials = integrations.map(integration => ({
      ...integration,
      credentials: "***ENCRYPTED***",
    }));

    return NextResponse.json({
      success: true,
      data: integrationsWithoutCredentials,
    });
  } catch (error) {
    console.error("Error fetching integrations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new integration
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
    const validatedData = createIntegrationSchema.parse(body);

    // Encrypt credentials before storing
    const encryptedCredentials = encryptCredentials(validatedData.credentials);

    const integration = await prisma.integration.create({
      data: {
        ...validatedData,
        credentials: encryptedCredentials,
        userId: session.user.id,
      },
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

    console.error("Error creating integration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}