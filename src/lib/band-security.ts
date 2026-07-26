import { createHmac, timingSafeEqual } from "crypto";

export function verifyBandWorkerSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.INTERNAL_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}
