import { WorkflowContext, ActionResult } from "../workflowEngine";
import { executeEmailAction } from "./emailHandler";
import { executeWebhookAction } from "./webhookHandler";
import { executeDatabaseAction } from "./databaseHandler";
import { executeSMSAction } from "./smsHandler";

export async function executeAction(action: any, context: WorkflowContext): Promise<ActionResult> {
  const { type, config } = action;

  switch (type) {
    case "email":
      return await executeEmailAction(config, context);

    case "webhook":
      return await executeWebhookAction(config, context);

    case "database":
      return await executeDatabaseAction(config, context);

    case "sms":
      return await executeSMSAction(config, context);

    case "notification":
      return await executeNotificationAction(config, context);

    case "delay":
      return await executeDelayAction(config, context);

    default:
      return {
        success: false,
        error: `Unknown action type: ${type}`,
      };
  }
}

async function executeNotificationAction(config: any, context: WorkflowContext): Promise<ActionResult> {
  try {
    const { prisma } = await import("../prisma");

    await prisma.notification.create({
      data: {
        userId: context.userId,
        type: "workflow_success",
        message: config.message || "Workflow completed successfully",
        metadata: {
          workflowId: context.workflowId,
          context: context.stepResults,
        },
      },
    });

    return {
      success: true,
      data: { message: "Notification sent" },
    };
  } catch (error) {
    return {
      success: false,
      error: `Notification action failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function executeDelayAction(config: any, context: WorkflowContext): Promise<ActionResult> {
  try {
    const delayMs = config.duration ? parseInt(config.duration) : 1000;

    await new Promise(resolve => setTimeout(resolve, delayMs));

    return {
      success: true,
      data: { message: `Delayed for ${delayMs}ms` },
    };
  } catch (error) {
    return {
      success: false,
      error: `Delay action failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}