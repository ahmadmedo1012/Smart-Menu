import { createHmac } from "crypto";
import { success, error, handleError } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";

export async function POST() {
  try {
    const auth = await requirePermission("EDIT_SETTINGS");
    if (!auth.authorized) return error(auth.error, auth.status);
    if (!auth.userId) return error("غير مصرح", 401);

    const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
    if (!secret) return error("AUTH_SECRET غير مضبوط", 500);

    const exp = Math.floor(Date.now() / 1000) + 300; // 5 min
    const payload = JSON.stringify({ userId: auth.userId, exp });
    const sig = createHmac("sha256", secret).update(payload).digest("hex");
    const token = Buffer.from(payload + "." + sig).toString("base64url");

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "your_bot";

    return success({
      url: `https://t.me/${botUsername}?start=verify_${token}`,
      token,
      expiresIn: 300,
    });
  } catch (e) {
    return handleError(e);
  }
}
