import type { AppEnv } from "../../config/env";

export interface GeminiConfigurationStatus {
  enabled: boolean;
  configured: boolean;
  model: string;
  baseUrl: string;
  hasApiKey: boolean;
}

export interface GeminiGenerateJsonInput {
  systemInstruction: string;
  userPrompt: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GeminiClient {
  constructor(private readonly env: AppEnv) {}

  getConfigurationStatus(): GeminiConfigurationStatus {
    const hasApiKey = Boolean(this.env.GEMINI_API_KEY?.trim());

    return {
      enabled: this.env.ENABLE_GEMINI_ENRICHMENT,
      configured: this.env.ENABLE_GEMINI_ENRICHMENT && hasApiKey,
      model: this.env.GEMINI_MODEL,
      baseUrl: this.env.GEMINI_API_BASE_URL,
      hasApiKey
    };
  }

  isConfigured() {
    return this.getConfigurationStatus().configured;
  }

  private async generateText(input: GeminiGenerateJsonInput): Promise<string> {
    if (!this.env.ENABLE_GEMINI_ENRICHMENT) {
      throw new Error("Gemini enrichment is disabled.");
    }

    if (!this.env.GEMINI_API_KEY?.trim()) {
      throw new Error("Gemini API key is missing.");
    }

    let response: Response | null = null;

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      response = await fetch(
        `${this.env.GEMINI_API_BASE_URL}/models/${this.env.GEMINI_MODEL}:generateContent?key=${this.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: input.systemInstruction }]
            },
            contents: [
              {
                role: "user",
                parts: [{ text: input.userPrompt }]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        }
      );

      if (response.ok) {
        break;
      }

      if (response.status !== 429 && response.status < 500) {
        break;
      }

      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 0;
      const backoffMs = retryAfterMs || attempt * 2000;
      await sleep(backoffMs);
    }

    if (!response?.ok) {
      throw new Error(`Gemini request failed with status ${response?.status ?? "unknown"}.`);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    return text;
  }

  async generateJson<T>(input: GeminiGenerateJsonInput): Promise<T> {
    const text = await this.generateText(input);

    return JSON.parse(text) as T;
  }

  async generateRawJsonText(input: GeminiGenerateJsonInput): Promise<string> {
    return this.generateText(input);
  }
}
