import { existsSync, writeFileSync } from "node:fs";
import { loadEnv } from "../config/env";
import { createDatabase } from "../db/database";
import { CharactersRepository } from "../db/repositories/characters.repository";
import {
  ensureCharacterAssetDir,
  getCharacterAssetExtensionFromUrl,
  getCharacterAssetPath
} from "../modules/assets/character-images";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadWithRetry(url: string, attempts = 4) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(url);

    if (response.ok) {
      return response;
    }

    if (response.status !== 429 && response.status < 500) {
      throw new Error(`HTTP ${response.status}`);
    }

    lastError = new Error(`HTTP ${response.status}`);
    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 0;
    const backoffMs = retryAfterMs || attempt * 1500;
    await sleep(backoffMs);
  }

  throw lastError ?? new Error("Image download failed.");
}

async function main() {
  const env = loadEnv();
  const db = createDatabase(env);
  const repository = new CharactersRepository(db);

  try {
    ensureCharacterAssetDir(env.ASSET_STORAGE_DIR);
    const imageSources = repository.listImageSources();
    let downloaded = 0;
    let skipped = 0;
    let reused = 0;

    for (const item of imageSources) {
      if (!item.sourceId || !item.imageUrl) {
        skipped += 1;
        continue;
      }

      const extension = getCharacterAssetExtensionFromUrl(item.imageUrl);
      const outputPath = getCharacterAssetPath(env.ASSET_STORAGE_DIR, item.sourceId, extension);

      if (existsSync(outputPath)) {
        reused += 1;
        continue;
      }

      try {
        const response = await downloadWithRetry(item.imageUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        writeFileSync(outputPath, buffer);
        downloaded += 1;
        await sleep(250);
      } catch (error) {
        skipped += 1;
        console.error(`Failed to download image for source ${item.sourceId}:`, error);
        await sleep(1500);
      }
    }

    console.log(`Character image bootstrap completed. Downloaded=${downloaded} Reused=${reused} Skipped=${skipped}`);
  } finally {
    db.close();
  }
}

void main();
