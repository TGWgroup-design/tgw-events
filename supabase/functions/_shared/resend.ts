export interface EmailAttachment {
  filename: string;
  content: string; // base64
  contentType?: string;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY")!;
  const from = Deno.env.get("RESEND_FROM_ADDRESS") || "TGW Events <tickets@tgwgroup.co.za>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      attachments: params.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `resend_error_${res.status}: ${text}` };
  }
  return { ok: true };
}
