import { existsSync, mkdirSync } from "node:fs";
import { extname, join } from "node:path";

const FALLBACK_EXTENSIONS = [".jpeg", ".jpg", ".png", ".webp"];

export function ensureCharacterAssetDir(rootDir: string) {
  const dir = join(rootDir, "characters");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function getCharacterAssetExtensionFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const extension = extname(parsed.pathname).toLowerCase();
    return extension || ".jpeg";
  } catch {
    return ".jpeg";
  }
}

export function getCharacterAssetPath(rootDir: string, sourceId: string, extension: string) {
  return join(ensureCharacterAssetDir(rootDir), `${sourceId}${extension}`);
}

export function findExistingCharacterAsset(rootDir: string, sourceId: string) {
  const dir = ensureCharacterAssetDir(rootDir);

  for (const extension of FALLBACK_EXTENSIONS) {
    const filePath = join(dir, `${sourceId}${extension}`);
    if (existsSync(filePath)) {
      return {
        filePath,
        extension
      };
    }
  }

  return null;
}

export function getCharacterAssetApiPath(sourceId: string) {
  return `/v1/assets/characters/${sourceId}`;
}

export function getMimeTypeForExtension(extension: string) {
  switch (extension) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".jpg":
    case ".jpeg":
    default:
      return "image/jpeg";
  }
}
