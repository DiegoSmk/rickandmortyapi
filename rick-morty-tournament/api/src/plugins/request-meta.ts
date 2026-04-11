import { randomUUID } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    requestId: string;
  }
}

export function attachRequestMeta(request: FastifyRequest, _reply: FastifyReply, done: () => void) {
  request.requestId = randomUUID();
  done();
}

export function createMeta(requestId: string) {
  return {
    requestId,
    timestamp: new Date().toISOString()
  };
}
