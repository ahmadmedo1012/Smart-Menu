import { EventEmitter } from "events";
import { error as logError } from "@/lib/logger";
export const eventEmitter = new EventEmitter();
eventEmitter.setMaxListeners(100);
eventEmitter.on("error", (err) => logError("EventEmitter error: " + (err instanceof Error ? err.message : String(err))));
