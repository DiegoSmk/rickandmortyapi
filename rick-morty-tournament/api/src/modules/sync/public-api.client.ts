import type { AppEnv } from "../../config/env";

export interface PublicApiCharacter {
  id: number;
  name: string;
  status: string;
  species: string;
  type: string;
  gender: string;
  origin: { name: string; url: string };
  location: { name: string; url: string };
  image: string;
  episode: string[];
  url: string;
  created: string;
}

export interface PublicApiEpisode {
  id: number;
  name: string;
  air_date: string;
  episode: string;
  characters: string[];
  url: string;
  created: string;
}

interface PublicApiCharacterPage {
  info: {
    count: number;
    pages: number;
    next: string | null;
    prev: string | null;
  };
  results: PublicApiCharacter[];
}

export class PublicApiClient {
  constructor(private readonly env: AppEnv) {}

  async fetchCharacterPage(page: number) {
    const response = await fetch(`${this.env.RICK_AND_MORTY_API_BASE_URL}/character?page=${page}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch character page ${page}: ${response.status}`);
    }

    return response.json() as Promise<PublicApiCharacterPage>;
  }

  async fetchEpisodeByUrl(url: string) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch episode ${url}: ${response.status}`);
    }

    return response.json() as Promise<PublicApiEpisode>;
  }
}
