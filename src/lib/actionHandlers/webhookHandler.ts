import { WorkflowContext, ActionResult } from "../workflowEngine";

export async function executeWebhookAction(config: any, context: WorkflowContext): Promise<ActionResult> {
  try {
    const { url, method = "POST", headers = {}, body, auth_type, auth_token, timeout = 30000 } = config;

    if (!url) {
      return {
        success: false,
        error: "Webhook URL is required",
      };
    }

    // Prepare request headers
    const requestHeaders: Record<string, string> = {};

    // Add default headers
    requestHeaders["Content-Type"] = "application/json";
    requestHeaders["User-Agent"] = "Mini-Zapier/1.0";

    // Add custom headers
    if (headers && typeof headers === "object") {
      Object.assign(requestHeaders, headers);
    }

    // Add authentication
    if (auth_type && auth_token) {
      switch (auth_type) {
        case "bearer":
          requestHeaders["Authorization"] = `Bearer ${auth_token}`;
          break;
        case "api_key":
          requestHeaders["X-API-Key"] = auth_token;
          break;
        case "basic":
          // For basic auth, we'd need username and password
          if (config.auth_username && config.auth_password) {
            const encoded = Buffer.from(`${config.auth_username}:${config.auth_password}`).toString("base64");
            requestHeaders["Authorization"] = `Basic ${encoded}`;
          }
          break;
      }
    }

    // Prepare request body
    let requestBody: string | undefined;
    if (body && (method.toUpperCase() !== "GET" && method.toUpperCase() !== "HEAD")) {
      if (typeof body === "string") {
        requestBody = body;
      } else {
        requestBody = JSON.stringify(body);
      }

      // Update Content-Type header if we're not sending JSON
      if (typeof body === "string" && !body.startsWith("{")) {
        delete requestHeaders["Content-Type"];
        requestHeaders["Content-Type"] = "text/plain";
      }
    }

    // Make the HTTP request
    const response = await fetch(url, {
      method: method.toUpperCase(),
      headers: requestHeaders,
      body: requestBody,
      signal: AbortSignal.timeout(timeout),
    });

    let responseData;
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      try {
        responseData = await response.json();
      } catch {
        responseData = await response.text();
      }
    } else {
      responseData = await response.text();
    }

    // Check if the request was successful
    if (!response.ok) {
      return {
        success: false,
        error: `Webhook request failed with status ${response.status}: ${response.statusText}`,
        data: {
          status: response.status,
          statusText: response.statusText,
          response: responseData,
        },
      };
    }

    return {
      success: true,
      data: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        response: responseData,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          success: false,
          error: `Webhook request timed out after ${config.timeout || 30000}ms`,
        };
      }
      return {
        success: false,
        error: `Webhook action failed: ${error.message}`,
      };
    }

    return {
      success: false,
      error: `Webhook action failed: Unknown error`,
    };
  }
}