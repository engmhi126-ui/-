/**
 * n8n Integration Helper
 * يرسل أحداث النظام إلى n8n لتشغيل سير العمل التلقائي
 */

export type N8nEventType =
  | "new_voucher"
  | "payment_received"
  | "reminder_sent"
  | "new_customer"
  | "voucher_cancelled";

export interface N8nEvent {
  event: N8nEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * أرسل حدثاً إلى n8n webhook
 * Send an event to n8n webhook
 */
export async function notifyN8n(event: N8nEventType, data: Record<string, unknown>): Promise<void> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) return;

  const apiKey = process.env.N8N_API_KEY;

  const payload: N8nEvent = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) headers["X-N8N-API-Key"] = apiKey;

    await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
  } catch {
    // Non-critical — log silently
    console.warn("[n8n] Failed to notify webhook");
  }
}
