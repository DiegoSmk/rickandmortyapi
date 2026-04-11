import { createHash, randomUUID } from "node:crypto";

export function createId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

export function stableHash(input: string) {
  return createHash("sha256").update(input).digest("hex");
}
