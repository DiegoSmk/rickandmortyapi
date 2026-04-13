CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  canonical_kind TEXT NOT NULL DEFAULT 'character',
  species TEXT,
  type TEXT,
  gender TEXT,
  status TEXT,
  image_url TEXT,
  origin_name TEXT,
  location_name TEXT,
  episode_count INTEGER NOT NULL DEFAULT 0 CHECK (episode_count >= 0),
  source_name TEXT NOT NULL DEFAULT 'rick_and_morty_public_api',
  source_id TEXT NOT NULL,
  source_url TEXT,
  episode_urls_json TEXT,
  ai_profile_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  episode_code TEXT NOT NULL,
  air_date TEXT,
  character_count INTEGER NOT NULL DEFAULT 0 CHECK (character_count >= 0),
  source_name TEXT NOT NULL DEFAULT 'rick_and_morty_public_api',
  source_id TEXT NOT NULL,
  source_url TEXT,
  character_urls_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  dimension TEXT,
  resident_count INTEGER NOT NULL DEFAULT 0 CHECK (resident_count >= 0),
  source_name TEXT NOT NULL DEFAULT 'rick_and_morty_public_api',
  source_id TEXT NOT NULL,
  source_url TEXT,
  resident_urls_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS character_votes (
  character_id TEXT PRIMARY KEY,
  likes INTEGER NOT NULL DEFAULT 0 CHECK (likes >= 0),
  dislikes INTEGER NOT NULL DEFAULT 0 CHECK (dislikes >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_email TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_characters_display_name ON characters(display_name);
CREATE INDEX IF NOT EXISTS idx_characters_species ON characters(species);
CREATE INDEX IF NOT EXISTS idx_episodes_name ON episodes(name);
CREATE INDEX IF NOT EXISTS idx_episodes_code ON episodes(episode_code);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);
CREATE INDEX IF NOT EXISTS idx_locations_dimension ON locations(dimension);
