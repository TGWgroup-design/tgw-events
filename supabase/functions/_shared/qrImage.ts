import QRCode from "npm:qrcode@1.5.3";

// Renders a QR code as a PNG buffer. Uses the `qrcode` package's built-in
// pure-JS PNG encoder (no native/canvas dependency), which is what makes it
// viable inside a Deno Edge Function.
export async function renderQrPng(text: string): Promise<Uint8Array> {
  const buffer: Uint8Array = await QRCode.toBuffer(text, {
    type: "png",
    width: 480,
    margin: 2,
  });
  return buffer;
}
