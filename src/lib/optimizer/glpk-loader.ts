import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import GLPK, { type GLPK as GlpkInstance } from "glpk.js";

let glpkInstance: GlpkInstance | null = null;

function resolveWasmPath(): string {
  const require = createRequire(path.join(process.cwd(), "package.json"));
  const packageEntry = require.resolve("glpk.js");
  return path.join(path.dirname(packageEntry), "glpk.wasm");
}

export function getGlpk(): GlpkInstance {
  if (!glpkInstance) {
    const wasmBinary = readFileSync(resolveWasmPath());
    // glpk.js accepts the wasm bytes as its optional constructor argument.
    glpkInstance = (GLPK as (wasm?: Buffer) => GlpkInstance)(wasmBinary);
  }
  return glpkInstance;
}
