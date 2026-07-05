import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    TELEGRAM_ADMIN_IDS: process.env.TELEGRAM_ADMIN_IDS || "(not set)",
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || "(not set)",
    TELEGRAM_GROUP_IDS: process.env.TELEGRAM_GROUP_IDS || "(not set)",
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? "SET(" + process.env.TELEGRAM_BOT_TOKEN.slice(0, 10) + "...)" : "(not set)",
  });
}
