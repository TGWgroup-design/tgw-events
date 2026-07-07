// Ticket QR tokens are "<ticketId>.<base64url HMAC-SHA256 signature>" so a
// scanned code can be verified (unguessable, tamper-evident) before ever
// touching the database.

function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signTicketId(ticketId: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ticketId));
  const signature = base64urlEncode(new Uint8Array(sigBuffer));
  return `${ticketId}.${signature}`;
}

export async function verifyQrToken(
  token: string,
  secret: string,
): Promise<{ valid: boolean; ticketId?: string }> {
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false };
  const [ticketId, signature] = parts;
  const expected = await signTicketId(ticketId, secret);
  const expectedSignature = expected.split(".")[1];
  if (expectedSignature.length !== signature.length) return { valid: false };
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < expectedSignature.length; i++) {
    diff |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  if (diff !== 0) return { valid: false };
  return { valid: true, ticketId };
}
