import type { AppEnv } from "../../config/env";
import { GeminiClient, type GeminiConfigurationStatus } from "./gemini.client";

export class GeminiEnrichmentService {
  private readonly client: GeminiClient;

  constructor(private readonly env: AppEnv) {
    this.client = new GeminiClient(env);
  }

  getStatus(): GeminiConfigurationStatus {
    return this.client.getConfigurationStatus();
  }

  ensureReady() {
    const status = this.getStatus();

    if (!status.enabled) {
      throw new Error("Gemini enrichment is disabled.");
    }

    if (!status.hasApiKey) {
      throw new Error("Gemini API key is missing.");
    }
  }

  async generateJson<T>(systemInstruction: string, userPrompt: string): Promise<T> {
    return this.client.generateJson<T>({ systemInstruction, userPrompt });
  }

  async generateRawJsonText(systemInstruction: string, userPrompt: string) {
    return this.client.generateRawJsonText({ systemInstruction, userPrompt });
  }
}
