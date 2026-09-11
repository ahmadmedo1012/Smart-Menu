import { createRequire } from "module";
import path from "path";
import { pathToFileURL } from "url";
const require = createRequire(pathToFileURL("./babel.config.js"));
const babel = require("@babel/core");
const file = path.resolve("src/app/index.ts");
try {
  const r = await babel.transformFileAsync(file, { cwd: process.cwd(), filename: file });
  console.log("OK,", r.code.length, "chars");
} catch (e) {
  console.log("=== MESSAGE ===");
  console.log(e.message);
  console.log("=== STACK (18) ===");
  console.log((e.stack || "").split("\n").slice(0, 18).join("\n"));
}
