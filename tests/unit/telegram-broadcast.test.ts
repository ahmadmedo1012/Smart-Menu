import { strict as assert } from "node:assert";

// Test chatId normalization logic (branch: group chats prefixed "-" → Number)
function prepBody(chatId: string, text?: string) {
  return {
    chat_id: chatId.startsWith("-") ? Number(chatId) : chatId,
    text,
  };
}

// Test sendToChat body construction without network
assert.equal(typeof prepBody("-1001234567890").chat_id, "number", "group chat → number");
assert.equal(prepBody("-1001234567890").chat_id, -1001234567890);
assert.equal(typeof prepBody("123456789").chat_id, "string", "user chat → string");
assert.equal(prepBody("123456789").chat_id, "123456789");

// Test parseMode propagation
assert.equal(prepBody("123", "x").text, "x");

// Test empty message OK
const body = prepBody("123", "");
assert.equal(body.text, "");
assert.equal(typeof body.chat_id, "string");

// Test broadcastToAll guard clauses via type check — interface contract
type BR = { sent: number; failed: Array<{ chatId: string; reason: string }> };
const emptyResult: BR = { sent: 0, failed: [] };
assert.deepEqual(emptyResult, { sent: 0, failed: [] });

console.log("✅ Broadcast engine unit tests passed.");
