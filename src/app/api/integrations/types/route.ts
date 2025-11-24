import { NextResponse } from "next/server";

// GET - Get available integration types
export async function GET() {
  const integrationTypes = [
    {
      id: "gmail",
      name: "Gmail",
      description: "Send emails through Gmail",
      category: "email",
      authType: "oauth",
      fields: [
        { name: "client_id", label: "Client ID", type: "text", required: true },
        { name: "client_secret", label: "Client Secret", type: "password", required: true },
      ],
    },
    {
      id: "sendgrid",
      name: "SendGrid",
      description: "Send emails via SendGrid API",
      category: "email",
      authType: "api_key",
      fields: [
        { name: "api_key", label: "API Key", type: "password", required: true },
        { name: "from_email", label: "From Email", type: "email", required: true },
      ],
    },
    {
      id: "webhook",
      name: "Webhook",
      description: "Send HTTP requests to any endpoint",
      category: "webhook",
      authType: "custom",
      fields: [
        { name: "url", label: "Webhook URL", type: "url", required: true },
        { name: "method", label: "HTTP Method", type: "select", required: true, options: ["GET", "POST", "PUT", "DELETE"] },
        { name: "headers", label: "Headers (JSON)", type: "json", required: false },
        { name: "auth_type", label: "Auth Type", type: "select", required: false, options: ["none", "bearer", "basic", "api_key"] },
      ],
    },
    {
      id: "custom_api",
      name: "Custom API",
      description: "Connect to any REST API",
      category: "api",
      authType: "custom",
      fields: [
        { name: "base_url", label: "Base URL", type: "url", required: true },
        { name: "auth_type", label: "Auth Type", type: "select", required: true, options: ["bearer", "basic", "api_key", "oauth"] },
        { name: "auth_header", label: "Auth Header", type: "text", required: false },
        { name: "auth_token", label: "Auth Token", type: "password", required: false },
      ],
    },
    {
      id: "twilio",
      name: "Twilio",
      description: "Send SMS messages via Twilio",
      category: "sms",
      authType: "api_key",
      fields: [
        { name: "account_sid", label: "Account SID", type: "text", required: true },
        { name: "auth_token", label: "Auth Token", type: "password", required: true },
        { name: "phone_number", label: "Twilio Phone Number", type: "tel", required: true },
      ],
    },
    {
      id: "database",
      name: "Database",
      description: "Connect to your database",
      category: "database",
      authType: "custom",
      fields: [
        { name: "type", label: "Database Type", type: "select", required: true, options: ["postgresql", "mysql", "mongodb"] },
        { name: "host", label: "Host", type: "text", required: true },
        { name: "port", label: "Port", type: "number", required: true },
        { name: "database", label: "Database Name", type: "text", required: true },
        { name: "username", label: "Username", type: "text", required: true },
        { name: "password", label: "Password", type: "password", required: true },
      ],
    },
  ];

  return NextResponse.json({
    success: true,
    data: integrationTypes,
  });
}