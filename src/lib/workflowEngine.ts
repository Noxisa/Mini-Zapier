import { prisma } from "./prisma";
import { substituteVariables } from "./variableSubstitution";
import { executeAction } from "./actionHandlers";

export interface WorkflowContext {
  workflowId: string;
  userId: string;
  triggerData: any;
  variables: Record<string, any>;
  stepResults: Record<string, any>;
}

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
}

export async function executeWorkflow(workflow: any, triggerData: any = {}): Promise<ActionResult & { executionId: string }> {
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create execution record
  const execution = await prisma.execution.create({
    data: {
      workflowId: workflow.id,
      status: "running",
      startTime: new Date(),
      input: triggerData,
    },
  });

  try {
    const context: WorkflowContext = {
      workflowId: workflow.id,
      userId: workflow.userId,
      triggerData,
      variables: { trigger: triggerData },
      stepResults: {},
    };

    const configuration = workflow.configuration;

    // Execute triggers (validate if trigger conditions are met)
    if (configuration.triggers && configuration.triggers.length > 0) {
      for (const trigger of configuration.triggers) {
        const triggerResult = await validateTrigger(trigger, context);
        if (!triggerResult.success) {
          await updateExecutionStatus(execution.id, "failed", triggerResult.error);
          return {
            success: false,
            error: triggerResult.error,
            executionId: execution.id,
          };
        }
        context.stepResults[`trigger_${trigger.type}`] = triggerResult.data;
      }
    }

    // Execute actions in sequence
    if (configuration.actions && configuration.actions.length > 0) {
      for (let i = 0; i < configuration.actions.length; i++) {
        const action = configuration.actions[i];

        try {
          // Substitute variables in action configuration
          const processedAction = substituteVariables(action, context);

          // Execute the action
          const actionResult = await executeAction(processedAction, context);

          if (!actionResult.success) {
            await updateExecutionStatus(execution.id, "failed", actionResult.error);
            return {
              success: false,
              error: `Action ${i + 1} failed: ${actionResult.error}`,
              executionId: execution.id,
            };
          }

          // Store action result for use in subsequent actions
          context.stepResults[`action_${i}`] = actionResult.data;
          context.variables[`action_${i}_result`] = actionResult.data;
        } catch (error) {
          const errorMessage = `Action ${i + 1} error: ${error instanceof Error ? error.message : 'Unknown error'}`;
          await updateExecutionStatus(execution.id, "failed", errorMessage);
          return {
            success: false,
            error: errorMessage,
            executionId: execution.id,
          };
        }
      }
    }

    // Update execution as completed
    await updateExecutionStatus(execution.id, "completed", null, context.stepResults);

    return {
      success: true,
      data: context.stepResults,
      executionId: execution.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown workflow error";
    await updateExecutionStatus(execution.id, "failed", errorMessage);

    return {
      success: false,
      error: errorMessage,
      executionId: execution.id,
    };
  }
}

async function validateTrigger(trigger: any, context: WorkflowContext): Promise<ActionResult> {
  // For webhook triggers, we assume they're valid if the workflow was called
  if (trigger.type === "webhook") {
    return { success: true, data: context.triggerData };
  }

  // For manual triggers, always valid
  if (trigger.type === "manual") {
    return { success: true, data: context.triggerData };
  }

  // For email triggers, we'd check for new emails (implement later)
  if (trigger.type === "email") {
    // TODO: Implement email checking logic
    return { success: true, data: context.triggerData };
  }

  // For schedule triggers, we'd check if it's time to run (implement later)
  if (trigger.type === "schedule") {
    // TODO: Implement schedule validation logic
    return { success: true, data: context.triggerData };
  }

  return {
    success: false,
    error: `Unknown trigger type: ${trigger.type}`,
  };
}

async function updateExecutionStatus(
  executionId: string,
  status: string,
  error: string | null = null,
  output: any = null
): Promise<void> {
  await prisma.execution.update({
    where: { id: executionId },
    data: {
      status,
      endTime: new Date(),
      error,
      output,
    },
  });

  // Create notification for failed executions
  if (status === "failed") {
    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
      include: { workflow: true },
    });

    if (execution) {
      await prisma.notification.create({
        data: {
          userId: execution.workflow.userId,
          type: "workflow_error",
          message: `Workflow "${execution.workflow.name}" failed: ${error}`,
          metadata: {
            workflowId: execution.workflow.id,
            executionId,
          },
        },
      });
    }
  }
}