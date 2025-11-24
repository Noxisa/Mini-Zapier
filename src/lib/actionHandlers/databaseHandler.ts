import { WorkflowContext, ActionResult } from "../workflowEngine";
import { prisma } from "../prisma";

export async function executeDatabaseAction(config: any, context: WorkflowContext): Promise<ActionResult> {
  try {
    const { operation, table, data, conditions, database_integration_id } = config;

    if (!operation) {
      return {
        success: false,
        error: "Database operation is required",
      };
    }

    switch (operation) {
      case "insert":
        return await executeInsert(table, data);

      case "update":
        return await executeUpdate(table, data, conditions);

      case "find":
        return await executeFind(table, conditions);

      case "delete":
        return await executeDelete(table, conditions);

      default:
        return {
          success: false,
          error: `Unsupported database operation: ${operation}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: `Database action failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function executeInsert(table: string, data: any): Promise<ActionResult> {
  try {
    // For this implementation, we'll use Prisma operations on predefined models
    // In a real implementation, you'd connect to external databases based on integrations

    if (table === "customers") {
      const customer = await prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          // Map other fields as needed
        },
      });

      return {
        success: true,
        data: {
          operation: "insert",
          table,
          record: customer,
          id: customer.id,
        },
      };
    }

    if (table === "logs") {
      // Create a custom log entry (could use a different table)
      const logEntry = await prisma.execution.create({
        data: {
          workflowId: data.workflowId || "temp",
          status: "completed",
          input: data.input || {},
          output: data.output || {},
        },
      });

      return {
        success: true,
        data: {
          operation: "insert",
          table,
          record: logEntry,
          id: logEntry.id,
        },
      };
    }

    // For other tables, return a mock response
    return {
      success: true,
      data: {
        operation: "insert",
        table,
        record: data,
        id: `mock_${Date.now()}`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Insert operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function executeUpdate(table: string, data: any, conditions: any): Promise<ActionResult> {
  try {
    let result;

    if (table === "users" && conditions?.id) {
      result = await prisma.user.update({
        where: { id: conditions.id },
        data,
      });
    } else if (table === "workflows" && conditions?.id) {
      result = await prisma.workflow.update({
        where: { id: conditions.id },
        data,
      });
    } else {
      // Mock update for other tables
      result = { ...data, ...conditions, updated: true };
    }

    return {
      success: true,
      data: {
        operation: "update",
        table,
        conditions,
        record: result,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Update operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function executeFind(table: string, conditions: any): Promise<ActionResult> {
  try {
    let results;

    if (table === "users") {
      results = await prisma.user.findMany({
        where: conditions,
      });
    } else if (table === "workflows") {
      results = await prisma.workflow.findMany({
        where: conditions,
      });
    } else if (table === "executions") {
      results = await prisma.execution.findMany({
        where: conditions,
      });
    } else {
      // Mock find for other tables
      results = [{ id: 1, ...conditions, table }];
    }

    return {
      success: true,
      data: {
        operation: "find",
        table,
        conditions,
        records: results,
        count: results.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Find operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function executeDelete(table: string, conditions: any): Promise<ActionResult> {
  try {
    let result;

    if (table === "users" && conditions?.id) {
      result = await prisma.user.delete({
        where: { id: conditions.id },
      });
    } else if (table === "workflows" && conditions?.id) {
      result = await prisma.workflow.delete({
        where: { id: conditions.id },
      });
    } else {
      // Mock delete for other tables
      result = { id: conditions?.id, deleted: true };
    }

    return {
      success: true,
      data: {
        operation: "delete",
        table,
        conditions,
        record: result,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Delete operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}