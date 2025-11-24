import { WorkflowContext, ActionResult } from "../workflowEngine";
import { prisma } from "../prisma";
import nodemailer from "nodemailer";

export async function executeEmailAction(config: any, context: WorkflowContext): Promise<ActionResult> {
  try {
    const { provider, to, subject, body, from } = config;

    if (!provider || !to || !subject || !body) {
      return {
        success: false,
        error: "Missing required email configuration: provider, to, subject, body",
      };
    }

    let transporter;
    let fromAddress = from;

    switch (provider) {
      case "gmail":
        transporter = await createGmailTransporter(context.userId);
        if (!fromAddress) {
          fromAddress = "noreply@minizapier.com"; // Default from address
        }
        break;

      case "sendgrid":
        transporter = await createSendGridTransporter(context.userId);
        if (!fromAddress) {
          fromAddress = "noreply@minizapier.com";
        }
        break;

      case "smtp":
        transporter = createSMTPTransporter(config);
        if (!fromAddress) {
          return {
            success: false,
            error: "From address is required for SMTP provider",
          };
        }
        break;

      default:
        return {
          success: false,
          error: `Unsupported email provider: ${provider}`,
        };
    }

    if (!transporter) {
      return {
        success: false,
        error: `Failed to create email transporter for provider: ${provider}`,
      };
    }

    const mailOptions = {
      from: fromAddress,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      text: body,
      html: body.includes("<") ? body : `<p>${body}</p>`, // Basic HTML detection
    };

    const result = await transporter.sendMail(mailOptions);

    return {
      success: true,
      data: {
        messageId: result.messageId,
        provider,
        to,
        subject,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Email action failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function createGmailTransporter(userId: string) {
  try {
    const integration = await prisma.integration.findFirst({
      where: {
        userId,
        service: "gmail",
        isActive: true,
      },
    });

    if (!integration) {
      throw new Error("Gmail integration not found");
    }

    const { decryptCredentials } = await import("../encryption");
    const credentials = decryptCredentials(integration.credentials as string);

    // For Gmail OAuth, we would need to use the OAuth2 flow
    // For simplicity, we'll use app password approach in development
    if (credentials.app_password) {
      return nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: credentials.email,
          pass: credentials.app_password,
        },
      });
    }

    throw new Error("Invalid Gmail credentials");
  } catch (error) {
    console.error("Gmail transporter error:", error);
    return null;
  }
}

async function createSendGridTransporter(userId: string) {
  try {
    const integration = await prisma.integration.findFirst({
      where: {
        userId,
        service: "sendgrid",
        isActive: true,
      },
    });

    if (!integration) {
      throw new Error("SendGrid integration not found");
    }

    const { decryptCredentials } = await import("../encryption");
    const credentials = decryptCredentials(integration.credentials as string);

    if (!credentials.api_key) {
      throw new Error("SendGrid API key not found");
    }

    return nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false,
      auth: {
        user: "apikey",
        pass: credentials.api_key,
      },
    });
  } catch (error) {
    console.error("SendGrid transporter error:", error);
    return null;
  }
}

function createSMTPTransporter(config: any) {
  try {
    const { host, port, secure, username, password } = config;

    if (!host || !username || !password) {
      throw new Error("Missing SMTP configuration");
    }

    return nodemailer.createTransport({
      host,
      port: port || 587,
      secure: secure || false,
      auth: {
        user: username,
        pass: password,
      },
    });
  } catch (error) {
    console.error("SMTP transporter error:", error);
    return null;
  }
}