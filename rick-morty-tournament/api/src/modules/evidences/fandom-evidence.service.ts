import type { FastifyInstance } from "fastify";
import type { CreateCharacterEvidenceInput } from "../../db/repositories/evidences.repository";

const ALLOWED_HOSTS = new Set([
  "rickandmorty.fandom.com",
  "rickandmorty.fandom.com."
]);

function decodeHtml(text: string) {
  return text
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(text: string) {
  return decodeHtml(
    text
      .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, " ")
      .replace(/<small\b[^>]*>[\s\S]*?<\/small>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\[\s*\d+\s*]/g, " ")
  );
}

function isUsefulNarrativeParagraph(text: string) {
  if (text.length < 80) {
    return false;
  }

  if (/(Biographical Information|Meta Information|AKA|SPECIES|STATUS|OCCUPATION|AFFILIATION|FAMILY|RELATIONSHIPS|VOICE ACTOR)/i.test(text)) {
    return false;
  }

  return / is | was | are | were | became | joined | fought | invented | revealed | killed | moved | protagonist /i.test(text);
}

function extractParagraphs(html: string, limit: number) {
  const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripTags(match[1] ?? ""))
    .filter(isUsefulNarrativeParagraph)
    .slice(0, limit);

  return paragraphs;
}

function resolveFandomPageName(url: URL) {
  const pathMatch = url.pathname.match(/^\/wiki\/(.+)$/);
  if (!pathMatch?.[1]) {
    throw new Error("Fandom URL must target a /wiki/... page.");
  }

  return decodeURIComponent(pathMatch[1]);
}

function classifyParagraph(paragraph: string) {
  const normalized = paragraph.toLowerCase();

  if (/invent|device|technology|portal|science|scientist|gadget|weapon/.test(normalized)) {
    return {
      evidenceType: "technology_mastery",
      title: "Uso de tecnologia relevante"
    };
  }

  if (/manipulat|persuad|leader|control|influence|convince/.test(normalized)) {
    return {
      evidenceType: "social_influence",
      title: "Influencia sobre outros personagens"
    };
  }

  if (/fight|battle|kill|attack|defeat|combat|weaponized/.test(normalized)) {
    return {
      evidenceType: "combat_feat",
      title: "Feito de combate observado"
    };
  }

  if (/crazy|unstable|chaos|erratic|impulsive|unpredictable/.test(normalized)) {
    return {
      evidenceType: "instability_signal",
      title: "Sinal de instabilidade comportamental"
    };
  }

  return {
    evidenceType: "narrative_context",
    title: "Contexto narrativo adicional"
  };
}

export class FandomEvidenceService {
  constructor(private readonly app: FastifyInstance) {}

  private validateUrl(url: string) {
    let parsed: URL;

    try {
      parsed = new URL(url);
    } catch {
      throw new Error("Invalid pageUrl.");
    }

    if (parsed.protocol !== "https:") {
      throw new Error("Only https URLs are allowed for fandom import.");
    }

    if (!ALLOWED_HOSTS.has(parsed.hostname)) {
      throw new Error("URL host is not allowed.");
    }

    return parsed;
  }

  async importCharacterPage(characterId: string, pageUrl: string, maxParagraphs = 4) {
    const character = this.app.repositories.characters.getById(characterId);
    if (!character) {
      throw new Error("Character not found.");
    }

    const parsedUrl = this.validateUrl(pageUrl);
    const pageName = resolveFandomPageName(parsedUrl);
    const apiUrl = new URL("/api.php", parsedUrl.origin);
    apiUrl.searchParams.set("action", "parse");
    apiUrl.searchParams.set("page", pageName);
    apiUrl.searchParams.set("prop", "text");
    apiUrl.searchParams.set("format", "json");

    const response = await fetch(apiUrl.toString());

    if (!response.ok) {
      throw new Error(`Fandom request failed with status ${response.status}.`);
    }

    const payload = await response.json() as {
      parse?: {
        title?: string;
        text?: {
          "*": string;
        };
      };
    };

    const html = payload.parse?.text?.["*"];
    if (!html) {
      throw new Error("Fandom parse API returned no page content.");
    }

    const title = payload.parse?.title ?? pageName.replaceAll("_", " ");
    const paragraphs = extractParagraphs(html, Math.max(1, Math.min(maxParagraphs, 8)));
    const summary = paragraphs[0] ?? null;

    const rows: CreateCharacterEvidenceInput[] = [];

    if (summary) {
      rows.push({
        characterId,
        evidenceType: "external_summary",
        title: `Resumo externo: ${title}`,
        description: summary,
        sourceKind: "fandom_page",
        sourceName: "fandom",
        sourceRef: parsedUrl.toString(),
        confidence: 0.62
      });
    }

    for (const paragraph of paragraphs) {
      const classification = classifyParagraph(paragraph);
      rows.push({
        characterId,
        evidenceType: classification.evidenceType,
        title: classification.title,
        description: paragraph,
        sourceKind: "fandom_page",
        sourceName: "fandom",
        sourceRef: parsedUrl.toString(),
        confidence: 0.58
      });
    }

    if (rows.length === 0) {
      throw new Error("No usable evidence was extracted from the provided Fandom page.");
    }

    this.app.repositories.evidences.deleteBySource(characterId, "fandom_page", parsedUrl.toString());
    this.app.repositories.evidences.insertMany(rows);

    return {
      characterId,
      pageTitle: title,
      pageUrl: parsedUrl.toString(),
      importedCount: rows.length,
      items: this.app.repositories.evidences.listForCharacter(characterId)
    };
  }
}
