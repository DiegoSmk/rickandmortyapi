CREATE TABLE IF NOT EXISTS variant_families (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dimensions (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  source_label TEXT,
  dimension_kind TEXT,
  confidence REAL NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  source_mode TEXT NOT NULL,
  is_canonical INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  source_id TEXT,
  source_url TEXT,
  location_type TEXT,
  dimension_label TEXT,
  dimension_id TEXT,
  is_dimension_known INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (dimension_id) REFERENCES dimensions(id)
);

CREATE INDEX IF NOT EXISTS idx_locations_source_id ON locations(source_id);
CREATE INDEX IF NOT EXISTS idx_locations_canonical_name ON locations(canonical_name);

CREATE TABLE IF NOT EXISTS canonical_characters (
  id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  variant_family_id TEXT,
  canonical_kind TEXT NOT NULL,
  species TEXT,
  type TEXT,
  gender TEXT,
  status TEXT,
  image_url TEXT,
  origin_location_id TEXT,
  current_location_id TEXT,
  origin_dimension_id TEXT,
  identity_confidence REAL NOT NULL DEFAULT 0 CHECK (identity_confidence >= 0 AND identity_confidence <= 1),
  is_variant INTEGER NOT NULL DEFAULT 0,
  is_fusion INTEGER NOT NULL DEFAULT 0,
  is_alias_only INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (variant_family_id) REFERENCES variant_families(id),
  FOREIGN KEY (origin_location_id) REFERENCES locations(id),
  FOREIGN KEY (current_location_id) REFERENCES locations(id),
  FOREIGN KEY (origin_dimension_id) REFERENCES dimensions(id)
);

CREATE INDEX IF NOT EXISTS idx_canonical_characters_name ON canonical_characters(canonical_name);
CREATE INDEX IF NOT EXISTS idx_canonical_characters_display_name ON canonical_characters(display_name);
CREATE INDEX IF NOT EXISTS idx_canonical_characters_variant_family ON canonical_characters(variant_family_id);

CREATE TABLE IF NOT EXISTS character_aliases (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  alias_name TEXT NOT NULL,
  alias_type TEXT NOT NULL,
  source_name TEXT,
  confidence REAL NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TEXT NOT NULL,
  FOREIGN KEY (character_id) REFERENCES canonical_characters(id)
);

CREATE INDEX IF NOT EXISTS idx_character_aliases_character ON character_aliases(character_id);
CREATE INDEX IF NOT EXISTS idx_character_aliases_name ON character_aliases(alias_name);

CREATE TABLE IF NOT EXISTS source_character_links (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_url TEXT,
  raw_name TEXT,
  raw_payload_hash TEXT,
  match_status TEXT NOT NULL,
  match_confidence REAL NOT NULL DEFAULT 0 CHECK (match_confidence >= 0 AND match_confidence <= 1),
  is_primary_source INTEGER NOT NULL DEFAULT 0,
  last_seen_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (source_name, source_id),
  FOREIGN KEY (character_id) REFERENCES canonical_characters(id)
);

CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  source_name TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_url TEXT,
  name TEXT NOT NULL,
  code TEXT,
  air_date TEXT,
  season_number INTEGER,
  episode_number INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (source_name, source_id)
);

CREATE INDEX IF NOT EXISTS idx_episodes_season_episode ON episodes(season_number, episode_number);
CREATE INDEX IF NOT EXISTS idx_episodes_code ON episodes(code);

CREATE TABLE IF NOT EXISTS character_episodes (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  episode_id TEXT NOT NULL,
  appearance_kind TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (character_id, episode_id),
  FOREIGN KEY (character_id) REFERENCES canonical_characters(id),
  FOREIGN KEY (episode_id) REFERENCES episodes(id)
);

CREATE TABLE IF NOT EXISTS character_evidences (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  source_name TEXT,
  source_ref TEXT,
  season_number INTEGER,
  episode_code TEXT,
  dimension_id TEXT,
  confidence REAL NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  is_manual_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (character_id) REFERENCES canonical_characters(id),
  FOREIGN KEY (dimension_id) REFERENCES dimensions(id)
);

CREATE INDEX IF NOT EXISTS idx_character_evidences_character ON character_evidences(character_id);
CREATE INDEX IF NOT EXISTS idx_character_evidences_type ON character_evidences(evidence_type);
CREATE INDEX IF NOT EXISTS idx_character_evidences_episode_code ON character_evidences(episode_code);

CREATE TABLE IF NOT EXISTS character_profile_ai (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  analysis_version TEXT NOT NULL,
  model_name TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  overall_confidence REAL NOT NULL DEFAULT 0 CHECK (overall_confidence >= 0 AND overall_confidence <= 1),
  created_at TEXT NOT NULL,
  FOREIGN KEY (character_id) REFERENCES canonical_characters(id)
);

CREATE INDEX IF NOT EXISTS idx_character_profile_ai_character_created ON character_profile_ai(character_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_character_profile_ai_analysis_version ON character_profile_ai(analysis_version);

CREATE TABLE IF NOT EXISTS sync_runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  source_name TEXT,
  pages_scanned INTEGER NOT NULL DEFAULT 0,
  records_seen INTEGER NOT NULL DEFAULT 0,
  records_created INTEGER NOT NULL DEFAULT 0,
  records_updated INTEGER NOT NULL DEFAULT 0,
  records_unchanged INTEGER NOT NULL DEFAULT 0,
  records_deactivated INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT
);

CREATE TABLE IF NOT EXISTS reconciliation_events (
  id TEXT PRIMARY KEY,
  entity_id TEXT,
  entity_type TEXT NOT NULL,
  source_name TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  changed_fields_json TEXT,
  reason TEXT,
  confidence REAL NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TEXT NOT NULL
);
