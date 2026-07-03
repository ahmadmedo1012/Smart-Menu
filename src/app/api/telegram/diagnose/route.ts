import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";

async function testChatId(
  botToken: string,
  chatId: string,
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const parsed = chatId.match(/^-?\d+$/) ? Number(chatId) : chatId;
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: parsed,
          text: "🔍 Diagnostic Test — if you see this, the target works.",
          parse_mode: "Markdown",
        }),
      },
    );
    if (res.ok) return { ok: true, error: null };
    const err = await res.text();
    return { ok: false, error: err.slice(0, 300) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get("dryRun") === "true";

    const config = await prisma.telegramConfig.findFirst();

    if (!config) {
      return success({
        configExists: false,
        isActive: false,
        botTokenPreview: null,
        events: [],
        broadcastTargets: [],
        linkedAdmins: 0,
      });
    }

    const broadcastTargets = await prisma.telegramBroadcastTarget.findMany();
    const targetResults = await Promise.allSettled(
      broadcastTargets.map(async (t) => {
        const test = config.botToken && config.isActive
          ? dryRun
            ? { ok: null as boolean | null, error: null as string | null }
            : await testChatId(config.botToken, t.chatId)
          : { ok: false as boolean | null, error: "Bot inactive" };
        return { id: t.id, label: t.label || t.chatId, chatId: t.chatId, isActive: t.isActive, ...test };
      }),
    );

    const linkedAdmins = await prisma.user.count({
      where: { telegramChatId: { not: null } },
    });

    return success({
      configExists: true,
      isActive: config.isActive,
      botTokenPreview: config.botToken ? config.botToken.slice(0, 4) + "..." : null,
      events: (config.events as string[]) ?? [],
      broadcastTargets: targetResults.map((r) => (r.status === "fulfilled" ? r.value : { error: "Test failed" })),
      linkedAdmins,
    });
  } catch (e) {
    return handleError(e);
  }
}
