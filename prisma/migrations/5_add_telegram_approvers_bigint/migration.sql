-- Alter telegramId column from INTEGER to BIGINT for 64-bit Telegram IDs
ALTER TABLE "TelegramApprover" ALTER COLUMN "telegramId" TYPE BIGINT;
