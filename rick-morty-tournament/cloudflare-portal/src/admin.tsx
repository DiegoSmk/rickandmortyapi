import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

type AdminSession = {
  accessAuthenticated: boolean;
  email: string;
  role: "viewer" | "editor" | "admin" | null;
  allowed: boolean;
};

type VoteRow = {
  characterId: string;
  likes: number;
  dislikes: number;
  updatedAt: string;
};

type AuditLog = {
  id: string;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type AdminCharacter = {
  id: string;
  displayName: string;
  canonicalName: string;
  species: string | null;
  type: string | null;
  gender: string | null;
  status: string | null;
  imageUrl: string | null;
  originName: string | null;
  locationName: string | null;
  updatedAt: string;
  enrichment: {
    description: boolean;
    capacityAnalysis: boolean;
    fieldAnalysis: boolean;
    fullyEnriched: boolean;
  };
  aiProfile: any;
};

type FieldLibrary = {
  traits: string[];
  weaknesses: string[];
  abilities: string[];
};

type AdminEpisode = {
  id: string;
  name: string;
  episodeCode: string;
  airDate: string;
  characterCount: number;
};

type AdminLocation = {
  id: string;
  name: string;
  type: string;
  dimension: string;
  residentCount: number;
};

const CAPACITY_LABELS: Record<string, string> = {
  caos: "Chaos",
  sobrevivencia: "Survival",
  instabilidade: "Instability",
  genialidade: "Genius",
  influencia: "Influence",
  vitalidade: "Vitality"
};

type FieldEntryDraft = {
  slug: string;
  score?: string;
  power_level?: string;
  reason: string;
  confidence: string;
};

type ManualFieldDraft = {
  traits: FieldEntryDraft[];
  weaknesses: FieldEntryDraft[];
  abilities: FieldEntryDraft[];
  evidence_summary: string;
};

type ManualInputState = {
  descriptionPt: string;
  descriptionEn: string;
  capacity: string;
  field: ManualFieldDraft;
};

type BaseInputState = {
  displayName: string;
  canonicalName: string;
  species: string;
  type: string;
  gender: string;
  status: string;
  imageUrl: string;
  originName: string;
  locationName: string;
};

function defaultFieldDraft(): ManualFieldDraft {
  return {
    traits: [],
    weaknesses: [],
    abilities: [],
    evidence_summary: ""
  };
}

function emptyManualInput(): ManualInputState {
  return {
    descriptionPt: "",
    descriptionEn: "",
    capacity: "{}",
    field: defaultFieldDraft()
  };
}

function emptyBaseInput(): BaseInputState {
  return {
    displayName: "",
    canonicalName: "",
    species: "",
    type: "",
    gender: "",
    status: "",
    imageUrl: "",
    originName: "",
    locationName: ""
  };
}

function toBaseInput(character: AdminCharacter): BaseInputState {
  return {
    displayName: character.displayName || "",
    canonicalName: character.canonicalName || "",
    species: character.species || "",
    type: character.type || "",
    gender: character.gender || "",
    status: character.status || "",
    imageUrl: character.imageUrl || "",
    originName: character.originName || "",
    locationName: character.locationName || ""
  };
}

function toFieldEntryDraft(entry: any, numericKey: "score" | "power_level"): FieldEntryDraft {
  return {
    slug: entry?.slug || "",
    [numericKey]: entry?.[numericKey] == null ? "" : String(entry[numericKey]),
    reason: entry?.reason || "",
    confidence: entry?.confidence == null ? "0.5" : String(entry.confidence)
  };
}

function toManualFieldDraft(fieldAnalysis: any): ManualFieldDraft {
  if (!fieldAnalysis) {
    return defaultFieldDraft();
  }

  return {
    traits: Array.isArray(fieldAnalysis.traits) ? fieldAnalysis.traits.map((entry: any) => toFieldEntryDraft(entry, "score")) : [],
    weaknesses: Array.isArray(fieldAnalysis.weaknesses) ? fieldAnalysis.weaknesses.map((entry: any) => toFieldEntryDraft(entry, "score")) : [],
    abilities: Array.isArray(fieldAnalysis.abilities) ? fieldAnalysis.abilities.map((entry: any) => toFieldEntryDraft(entry, "power_level")) : [],
    evidence_summary: Array.isArray(fieldAnalysis.evidence_summary) ? fieldAnalysis.evidence_summary.join("\n") : ""
  };
}

function AdminApp() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [summary, setSummary] = useState<{
    trackedCharacters: number;
    catalogCharacters: number;
    catalogEpisodes: number;
    catalogLocations: number;
    totalLikes: number;
    totalDislikes: number;
    topLiked: VoteRow[];
    topDisliked: VoteRow[];
  } | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPagination, setLogsPagination] = useState({ totalPages: 1, total: 0 });
  const [form, setForm] = useState({
    characterId: "",
    likes: "0",
    dislikes: "0",
    reason: ""
  });
  const [activeTab, setActiveTab] = useState<"dashboard" | "moderation" | "logs" | "characters" | "episodes" | "locations">("dashboard");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [resourceImporting, setResourceImporting] = useState<null | "episodes" | "locations">(null);
  const [importPages, setImportPages] = useState("1");
  const [characters, setCharacters] = useState<AdminCharacter[]>([]);
  const [fieldLibrary, setFieldLibrary] = useState<FieldLibrary | null>(null);
  const [characterSearch, setCharacterSearch] = useState("");
  const [charPage, setCharPage] = useState(1);
  const [charPagination, setCharPagination] = useState({ totalPages: 1, total: 0 });
  const [episodes, setEpisodes] = useState<AdminEpisode[]>([]);
  const [locations, setLocations] = useState<AdminLocation[]>([]);
  const [epPage, setEpPage] = useState(1);
  const [locPage, setLocPage] = useState(1);
  const [epPagination, setEpPagination] = useState({ totalPages: 1, total: 0 });
  const [locPagination, setLocPagination] = useState({ totalPages: 1, total: 0 });
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string>("");
  const [manualInputs, setManualInputs] = useState<Record<string, ManualInputState>>({});
  const [baseInputs, setBaseInputs] = useState<Record<string, BaseInputState>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  async function fetchJson(path: string, init?: RequestInit) {
    const response = await fetch(path, init);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error?.message || "Request failed.");
    }

    return payload;
  }

  async function loadLogs(page: number) {
    try {
      const payload = await fetchJson(`/api/v1/admin/audit-logs?page=${page}&pageSize=20`);
      setAuditLogs(payload.data.items || []);
      if (payload.data.pagination) {
        setLogsPagination({
          totalPages: payload.data.pagination.totalPages,
          total: payload.data.pagination.total
        });
      }
      setLogsPage(page);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadEpisodes(page: number) {
    try {
      const payload = await fetchJson(`/api/v1/admin/episodes?page=${page}&pageSize=20`);
      setEpisodes(payload.data.items || []);
      if (payload.data.pagination) {
        setEpPagination({
          totalPages: payload.data.pagination.totalPages,
          total: payload.data.pagination.total
        });
      }
      setEpPage(page);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadLocations(page: number) {
    try {
      const payload = await fetchJson(`/api/v1/admin/locations?page=${page}&pageSize=20`);
      setLocations(payload.data.items || []);
      if (payload.data.pagination) {
        setLocPagination({
          totalPages: payload.data.pagination.totalPages,
          total: payload.data.pagination.total
        });
      }
      setLocPage(page);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadCharacters(page: number, searchArg: string = characterSearch) {
    try {
      const payload = await fetchJson(`/api/v1/admin/characters?page=${page}&pageSize=24&search=${encodeURIComponent(searchArg)}`);
      setCharacters(payload.data.items || []);
      if (payload.data.pagination) {
        setCharPagination({
          totalPages: payload.data.pagination.totalPages,
          total: payload.data.pagination.total
        });
      }
      setCharPage(page);

      setManualInputs((prev) => {
        const next = { ...prev };
        for (const character of payload.data.items) {
          next[character.id] = next[character.id] || {
            descriptionPt: character.aiProfile?.sections?.description?.narrative_summary?.pt || "",
            descriptionEn: character.aiProfile?.sections?.description?.narrative_summary?.en || "",
            capacity: JSON.stringify(
              character.aiProfile?.sections?.capacityAnalysis
                ? {
                    attributes: character.aiProfile.sections.capacityAnalysis.attributes,
                    attribute_reasoning: character.aiProfile.sections.capacityAnalysis.attribute_reasoning
                  }
                : {
                    attributes: {
                      caos: 50,
                      sobrevivencia: 50,
                      instabilidade: 50,
                      genialidade: 50,
                      influencia: 50,
                      vitalidade: 50
                    },
                    attribute_reasoning: {
                      caos: "",
                      sobrevivencia: "",
                      instabilidade: "",
                      genialidade: "",
                      influencia: "",
                      vitalidade: ""
                    }
                  },
              null,
              2
            ),
            field: toManualFieldDraft(character.aiProfile?.sections?.fieldAnalysis)
          };
        }
        return next;
      });

      setBaseInputs((prev) => {
        const next = { ...prev };
        for (const character of payload.data.items) {
          next[character.id] = {
            ...(next[character.id] || emptyBaseInput()),
            ...toBaseInput(character)
          };
        }
        return next;
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function loadDashboard() {
    setLoading(true);

    try {
      const [sessionPayload, summaryPayload, libraryPayload] = await Promise.all([
        fetchJson("/api/v1/admin/session"),
        fetchJson("/api/v1/admin/votes/summary"),
        fetchJson("/api/v1/admin/field-library")
      ]);

      void loadCharacters(1, "");
      void loadLogs(1);
      void loadEpisodes(1);
      void loadLocations(1);

      setSession(sessionPayload.data);
      setSummary(summaryPayload.data);
      setFieldLibrary(libraryPayload.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load admin dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function submitOverride(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");

    try {
      await fetchJson(`/api/v1/admin/votes/override/${encodeURIComponent(form.characterId.trim())}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          likes: Number(form.likes),
          dislikes: Number(form.dislikes),
          reason: form.reason
        })
      });

      setMessage("Vote totals updated successfully.");
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update vote totals.");
    }
  }

  async function importCharacters() {
    setMessage("");
    setImporting(true);

    try {
      const maxPages = Number(importPages);
      const payload = await fetchJson("/api/v1/admin/characters/import-public-api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ maxPages, startPage: 1 })
      });

      setMessage(`Imported ${payload.data.recordsImported} characters from ${payload.data.pagesImported} page(s) of the public API starting at page ${payload.data.startPage}.`);
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to import characters.");
    } finally {
      setImporting(false);
    }
  }

  async function importResource(resource: "episodes" | "locations") {
    setMessage("");
    setResourceImporting(resource);

    const maxPages = Math.min(5, Math.max(1, Number(importPages) || 1));
    let importedRecords = 0;
    let cycles = 0;
    let nextPage = 1;

    try {
      while (cycles < 50) {
        const payload = await fetchJson(`/api/v1/admin/${resource}/import-public-api`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ maxPages, startPage: nextPage })
        });

        const batchRecords = Number(payload.data.recordsImported || 0);
        importedRecords += batchRecords;
        cycles += 1;
        nextPage = Number(payload.data.nextPage || 0);

        if (batchRecords === 0 || !nextPage) {
          break;
        }

        setMessage(`Imported ${importedRecords} ${resource} across ${cycles} batch(es). Next page: ${nextPage}...`);
        await new Promise((resolve) => window.setTimeout(resolve, 350));
      }

      setMessage(`Import finished for ${resource}. Imported ${importedRecords} records in ${cycles} batch(es).`);
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Failed to import ${resource}.`);
    } finally {
      setResourceImporting(null);
    }
  }

  async function importAllGradually() {
    setMessage("");
    setBulkImporting(true);

    const maxPages = Math.min(5, Math.max(1, Number(importPages) || 1));
    let importedRecords = 0;
    let cycles = 0;
    let nextPage = 1;

    try {
      while (cycles < 50) {
        const payload = await fetchJson("/api/v1/admin/characters/import-public-api", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ maxPages, startPage: nextPage })
        });

        const batchRecords = Number(payload.data.recordsImported || 0);
        importedRecords += batchRecords;
        cycles += 1;
        nextPage = Number(payload.data.nextPage || 0);

        if (batchRecords === 0 || !nextPage) {
          break;
        }

        setMessage(`Imported ${importedRecords} characters across ${cycles} batch(es). Next page: ${nextPage}...`);
        await new Promise((resolve) => window.setTimeout(resolve, 350));
      }

      setMessage(`Gradual import finished. Imported ${importedRecords} characters in ${cycles} batch(es).`);
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed during gradual import.");
    } finally {
      setBulkImporting(false);
    }
  }

  async function enrichCharacter(characterId: string, section: "description" | "capacity" | "field" | "all") {
    setBusyAction(`${characterId}:${section}`);
    setMessage("");
    setActionMessage(`Running ${section} enrichment for ${characterId}...`);

    try {
      const response = await fetchJson(`/api/v1/admin/characters/${encodeURIComponent(characterId)}/enrich`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ section })
      });

      const updatedSections = response.data?.aiProfile?.sections || {};
      const completed = [
        updatedSections.description ? "description" : null,
        updatedSections.capacityAnalysis ? "capacity" : null,
        updatedSections.fieldAnalysis ? "field" : null
      ].filter(Boolean).join(", ");

      setMessage(`Enriched ${section} for ${characterId}.`);
      setActionMessage(`Completed ${section} enrichment for ${characterId}. Sections available: ${completed || "none"}.`);
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to enrich character.");
      setActionMessage("");
    } finally {
      setBusyAction(null);
    }
  }

  async function saveManualSection(characterId: string, section: "description" | "capacity" | "field") {
    setBusyAction(`${characterId}:manual:${section}`);
    setMessage("");
    setActionMessage(`Saving manual ${section} for ${characterId}...`);

    try {
      let payload: Record<string, unknown>;
      const current = manualInputs[characterId];

      if (section === "description") {
        payload = {
          narrative_summary: {
            pt: current.descriptionPt.trim(),
            en: current.descriptionEn.trim()
          }
        };
      } else if (section === "capacity") {
        payload = JSON.parse(current.capacity);
      } else {
        payload = {
          traits: current.field.traits.map((entry) => ({
            slug: entry.slug,
            score: Number(entry.score || 0),
            reason: entry.reason,
            confidence: Number(entry.confidence || 0)
          })),
          weaknesses: current.field.weaknesses.map((entry) => ({
            slug: entry.slug,
            score: Number(entry.score || 0),
            reason: entry.reason,
            confidence: Number(entry.confidence || 0)
          })),
          abilities: current.field.abilities.map((entry) => ({
            slug: entry.slug,
            power_level: Number(entry.power_level || 0),
            reason: entry.reason,
            confidence: Number(entry.confidence || 0)
          })),
          evidence_summary: current.field.evidence_summary
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean)
        };
      }

      await fetchJson(`/api/v1/admin/characters/${encodeURIComponent(characterId)}/manual-enrich`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ section, payload })
      });

      setMessage(`Saved manual ${section} for ${characterId}.`);
      setActionMessage(`Manual ${section} saved for ${characterId}.`);
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save manual enrichment.");
      setActionMessage("");
    } finally {
      setBusyAction(null);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, [characterSearch]);

  function patchManualInput(characterId: string, updater: (current: ManualInputState) => ManualInputState) {
    setManualInputs((prev) => ({
      ...prev,
      [characterId]: updater(prev[characterId] || emptyManualInput())
    }));
  }

  function patchBaseInput(characterId: string, updater: (current: BaseInputState) => BaseInputState) {
    setBaseInputs((prev) => ({
      ...prev,
      [characterId]: updater(prev[characterId] || emptyBaseInput())
    }));
  }

  function toggleCardExpansion(characterId: string) {
    setExpandedCards((prev) => ({
      ...prev,
      [characterId]: !prev[characterId]
    }));
  }

  function addFieldEntry(characterId: string, group: "traits" | "weaknesses" | "abilities") {
    patchManualInput(characterId, (current) => ({
      ...current,
      field: {
        ...current.field,
        [group]: [
          ...current.field[group],
          group === "abilities"
            ? { slug: "", power_level: "50", reason: "", confidence: "0.5" }
            : { slug: "", score: "50", reason: "", confidence: "0.5" }
        ]
      }
    }));
  }

  function updateFieldEntry(
    characterId: string,
    group: "traits" | "weaknesses" | "abilities",
    index: number,
    key: "slug" | "score" | "power_level" | "reason" | "confidence",
    value: string
  ) {
    patchManualInput(characterId, (current) => ({
      ...current,
      field: {
        ...current.field,
        [group]: current.field[group].map((entry, entryIndex) =>
          entryIndex === index ? { ...entry, [key]: value } : entry
        )
      }
    }));
  }

  function removeFieldEntry(characterId: string, group: "traits" | "weaknesses" | "abilities", index: number) {
    patchManualInput(characterId, (current) => ({
      ...current,
      field: {
        ...current.field,
        [group]: current.field[group].filter((_, entryIndex) => entryIndex !== index)
      }
    }));
  }

  async function saveBaseContent(characterId: string) {
    setBusyAction(`${characterId}:base`);
    setMessage("");
    setActionMessage(`Saving base content for ${characterId}...`);

    try {
      await fetchJson(`/api/v1/admin/characters/${encodeURIComponent(characterId)}/base-content`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          payload: baseInputs[characterId] || emptyBaseInput()
        })
      });

      setMessage(`Base content saved for ${characterId}.`);
      setActionMessage(`Base content updated for ${characterId}.`);
      await loadCharacters(charPage, characterSearch);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save base content.");
      setActionMessage("");
    } finally {
      setBusyAction(null);
    }
  }

  async function resetAiContent(characterId: string) {
    setBusyAction(`${characterId}:reset-ai`);
    setMessage("");
    setActionMessage(`Removing AI-generated sections for ${characterId}...`);

    try {
      await fetchJson(`/api/v1/admin/characters/${encodeURIComponent(characterId)}/reset-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      setMessage(`AI-generated sections removed for ${characterId}.`);
      setActionMessage(`AI-generated sections cleared for ${characterId}. Manual sections were preserved.`);
      await loadCharacters(charPage, characterSearch);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to reset AI content.");
      setActionMessage("");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main className="admin-shell">
      <section className="admin-hero">
        <p className="admin-kicker">Protected Operations Surface</p>
        <h1>Admin Portal</h1>
        <p className="admin-copy">
          This area is intended for authenticated operators only. Access should be enforced by Cloudflare Access and role mapping on the edge.
        </p>
        {message ? <div className="admin-alert">{message}</div> : null}
        {actionMessage ? <div className="admin-alert admin-alert-info">{actionMessage}</div> : null}
      </section>

      {loading ? <section className="admin-panel">Loading admin telemetry...</section> : null}

      {!loading && session ? (
        <>
          <nav className="admin-tabs">
            <button 
              className={`admin-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button 
              className={`admin-tab ${activeTab === 'characters' ? 'active' : ''}`}
              onClick={() => setActiveTab('characters')}
            >
              Personagens
            </button>
            <button 
              className={`admin-tab ${activeTab === 'episodes' ? 'active' : ''}`}
              onClick={() => setActiveTab('episodes')}
            >
              Episódios
            </button>
            <button 
              className={`admin-tab ${activeTab === 'locations' ? 'active' : ''}`}
              onClick={() => setActiveTab('locations')}
            >
              Localização
            </button>
            <button 
              className={`admin-tab ${activeTab === 'moderation' ? 'active' : ''}`}
              onClick={() => setActiveTab('moderation')}
            >
              Moderação
            </button>
            <button 
              className={`admin-tab ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              Audit Logs
            </button>
          </nav>

          {activeTab === 'dashboard' && (
            <section className="admin-grid">
              <article className="admin-panel">
              <h2>Session</h2>
              <dl className="admin-metadata">
                <div><dt>Email</dt><dd>{session.email || "Unavailable"}</dd></div>
                <div><dt>Role</dt><dd>{session.role || "None"}</dd></div>
                <div><dt>Authenticated</dt><dd>{String(session.accessAuthenticated)}</dd></div>
              </dl>
            </article>

            <article className="admin-panel">
              <h2>Vote Summary</h2>
              <dl className="admin-metadata">
                <div><dt>Tracked Characters</dt><dd>{summary?.trackedCharacters ?? 0}</dd></div>
                <div><dt>Catalog Characters</dt><dd>{summary?.catalogCharacters ?? 0}</dd></div>
                <div><dt>Catalog Episodes</dt><dd>{summary?.catalogEpisodes ?? 0}</dd></div>
                <div><dt>Catalog Locations</dt><dd>{summary?.catalogLocations ?? 0}</dd></div>
                <div><dt>Total Likes</dt><dd>{summary?.totalLikes ?? 0}</dd></div>
                <div><dt>Total Dislikes</dt><dd>{summary?.totalDislikes ?? 0}</dd></div>
              </dl>
            </article>
          </section>
          )}



          {activeTab === 'moderation' && (
            <>
              <section className="admin-grid">
                <article className="admin-panel">
              <h2>Manual Vote Override</h2>
              <p className="admin-copy">Admin-only action. Use this for moderation or recovery, never as the default voting path.</p>
              <form className="admin-form" onSubmit={submitOverride}>
                <label>
                  Character ID
                  <input value={form.characterId} onChange={(event) => setForm((prev) => ({ ...prev, characterId: event.target.value }))} required />
                </label>
                <label>
                  Likes
                  <input type="number" min="0" value={form.likes} onChange={(event) => setForm((prev) => ({ ...prev, likes: event.target.value }))} required />
                </label>
                <label>
                  Dislikes
                  <input type="number" min="0" value={form.dislikes} onChange={(event) => setForm((prev) => ({ ...prev, dislikes: event.target.value }))} required />
                </label>
                <label>
                  Reason
                  <textarea rows={4} value={form.reason} onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))} required />
                </label>
                <button type="submit">Apply Override</button>
              </form>
            </article>

            <article className="admin-panel">
              <h2>Top Liked</h2>
              <ul className="admin-list">
                {(summary?.topLiked || []).map((item) => (
                  <li key={`liked-${item.characterId}`}>
                    <span>{item.characterId}</span>
                    <strong>{item.likes} likes</strong>
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className="admin-grid">
            <article className="admin-panel">
              <h2>Top Disliked</h2>
              <ul className="admin-list">
                {(summary?.topDisliked || []).map((item) => (
                  <li key={`disliked-${item.characterId}`}>
                    <span>{item.characterId}</span>
                    <strong>{item.dislikes} dislikes</strong>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        </>
      )}

        {activeTab === 'logs' && (
          <section className="admin-panel max-width-panel">
            <h2>System Audit Logs</h2>
            <p className="admin-copy" style={{ marginBottom: "16px" }}>Total recorded actions: {logsPagination.total}</p>
            <ul className="admin-list">
              {auditLogs.map((item) => (
                <li key={item.id}>
                  <span>{item.action}</span>
                  <small>{item.actorEmail || "unknown"} • {new Date(item.createdAt).toLocaleString()}</small>
                </li>
              ))}
            </ul>
            <div style={{ display: "flex", gap: "10px", marginTop: "20px", alignItems: "center" }}>
              <button 
                className="admin-secondary-button" 
                style={{ marginTop: 0 }}
                disabled={logsPage <= 1} 
                onClick={() => void loadLogs(logsPage - 1)}
              >
                Previous
              </button>
              <span className="admin-copy">Page {logsPage} of {Math.max(1, logsPagination.totalPages)}</span>
              <button 
                className="admin-secondary-button" 
                style={{ marginTop: 0 }}
                disabled={logsPage >= logsPagination.totalPages} 
                onClick={() => void loadLogs(logsPage + 1)}
              >
                Next
              </button>
            </div>
          </section>
        )}

        {activeTab === 'characters' && (
            <section className="admin-panel">
              <div className="admin-section-header">
                <div>
                  <h2>Personagens & AI Enrichment Board</h2>
                  <p className="admin-copy">
                    Import characters from the public API or enrich them using the tools below. Green cards are fully enriched. Amber cards are partial. Traits, weaknesses and abilities are locked to the approved library below.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="number" min="1" max="5" value={importPages} title="Pages per import"
                    onChange={(event) => setImportPages(event.target.value)}
                    style={{ width: "60px", padding: "8px", borderRadius: "8px", background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}
                  />
                  <button className="admin-secondary-button" style={{ marginTop: 0 }} type="button" onClick={importCharacters} disabled={importing || bulkImporting}>
                    {importing ? "Importing..." : "Import Characters"}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
                <input
                  className="admin-search-input"
                  placeholder="Search characters by name..."
                  value={characterSearch}
                  onChange={(event) => setCharacterSearch(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && loadCharacters(1)}
                />
                <button 
                  className="admin-secondary-button" 
                  style={{ marginTop: 0 }} 
                  onClick={() => void loadCharacters(1)}
                  disabled={Boolean(busyAction)}
                >
                  Search
                </button>
              </div>

            {fieldLibrary ? (
              <div className="admin-library-grid">
                <div className="admin-library-card">
                  <h3>Approved Traits</h3>
                  <div className="admin-chip-grid">
                    {fieldLibrary.traits.map((item) => <span key={item} className="admin-chip">{item}</span>)}
                  </div>
                </div>
                <div className="admin-library-card">
                  <h3>Approved Weaknesses</h3>
                  <div className="admin-chip-grid">
                    {fieldLibrary.weaknesses.map((item) => <span key={item} className="admin-chip">{item}</span>)}
                  </div>
                </div>
                <div className="admin-library-card">
                  <h3>Approved Abilities</h3>
                  <div className="admin-chip-grid">
                    {fieldLibrary.abilities.map((item) => <span key={item} className="admin-chip">{item}</span>)}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="admin-character-grid">
              {characters.map((character) => {
                const stateClass = character.enrichment.fullyEnriched
                  ? "enriched"
                  : character.enrichment.description || character.enrichment.capacityAnalysis || character.enrichment.fieldAnalysis
                    ? "partial"
                    : "empty";
                const isExpanded = Boolean(expandedCards[character.id]);
                const baseInput = baseInputs[character.id] || emptyBaseInput();

                return (
                  <article key={character.id} className={`admin-character-card ${stateClass}`}>
                    <div className="admin-character-card-header">
                      <img src={character.imageUrl || "https://via.placeholder.com/80?text=RM"} alt={character.displayName} />
                      <div>
                        <h3>{character.displayName}</h3>
                        <p>{character.species || "Unknown"} • {character.status || "Unknown"}{character.gender ? ` • ${character.gender}` : ""}</p>
                        <small>{character.id} • Updated {new Date(character.updatedAt).toLocaleString()}</small>
                      </div>
                    </div>

                    <div className="admin-badges-row">
                      <span className={character.enrichment.description ? "admin-badge filled" : "admin-badge"}>Description</span>
                      <span className={character.enrichment.capacityAnalysis ? "admin-badge filled" : "admin-badge"}>Capacity</span>
                      <span className={character.enrichment.fieldAnalysis ? "admin-badge filled" : "admin-badge"}>Field</span>
                      {character.aiProfile?.sections?.description?.source ? (
                        <span className="admin-badge admin-badge-source">
                          Description source: {character.aiProfile.sections.description.source}
                        </span>
                      ) : null}
                    </div>

                    <div className="admin-actions-row">
                      <button
                        className="admin-everything-button"
                        onClick={() => void enrichCharacter(character.id, "all")}
                        disabled={Boolean(busyAction)}
                      >
                        Enrich Everything
                      </button>
                      <button
                        className="admin-secondary-button admin-card-button"
                        type="button"
                        onClick={() => toggleCardExpansion(character.id)}
                        disabled={Boolean(busyAction)}
                      >
                        {isExpanded ? "Collapse Editors" : "Open Editors"}
                      </button>
                      <button
                        className="admin-danger-button admin-card-button"
                        type="button"
                        onClick={() => void resetAiContent(character.id)}
                        disabled={Boolean(busyAction)}
                      >
                        Clear AI Sections
                      </button>
                    </div>

                    {busyAction?.startsWith(`${character.id}:`) ? (
                      <div className="admin-card-status">Running: {busyAction.split(":").slice(1).join(" / ")}</div>
                    ) : null}

                    {isExpanded ? (
                      <div className="admin-card-editors">
                        <section className="admin-editor-panel">
                          <div className="admin-editor-panel-header">
                            <div>
                              <h4>Base Content</h4>
                              <p className="admin-copy">Edit the stored content imported from the public API without touching the AI profile.</p>
                            </div>
                            <button className="admin-inline-save" type="button" onClick={() => void saveBaseContent(character.id)} disabled={Boolean(busyAction)}>
                              Save Base Content
                            </button>
                          </div>
                          <div className="admin-base-form-grid">
                            <label className="admin-mini-label">
                              Display Name
                              <input
                                value={baseInput.displayName}
                                onChange={(event) => patchBaseInput(character.id, (current) => ({ ...current, displayName: event.target.value }))}
                              />
                            </label>
                            <label className="admin-mini-label">
                              Canonical Name
                              <input
                                value={baseInput.canonicalName}
                                onChange={(event) => patchBaseInput(character.id, (current) => ({ ...current, canonicalName: event.target.value }))}
                              />
                            </label>
                            <label className="admin-mini-label">
                              Species
                              <input
                                value={baseInput.species}
                                onChange={(event) => patchBaseInput(character.id, (current) => ({ ...current, species: event.target.value }))}
                              />
                            </label>
                            <label className="admin-mini-label">
                              Type
                              <input
                                value={baseInput.type}
                                onChange={(event) => patchBaseInput(character.id, (current) => ({ ...current, type: event.target.value }))}
                              />
                            </label>
                            <label className="admin-mini-label">
                              Gender
                              <input
                                value={baseInput.gender}
                                onChange={(event) => patchBaseInput(character.id, (current) => ({ ...current, gender: event.target.value }))}
                              />
                            </label>
                            <label className="admin-mini-label">
                              Status
                              <input
                                value={baseInput.status}
                                onChange={(event) => patchBaseInput(character.id, (current) => ({ ...current, status: event.target.value }))}
                              />
                            </label>
                            <label className="admin-mini-label">
                              Origin
                              <input
                                value={baseInput.originName}
                                onChange={(event) => patchBaseInput(character.id, (current) => ({ ...current, originName: event.target.value }))}
                              />
                            </label>
                            <label className="admin-mini-label">
                              Current Location
                              <input
                                value={baseInput.locationName}
                                onChange={(event) => patchBaseInput(character.id, (current) => ({ ...current, locationName: event.target.value }))}
                              />
                            </label>
                            <label className="admin-mini-label admin-wide-field">
                              Image URL
                              <input
                                value={baseInput.imageUrl}
                                onChange={(event) => patchBaseInput(character.id, (current) => ({ ...current, imageUrl: event.target.value }))}
                              />
                            </label>
                          </div>
                        </section>

                        <section className="admin-editor-panel">
                          <div className="admin-editor-panel-header">
                            <div>
                              <h4>AI Controls & Overrides</h4>
                              <p className="admin-copy">Generate section by section, replace with manual content, or clear only AI-generated sections.</p>
                            </div>
                          </div>

                          <div className="admin-actions-row admin-actions-row-dense">
                            <button onClick={() => void enrichCharacter(character.id, "description")} disabled={Boolean(busyAction)}>
                              Enrich Description
                            </button>
                            <button onClick={() => void enrichCharacter(character.id, "capacity")} disabled={Boolean(busyAction)}>
                              Enrich Capacity
                            </button>
                            <button onClick={() => void enrichCharacter(character.id, "field")} disabled={Boolean(busyAction)}>
                              Enrich Field
                            </button>
                            <button
                              className="admin-danger-button"
                              type="button"
                              onClick={() => void resetAiContent(character.id)}
                              disabled={Boolean(busyAction)}
                            >
                              Clear AI Sections
                            </button>
                          </div>

                          {character.aiProfile?.sections?.capacityAnalysis?.attribute_reasoning ? (
                            <div className="admin-reasoning-box">
                              <h4>Capacity Reasoning</h4>
                              <dl className="admin-reasoning-list">
                                {Object.entries(character.aiProfile.sections.capacityAnalysis.attribute_reasoning).map(([key, value]) => (
                                  typeof value === "string" && value.trim() ? (
                                    <div key={key}>
                                      <dt>{CAPACITY_LABELS[key] || key}</dt>
                                      <dd>{value}</dd>
                                    </div>
                                  ) : null
                                ))}
                              </dl>
                            </div>
                          ) : null}

                          <div className="admin-editors-stack">
                            <label className="admin-mini-label">
                              Manual Description PT
                              <textarea
                                rows={4}
                                value={manualInputs[character.id]?.descriptionPt || ""}
                                onChange={(event) => patchManualInput(character.id, (current) => ({
                                  ...current,
                                  descriptionPt: event.target.value
                                }))}
                              />
                            </label>
                            <label className="admin-mini-label">
                              Manual Description EN
                              <textarea
                                rows={4}
                                value={manualInputs[character.id]?.descriptionEn || ""}
                                onChange={(event) => patchManualInput(character.id, (current) => ({
                                  ...current,
                                  descriptionEn: event.target.value
                                }))}
                              />
                            </label>
                            <button className="admin-inline-save" onClick={() => void saveManualSection(character.id, "description")} disabled={Boolean(busyAction)}>
                              Save Manual Description
                            </button>

                            <label className="admin-mini-label">
                              Manual Capacity JSON
                              <textarea
                                rows={8}
                                value={manualInputs[character.id]?.capacity || ""}
                                onChange={(event) => patchManualInput(character.id, (current) => ({
                                  ...current,
                                  capacity: event.target.value
                                }))}
                              />
                            </label>
                            <button className="admin-inline-save" onClick={() => void saveManualSection(character.id, "capacity")} disabled={Boolean(busyAction)}>
                              Save Manual Capacity
                            </button>

                            <div className="admin-mini-label">
                              <span>Manual Field Editor</span>
                              <div className="admin-field-editor">
                                {([
                                  ["traits", "Approved Traits"],
                                  ["weaknesses", "Approved Weaknesses"],
                                  ["abilities", "Approved Abilities"]
                                ] as const).map(([group, label]) => (
                                  <div key={group} className="admin-field-group">
                                    <div className="admin-field-group-header">
                                      <strong>{label}</strong>
                                      <button
                                        type="button"
                                        className="admin-inline-save"
                                        onClick={() => addFieldEntry(character.id, group)}
                                        disabled={Boolean(busyAction) || !fieldLibrary}
                                      >
                                        Add
                                      </button>
                                    </div>

                                    {(manualInputs[character.id]?.field[group] || []).map((entry, index) => (
                                      <div key={`${group}-${index}`} className="admin-field-entry">
                                        <select
                                          value={entry.slug}
                                          onChange={(event) => updateFieldEntry(character.id, group, index, "slug", event.target.value)}
                                        >
                                          <option value="">Select {group.slice(0, -1)}</option>
                                          {(fieldLibrary?.[group] || []).map((option) => (
                                            <option key={option} value={option}>{option}</option>
                                          ))}
                                        </select>
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          value={group === "abilities" ? (entry.power_level || "") : (entry.score || "")}
                                          onChange={(event) => updateFieldEntry(
                                            character.id,
                                            group,
                                            index,
                                            group === "abilities" ? "power_level" : "score",
                                            event.target.value
                                          )}
                                          placeholder={group === "abilities" ? "Power" : "Score"}
                                        />
                                        <input
                                          type="number"
                                          min="0"
                                          max="1"
                                          step="0.1"
                                          value={entry.confidence}
                                          onChange={(event) => updateFieldEntry(character.id, group, index, "confidence", event.target.value)}
                                          placeholder="Confidence"
                                        />
                                        <textarea
                                          rows={3}
                                          value={entry.reason}
                                          onChange={(event) => updateFieldEntry(character.id, group, index, "reason", event.target.value)}
                                          placeholder="Why does this choice fit this character?"
                                        />
                                        <button
                                          type="button"
                                          className="admin-inline-save admin-inline-remove"
                                          onClick={() => removeFieldEntry(character.id, group, index)}
                                          disabled={Boolean(busyAction)}
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ))}

                                <label className="admin-mini-label">
                                  Evidence Summary
                                  <textarea
                                    rows={5}
                                    value={manualInputs[character.id]?.field.evidence_summary || ""}
                                    onChange={(event) => patchManualInput(character.id, (current) => ({
                                      ...current,
                                      field: {
                                        ...current.field,
                                        evidence_summary: event.target.value
                                      }
                                    }))}
                                    placeholder="One evidence note per line"
                                  />
                                </label>
                              </div>
                            </div>
                            <button className="admin-inline-save" onClick={() => void saveManualSection(character.id, "field")} disabled={Boolean(busyAction)}>
                              Save Manual Field
                            </button>
                          </div>
                        </section>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px", alignItems: "center" }}>
              <button 
                className="admin-secondary-button" 
                style={{ marginTop: 0 }}
                disabled={charPage <= 1} 
                onClick={() => void loadCharacters(charPage - 1)}
              >
                Previous
              </button>
              <span className="admin-copy">Page {charPage} of {Math.max(1, charPagination.totalPages)}</span>
              <button 
                className="admin-secondary-button" 
                style={{ marginTop: 0 }}
                disabled={charPage >= charPagination.totalPages} 
                onClick={() => void loadCharacters(charPage + 1)}
              >
                Next
              </button>
            </div>
          </section>
          )}

          {activeTab === 'episodes' && (
            <section className="admin-panel max-width-panel">
              <div className="admin-section-header">
                <h2>Episódios</h2>
                <button
                  className="admin-secondary-button"
                  style={{ marginTop: 0 }}
                  type="button"
                  onClick={() => void importResource("episodes")}
                  disabled={Boolean(resourceImporting) || importing || bulkImporting}
                >
                  {resourceImporting === "episodes" ? "Importing Episodes..." : "Import Episodes from API"}
                </button>
              </div>
              <ul className="admin-list">
                {episodes.map((item) => (
                  <li key={item.id}>
                    <span>{item.name} <small>({item.episodeCode})</small></span>
                    <small>Aired: {item.airDate} • Characters: {item.characterCount}</small>
                  </li>
                ))}
              </ul>
              <div style={{ display: "flex", gap: "10px", marginTop: "20px", alignItems: "center" }}>
                <button 
                  className="admin-secondary-button" 
                  style={{ marginTop: 0 }}
                  disabled={epPage <= 1} 
                  onClick={() => void loadEpisodes(epPage - 1)}
                >
                  Previous
                </button>
                <span className="admin-copy">Page {epPage} of {Math.max(1, epPagination.totalPages)}</span>
                <button 
                  className="admin-secondary-button" 
                  style={{ marginTop: 0 }}
                  disabled={epPage >= epPagination.totalPages} 
                  onClick={() => void loadEpisodes(epPage + 1)}
                >
                  Next
                </button>
              </div>
            </section>
          )}

          {activeTab === 'locations' && (
            <section className="admin-panel max-width-panel">
              <div className="admin-section-header">
                <h2>Localizações</h2>
                <button
                  className="admin-secondary-button"
                  style={{ marginTop: 0 }}
                  type="button"
                  onClick={() => void importResource("locations")}
                  disabled={Boolean(resourceImporting) || importing || bulkImporting}
                >
                  {resourceImporting === "locations" ? "Importing Locations..." : "Import Locations from API"}
                </button>
              </div>
              <ul className="admin-list">
                {locations.map((item) => (
                  <li key={item.id}>
                    <span>{item.name} <small>({item.type || "Unknown"})</small></span>
                    <small>Dimension: {item.dimension || "Unknown"} • Residents: {item.residentCount}</small>
                  </li>
                ))}
              </ul>
              <div style={{ display: "flex", gap: "10px", marginTop: "20px", alignItems: "center" }}>
                <button 
                  className="admin-secondary-button" 
                  style={{ marginTop: 0 }}
                  disabled={locPage <= 1} 
                  onClick={() => void loadLocations(locPage - 1)}
                >
                  Previous
                </button>
                <span className="admin-copy">Page {locPage} of {Math.max(1, locPagination.totalPages)}</span>
                <button 
                  className="admin-secondary-button" 
                  style={{ marginTop: 0 }}
                  disabled={locPage >= locPagination.totalPages} 
                  onClick={() => void loadLocations(locPage + 1)}
                >
                  Next
                </button>
              </div>
            </section>
          )}
        </>
      ) : null}
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
);
