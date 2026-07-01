import { readFileSync } from "node:fs";
import path from "node:path";
import GLPK, { type GLPK as GlpkInstance } from "glpk.js";

let glpkInstance: GlpkInstance | null = null;

function resolveWasmPath(): string {
  return path.join(process.cwd(), "node_modules", "glpk.js", "dist", "glpk.wasm");
}

export function getGlpk(): GlpkInstance {
  if (!glpkInstance) {
    const wasmBinary = readFileSync(resolveWasmPath());
    // glpk.js accepts the wasm bytes as its optional constructor argument.
    glpkInstance = (GLPK as (wasm?: Buffer) => GlpkInstance)(wasmBinary);
  }
  return glpkInstance;
}
