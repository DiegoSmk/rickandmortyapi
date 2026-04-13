import React, { useState, useEffect, useRef } from 'react';
import { ThumbsUp, ThumbsDown, Database, Zap, Search, X, Info, Languages, Volume2, VolumeX, Tv, MapPinned, Users, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation, Trans } from 'react-i18next';

interface Character {
  id: string;
  name: string;
  species: string;
  image: string;
  status: string;
  likes: number;
  dislikes: number;
  origin?: string;
  location?: string;
  gender?: string;
  firstSeenIn?: {
    code?: string | null;
    name?: string | null;
  } | null;
  abilities?: any[];
  traits?: any[];
  weaknesses?: any[];
  attributes?: {
    caos: number;
    sobrevivencia: number;
    instabilidade: number;
    genialidade: number;
    influencia: number;
    vitalidade: number;
  };
  narrative_summary?: string;
  aiProfile?: any;
  episodes?: any[];
}

interface Episode {
  id: string;
  name: string;
  code: string;
  airDate?: string | null;
  characterCount: number;
  characters?: any[];
}

interface Location {
  id: string;
  name: string;
  type?: string | null;
  dimension?: string | null;
  residentCount: number;
  residents?: any[];
}

interface CatalogPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

type CatalogType = 'characters' | 'episodes' | 'locations';

// Global flag to avoid passing state to every call
let IS_SOUND_ENABLED = localStorage.getItem('sound_enabled') !== 'false';

const playSciFiSound = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
  if (!IS_SOUND_ENABLED) return;
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Sound blocked by browser policy until interaction
  }
};

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [soundEnabled, setSoundEnabled] = useState(IS_SOUND_ENABLED);
  const [catalogType, setCatalogType] = useState<CatalogType>('characters');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showSplash, setShowSplash] = useState(true);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailNotice, setDetailNotice] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<CatalogPagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  });
  const fetchRequestRef = useRef<string | null>(null);
  const searchDebounceRef = useRef<number | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [characterInfoSlide, setCharacterInfoSlide] = useState(0);
  const characterInfoResumeRef = useRef<number | null>(null);
  const [characterInfoAutoPlay, setCharacterInfoAutoPlay] = useState(true);
  const [userVotes, setUserVotes] = useState<Record<string, { g?: string, s: Record<string, string> }>>(() => {
    const saved = localStorage.getItem('portal_user_votes_v2');
    if (saved) return JSON.parse(saved);
    
    // Legacy migration (if any)
    const legacy = localStorage.getItem('portal_user_votes');
    if (legacy) {
      const old = JSON.parse(legacy);
      const migrated: any = {};
      Object.keys(old).forEach(k => { migrated[k] = { g: old[k], s: {} }; });
      return migrated;
    }
    return {};
  });

  const toggleLanguage = () => {
    const nextLng = i18n.language.startsWith('pt') ? 'en' : 'pt';
    i18n.changeLanguage(nextLng);
  };

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    IS_SOUND_ENABLED = newState;
    localStorage.setItem('sound_enabled', String(newState));
  };

  useEffect(() => {
    setCharacterInfoSlide(0);
    setCharacterInfoAutoPlay(true);
    if (characterInfoResumeRef.current) {
      window.clearTimeout(characterInfoResumeRef.current);
      characterInfoResumeRef.current = null;
    }
  }, [selectedCharacter?.id]);

  useEffect(() => {
    if (!selectedCharacter || !characterInfoAutoPlay) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCharacterInfoSlide((current) => (current + 1) % 3);
    }, 3500);

    return () => window.clearInterval(intervalId);
  }, [selectedCharacter?.id, characterInfoAutoPlay]);

  function selectCharacterInfoSlide(index: number) {
    setCharacterInfoSlide(index);
    setCharacterInfoAutoPlay(false);

    if (characterInfoResumeRef.current) {
      window.clearTimeout(characterInfoResumeRef.current);
    }

    characterInfoResumeRef.current = window.setTimeout(() => {
      setCharacterInfoAutoPlay(true);
      characterInfoResumeRef.current = null;
    }, 8000);
  }

  const selectLocalizedSummary = (summary: any) => {
    if (!summary) return "";
    if (typeof summary === "string") return summary;
    const prefersPt = i18n.language.toLowerCase().startsWith("pt");
    return prefersPt ? summary.pt || summary.en || "" : summary.en || summary.pt || "";
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
      playSciFiSound(200, 1.5, 'triangle'); // Portal Open Sound
    }, 2500);
    void fetchCatalog('characters', 1, "");
    return () => clearTimeout(timer);
  }, []);

  const API_BASE = '/api';
  const FALLBACK_API = {
    characters: 'https://rickandmortyapi.com/api/character',
    episodes: 'https://rickandmortyapi.com/api/episode',
    locations: 'https://rickandmortyapi.com/api/location'
  };

  const resolveCharacterImage = (imageUrl?: string | null) => {
    if (!imageUrl) {
      return 'https://via.placeholder.com/400?text=Rick+and+Morty';
    }

    if (imageUrl.startsWith('http') || imageUrl.startsWith('/')) {
      return imageUrl;
    }

    return `${API_BASE}${imageUrl}`;
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCharacter(null);
        setSelectedEpisode(null);
        setSelectedLocation(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const fetchCharacters = async (nextPage = page, nextSearch = search) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: "20"
      });

      if (nextSearch.trim()) {
        params.set("search", nextSearch.trim());
      }

      const response = await fetch(`${API_BASE}/v1/characters?${params.toString()}`);
      if (!response.ok) throw new Error("Local API not available");
      const json = await response.json();
      
      const charData = json.data.items.map((item: any) => ({
        id: String(item.id),
        name: item.displayName || item.canonicalName,
        species: item.species,
        image: resolveCharacterImage(item.imageUrl),
        status: item.status,
        likes: item.likes || 0,
        dislikes: item.dislikes || 0,
        origin: item.origin?.locationName || item.origin?.name || "",
        location: item.location?.locationName || item.location?.name || "",
        gender: item.gender,
      }));
      
      setCharacters(charData);
      setPagination(json.data.pagination || {
        page: nextPage,
        pageSize: 20,
        total: charData.length,
        totalPages: 1
      });
      setPage(nextPage);
      setLoading(false);
    } catch (error) {
      console.log("Using fallback API due to:", error);
      fetchFallbackCharacters();
    }
  };

  const fetchFallbackCharacters = async () => {
    try {
      const response = await fetch(FALLBACK_API.characters);
      const json = await response.json();
      const results = Array.isArray(json.results) ? json.results : [];
      if (!response.ok && response.status === 404) {
        setCharacters([]);
        setPagination({
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0
        });
        setPage(1);
        setLoading(false);
        return;
      }
      const charData = results.map((item: any) => ({
        id: String(item.id),
        name: item.name,
        species: item.species,
        image: item.image,
        status: item.status,
        likes: 0,
        dislikes: 0,
        origin: item.origin?.name,
        location: item.location?.name,
        gender: item.gender,
      }));
      setCharacters(charData);
      setPagination({
        page: 1,
        pageSize: charData.length,
        total: charData.length,
        totalPages: 1
      });
      setPage(1);
      setLoading(false);
    } catch (err) {
      console.error("Fallback API failed:", err);
      setLoading(false);
    }
  };

  const fetchEpisodes = async (nextPage = page, nextSearch = search) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: "20"
      });

      if (nextSearch.trim()) {
        params.set("search", nextSearch.trim());
      }

      const response = await fetch(`${API_BASE}/v1/episodes?${params.toString()}`);
      if (!response.ok) throw new Error("Local episodes API not available");
      const json = await response.json();

      const nextItems = json.data.items.map((item: any) => ({
        id: String(item.id),
        name: item.name,
        code: item.episode,
        airDate: item.air_date,
        characterCount: item.characterCount || item.characters?.length || 0,
        characters: item.characters || []
      }));

      setEpisodes(nextItems);
      setPagination(json.data.pagination || {
        page: nextPage,
        pageSize: 20,
        total: nextItems.length,
        totalPages: 1
      });
      setPage(nextPage);
      setLoading(false);
    } catch (error) {
      console.log("Using episode fallback API due to:", error);
      fetchFallbackEpisodes(nextPage, nextSearch);
    }
  };

  const fetchFallbackEpisodes = async (nextPage = 1, nextSearch = search) => {
    try {
      const upstreamUrl = new URL(FALLBACK_API.episodes);
      upstreamUrl.searchParams.set("page", String(nextPage));
      if (nextSearch.trim()) {
        upstreamUrl.searchParams.set("name", nextSearch.trim());
      }

      const response = await fetch(upstreamUrl.toString());
      const json = await response.json();
      const results = Array.isArray(json.results) ? json.results : [];
      if (!response.ok && response.status === 404) {
        setEpisodes([]);
        setPagination({
          page: nextPage,
          pageSize: 20,
          total: 0,
          totalPages: 0
        });
        setPage(nextPage);
        setLoading(false);
        return;
      }
      const nextItems = results.map((item: any) => ({
        id: String(item.id),
        name: item.name,
        code: item.episode,
        airDate: item.air_date,
        characterCount: Array.isArray(item.characters) ? item.characters.length : 0,
        characters: item.characters || []
      }));
      setEpisodes(nextItems);
      setPagination({
        page: nextPage,
        pageSize: nextItems.length,
        total: Number(json.info?.count || nextItems.length),
        totalPages: Number(json.info?.pages || 1)
      });
      setPage(nextPage);
      setLoading(false);
    } catch (err) {
      console.error("Fallback episodes API failed:", err);
      setLoading(false);
    }
  };

  const fetchLocations = async (nextPage = page, nextSearch = search) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: "20"
      });

      if (nextSearch.trim()) {
        params.set("search", nextSearch.trim());
      }

      const response = await fetch(`${API_BASE}/v1/locations?${params.toString()}`);
      if (!response.ok) throw new Error("Local locations API not available");
      const json = await response.json();

      const nextItems = json.data.items.map((item: any) => ({
        id: String(item.id),
        name: item.name,
        type: item.type,
        dimension: item.dimension,
        residentCount: item.residentCount || item.residents?.length || 0,
        residents: item.residents || []
      }));

      setLocations(nextItems);
      setPagination(json.data.pagination || {
        page: nextPage,
        pageSize: 20,
        total: nextItems.length,
        totalPages: 1
      });
      setPage(nextPage);
      setLoading(false);
    } catch (error) {
      console.log("Using location fallback API due to:", error);
      fetchFallbackLocations(nextPage, nextSearch);
    }
  };

  const fetchFallbackLocations = async (nextPage = 1, nextSearch = search) => {
    try {
      const upstreamUrl = new URL(FALLBACK_API.locations);
      upstreamUrl.searchParams.set("page", String(nextPage));
      if (nextSearch.trim()) {
        upstreamUrl.searchParams.set("name", nextSearch.trim());
      }

      const response = await fetch(upstreamUrl.toString());
      const json = await response.json();
      const results = Array.isArray(json.results) ? json.results : [];
      if (!response.ok && response.status === 404) {
        setLocations([]);
        setPagination({
          page: nextPage,
          pageSize: 20,
          total: 0,
          totalPages: 0
        });
        setPage(nextPage);
        setLoading(false);
        return;
      }
      const nextItems = results.map((item: any) => ({
        id: String(item.id),
        name: item.name,
        type: item.type,
        dimension: item.dimension,
        residentCount: Array.isArray(item.residents) ? item.residents.length : 0,
        residents: item.residents || []
      }));
      setLocations(nextItems);
      setPagination({
        page: nextPage,
        pageSize: nextItems.length,
        total: Number(json.info?.count || nextItems.length),
        totalPages: Number(json.info?.pages || 1)
      });
      setPage(nextPage);
      setLoading(false);
    } catch (err) {
      console.error("Fallback locations API failed:", err);
      setLoading(false);
    }
  };

  const fetchCatalog = async (kind = catalogType, nextPage = page, nextSearch = search) => {
    if (kind === 'episodes') {
      await fetchEpisodes(nextPage, nextSearch);
      return;
    }

    if (kind === 'locations') {
      await fetchLocations(nextPage, nextSearch);
      return;
    }

    await fetchCharacters(nextPage, nextSearch);
  };

  useEffect(() => {
    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = window.setTimeout(() => {
      void fetchCatalog(catalogType, 1, search);
    }, 250);

    return () => {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
  }, [search, catalogType]);

  const fetchCharacterDetails = async (char: Character) => {
    setDetailLoading(true);
    setDetailNotice("");
    setSelectedCharacter(char);
    setSelectedEpisode(null);
    setSelectedLocation(null);
    
    const requestId = char.id;
    fetchRequestRef.current = requestId;
    
    try {
      const response = await fetch(`${API_BASE}/v1/characters/${char.id}`);
      if (!response.ok) throw new Error("Local detail API not available");
      const json = await response.json();
      const detailed = json.data;
      
      // RACING CONDITION CHECK
      if (fetchRequestRef.current !== requestId) return;

      if (detailed) {
        setSelectedCharacter(prev => {
          if (!prev) return null;
          const ai = detailed.aiProfile;
          return {
            ...prev,
            id: String(detailed.id),
            name: detailed.displayName || detailed.canonicalName,
            status: detailed.status,
            species: detailed.species,
            type: detailed.type,
            gender: detailed.gender,
            firstSeenIn: detailed.firstSeenIn || null,
            episodes: detailed.episodes || [],
            abilities: ai?.abilities || [],
            traits: ai?.traits || [],
            weaknesses: ai?.weaknesses || [],
            attributes: ai?.attributes || null,
            narrative_summary: selectLocalizedSummary(ai?.narrative_summary),
            aiProfile: ai || null,
          };
        });
      }
    } catch (error) {
      setDetailNotice(t('modal.detail_fallback_notice'));
    } finally {
      if (fetchRequestRef.current === requestId) {
        setDetailLoading(false);
      }
    }
  };

  const fetchEpisodeDetails = async (episode: Episode) => {
    setDetailLoading(true);
    setDetailNotice("");
    setSelectedEpisode(episode);
    setSelectedCharacter(null);
    setSelectedLocation(null);

    const requestId = `episode:${episode.id}`;
    fetchRequestRef.current = requestId;

    try {
      const response = await fetch(`${API_BASE}/v1/episodes/${episode.id}`);
      if (!response.ok) throw new Error("Local episode detail API not available");
      const json = await response.json();
      const detailed = json.data;

      if (fetchRequestRef.current !== requestId) return;

      if (detailed) {
        setSelectedEpisode({
          id: String(detailed.id),
          name: detailed.name,
          code: detailed.episode,
          airDate: detailed.air_date,
          characterCount: detailed.characterCount || detailed.characters?.length || 0,
          characters: detailed.characters || []
        });
      }
    } catch (error) {
      setDetailNotice(t('modal.detail_fallback_notice'));
    } finally {
      if (fetchRequestRef.current === requestId) {
        setDetailLoading(false);
      }
    }
  };

  const fetchLocationDetails = async (location: Location) => {
    setDetailLoading(true);
    setDetailNotice("");
    setSelectedLocation(location);
    setSelectedCharacter(null);
    setSelectedEpisode(null);

    const requestId = `location:${location.id}`;
    fetchRequestRef.current = requestId;

    try {
      const response = await fetch(`${API_BASE}/v1/locations/${location.id}`);
      if (!response.ok) throw new Error("Local location detail API not available");
      const json = await response.json();
      const detailed = json.data;

      if (fetchRequestRef.current !== requestId) return;

      if (detailed) {
        setSelectedLocation({
          id: String(detailed.id),
          name: detailed.name,
          type: detailed.type,
          dimension: detailed.dimension,
          residentCount: detailed.residentCount || detailed.residents?.length || 0,
          residents: detailed.residents || []
        });
      }
    } catch (error) {
      setDetailNotice(t('modal.detail_fallback_notice'));
    } finally {
      if (fetchRequestRef.current === requestId) {
        setDetailLoading(false);
      }
    }
  };

  const switchCatalog = (kind: CatalogType) => {
    setCatalogType(kind);
    setPage(1);
    setSearch("");
    setSelectedCharacter(null);
    setSelectedEpisode(null);
    setSelectedLocation(null);
  };

  const getTraitLabel = (item: any) => {
    const raw = (item.slug || item.name || "").toLowerCase().trim();
    if (!raw) return "";

    // Try to find in i18n with variations
    const variatios = [raw, raw.replace(/ /g, "_"), raw.replace(/_/g, " ")];
    for (const v of variatios) {
      const trans = t(`traits_data.${v}`, { defaultValue: "__NONE__" });
      if (trans !== "__NONE__") return trans;
    }

    // Double-check manual mapping for PT if i18n is acting up
    if (i18n.language.startsWith('pt')) {
      const manual: any = {
        "panic": "Pânico",
        "under_pressure": "Sob Pressão",
        "under pressure": "Sob Pressão",
        "resilient": "Resiliente",
        "supportive": "Solidário",
        "fragile": "Frágil",
        "cowardly": "Covarde"
      };
      if (manual[raw]) return manual[raw];
      if (raw.includes('panic')) return "Pânico";
      if (raw.includes('pressure')) return "Sob Pressão";
    }

    return raw.replace(/_/g, " ");
  };

  const handleVote = async (id: string, type: 'like' | 'dislike', section?: string) => {
    const current = userVotes[id] ? { ...userVotes[id] } : { s: {} };
    if (!current.s) current.s = {};

    playSciFiSound(600, 0.1, 'sine');

    let netLikes = 0;
    let netDislikes = 0;

    const nextVotes = { ...userVotes };
    if (!nextVotes[id]) nextVotes[id] = { s: {} };

    if (section) {
      // SECTION VOTE LOGIC
      // 1. If there was a global vote, it must be cleared to allow granular feedback
      if (nextVotes[id].g) {
        if (nextVotes[id].g === 'like') netLikes--; else netDislikes--;
        delete nextVotes[id].g;
      }

      const existing = nextVotes[id].s[section];
      if (existing === type) {
        // Unvote section
        if (type === 'like') netLikes--; else netDislikes--;
        delete nextVotes[id].s[section];
      } else {
        // New vote or switch in section
        if (existing) {
          if (type === 'like') { netLikes++; netDislikes--; } else { netDislikes++; netLikes--; }
        } else {
          if (type === 'like') netLikes++; else netDislikes++;
        }
        nextVotes[id].s[section] = type;
      }
    } else {
      // GLOBAL VOTE LOGIC
      // 1. Clear all sectional votes first (global overrides granular)
      Object.keys(nextVotes[id].s).forEach(k => {
        if (nextVotes[id].s[k] === 'like') netLikes--; else netDislikes--;
      });
      nextVotes[id].s = {};

      const existing = nextVotes[id].g;
      if (existing === type) {
        // Unvote global
        if (type === 'like') netLikes--; else netDislikes--;
        delete nextVotes[id].g;
      } else {
        // New global vote or switch
        if (existing) {
          if (type === 'like') { netLikes++; netDislikes--; } else { netDislikes++; netLikes--; }
        } else {
          if (type === 'like') netLikes++; else netDislikes++;
        }
        nextVotes[id].g = type;
      }
    }

    // Apply net changes to state
    const updateFunc = (prev: any) => {
      if (!prev) return null;
      return { 
        ...prev, 
        likes: Math.max(0, (prev.likes || 0) + netLikes), 
        dislikes: Math.max(0, (prev.dislikes || 0) + netDislikes) 
      };
    };

    setCharacters(prev => prev.map(char => char.id === id ? updateFunc(char) : char));
    if (selectedCharacter && selectedCharacter.id === id) {
      setSelectedCharacter(prev => updateFunc(prev));
    }

    setUserVotes(nextVotes);
    localStorage.setItem('portal_user_votes_v2', JSON.stringify(nextVotes));

    try {
      await fetch(`${API_BASE}/v1/characters/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          likes: netLikes, 
          dislikes: netDislikes,
          sync: true 
        })
      });
    } catch (err) {
      console.error("Failed to sync vote overrides:", err);
    }
  };

  return (
    <div className="app-container">
      <AnimatePresence>
        {showSplash && (
          <motion.div 
            className="splash-portal"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 2, filter: 'blur(40px)' }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          >
            <div className="portal-ring">
              <div className="portal-core">
                <div className="portal-core-inner">
                  <div className="portal-data-stream">
                    {[...Array(24)].map((_, i) => (
                      <span key={i} className="binary-bit">{i % 3 === 0 ? '1' : '0'}</span>
                    ))}
                  </div>
                  <div className="blob"></div>
                  <div className="blob"></div>
                  <div className="blob"></div>
                  <div className="blob"></div>
                </div>
              </div>
            </div>
            <div className="splash-ii-badge">I<sup>I</sup></div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <header>
        <div className="controls-group">
          <button onClick={toggleSound} className="lang-btn" title={soundEnabled ? t('common.mute') : t('common.unmute')}>
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button onClick={toggleLanguage} className="lang-btn">
            <Languages size={18} />
            <span>{i18n.language.startsWith('pt') ? 'EN' : 'PT'}</span>
          </button>
        </div>
        <div className="header-glow"></div>
        <motion.h1 
          className="portal-title"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          RICK AND MORTY
        </motion.h1>
        <motion.div 
          className="fan-badge"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {t('header.badge')}
        </motion.div>
        
        <p className="subtitle">
          <Trans 
            i18nKey="header.subtitle"
            components={{ highlight: <span className="highlight" /> }}
          />
        </p>

        <div className="search-container">
          <div className="catalog-tabs">
            <button className={`catalog-tab ${catalogType === 'characters' ? 'active' : ''}`} onClick={() => switchCatalog('characters')}>
              <Database size={16} />
              <span>{t('catalog.characters')}</span>
            </button>
            <button className={`catalog-tab ${catalogType === 'episodes' ? 'active' : ''}`} onClick={() => switchCatalog('episodes')}>
              <Tv size={16} />
              <span>{t('catalog.episodes')}</span>
            </button>
            <button className={`catalog-tab ${catalogType === 'locations' ? 'active' : ''}`} onClick={() => switchCatalog('locations')}>
              <MapPinned size={16} />
              <span>{t('catalog.locations')}</span>
            </button>
          </div>
          <div className="search-input-wrapper">
             <Search className="search-icon" size={20} />
             <input 
              type="text" 
              className="portal-search-input" 
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
             />
             {search && (
               <button className="search-clear-btn" onClick={() => setSearch('')}>×</button>
             )}
          </div>
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <Zap className="animate-pulse" color="#97ce4c" size={48} />
          <p>{t('common.loading')}</p>
        </div>
      ) : catalogType === 'characters' && characters.length === 0 ? (
        <div className="empty-state-panel">
          <Info size={24} color="#00b5cc" />
          <p>{t('common.no_results')}</p>
        </div>
      ) : catalogType === 'episodes' && episodes.length === 0 ? (
        <div className="empty-state-panel">
          <Info size={24} color="#00b5cc" />
          <p>{t('common.no_results')}</p>
        </div>
      ) : catalogType === 'locations' && locations.length === 0 ? (
        <div className="empty-state-panel">
          <Info size={24} color="#00b5cc" />
          <p>{t('common.no_results')}</p>
        </div>
      ) : (
        <motion.div 
          className="character-grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <AnimatePresence>
            {catalogType === 'characters' ? characters.map((char, index) => (
              <motion.div 
                key={char.id}
                className="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                whileHover={{ 
                  y: -10,
                  scale: 1.02,
                  rotateX: 2,
                  rotateY: -2,
                  transition: { duration: 0.2 }
                }}
                style={{ perspective: 1000 }}
                onClick={() => {
                  playSciFiSound(800, 0.1, 'square'); // Scan Beep
                  fetchCharacterDetails(char);
                }}
              >
                <div className="card-image-container">
                  <img src={char.image} alt={char.name} className="card-image" />
                  <div className="card-overlay">
                    <div className="view-dossier">VIEW DOSSIER</div>
                  </div>
                </div>
                <div className="card-content">
                  <div className="character-species">{char.species} • {char.status}</div>
                  <h3 className="character-name">{char.name}</h3>
                  
                  <div className="stats-container">
                    <div className="vote-btns">
                      <button 
                        className="vote-btn like" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVote(char.id, 'like');
                        }}
                      >
                        <ThumbsUp size={16} />
                        <span className="stat-counter">{char.likes}</span>
                      </button>
                      <button 
                        className="vote-btn dislike"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVote(char.id, 'dislike');
                        }}
                      >
                        <ThumbsDown size={16} />
                        <span className="stat-counter">{char.dislikes}</span>
                      </button>
                    </div>
                    <div className="vote-btn" style={{ cursor: 'default', background: 'transparent' }}>
                      <Database size={16} color="#00b5cc" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )) : null}

            {catalogType === 'episodes' ? episodes.map((episode, index) => (
              <motion.div
                key={episode.id}
                className="card entity-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                whileHover={{
                  y: -10,
                  scale: 1.02,
                  rotateX: 2,
                  rotateY: -2,
                  transition: { duration: 0.2 }
                }}
                style={{ perspective: 1000 }}
                onClick={() => {
                  playSciFiSound(720, 0.08, 'square');
                  fetchEpisodeDetails(episode);
                }}
              >
                <div className="entity-visual episode-visual">
                  <span className="entity-kicker">{episode.code}</span>
                  <strong>{episode.name}</strong>
                </div>
                <div className="card-content">
                  <div className="character-species">{episode.airDate || t('catalog.unknown_air_date')}</div>
                  <h3 className="character-name">{episode.name}</h3>
                  <div className="stats-container">
                    <div className="entity-meta">
                      <Users size={16} />
                      <span>{episode.characterCount}</span>
                    </div>
                    <div className="vote-btn" style={{ cursor: 'default', background: 'transparent' }}>
                      <Tv size={16} color="#00b5cc" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )) : null}

            {catalogType === 'locations' ? locations.map((location, index) => (
              <motion.div
                key={location.id}
                className="card entity-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                whileHover={{
                  y: -10,
                  scale: 1.02,
                  rotateX: 2,
                  rotateY: -2,
                  transition: { duration: 0.2 }
                }}
                style={{ perspective: 1000 }}
                onClick={() => {
                  playSciFiSound(640, 0.08, 'triangle');
                  fetchLocationDetails(location);
                }}
              >
                <div className="entity-visual location-visual">
                  <span className="entity-kicker">{location.dimension || t('catalog.unknown_dimension')}</span>
                  <strong>{location.name}</strong>
                </div>
                <div className="card-content">
                  <div className="character-species">{location.type || t('catalog.unknown_type')}</div>
                  <h3 className="character-name">{location.name}</h3>
                  <div className="stats-container">
                    <div className="entity-meta">
                      <Users size={16} />
                      <span>{location.residentCount}</span>
                    </div>
                    <div className="vote-btn" style={{ cursor: 'default', background: 'transparent' }}>
                      <MapPinned size={16} color="#00b5cc" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )) : null}
          </AnimatePresence>
        </motion.div>
      )}

      {!loading && pagination.totalPages > 1 ? (
        <div className="pagination-bar">
          <button
            className="pagination-btn"
            disabled={page <= 1}
            onClick={() => void fetchCatalog(catalogType, page - 1, search)}
          >
            Previous
          </button>
          <div className="pagination-status">
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <small>{t(`catalog.total_${catalogType}`, { count: pagination.total })}</small>
          </div>
          <button
            className="pagination-btn"
            disabled={page >= pagination.totalPages}
            onClick={() => void fetchCatalog(catalogType, page + 1, search)}
          >
            Next
          </button>
        </div>
      ) : null}

      <AnimatePresence>
        {(selectedCharacter || selectedEpisode || selectedLocation) && (
          <div 
            className="modal-overlay" 
            style={{ display: 'flex' }} 
            onClick={() => {
              setSelectedCharacter(null);
              setSelectedEpisode(null);
              setSelectedLocation(null);
            }}
          >
            <div 
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <button className="modal-close" onClick={() => {
                setSelectedCharacter(null);
                setSelectedEpisode(null);
                setSelectedLocation(null);
              }}>
                <X size={24} />
              </button>

              <div className="modal-body">
                {detailLoading ? (
                  <div className="detail-loading-wrapper">
                    <Zap className="animate-pulse" color="#97ce4c" size={32} />
                    <span>{t('modal.synchronizing')}</span>
                  </div>
                ) : selectedCharacter ? (
                    (() => {
                      const descriptionSummary = selectedCharacter.aiProfile?.sections?.description?.narrative_summary;
                      const hasGeneratedDescription = Boolean(
                        typeof descriptionSummary === 'string'
                          ? descriptionSummary.trim()
                          : descriptionSummary?.pt?.trim() || descriptionSummary?.en?.trim()
                      );
                      const detailSlides = [
                        {
                          label: t('modal.origin'),
                          value: selectedCharacter.origin || t('modal.unknown')
                        },
                        {
                          label: t('modal.location'),
                          value: selectedCharacter.location || t('modal.unknown')
                        },
                        {
                          label: t('modal.first_seen_in'),
                          value:
                            selectedCharacter.firstSeenIn?.code || selectedCharacter.firstSeenIn?.name
                              ? [selectedCharacter.firstSeenIn?.code, selectedCharacter.firstSeenIn?.name].filter(Boolean).join(" • ")
                              : t('modal.unknown')
                        }
                      ];

                      return (
                        <>
                          {detailNotice ? <div className="detail-notice">{detailNotice}</div> : null}
                    <div className="modal-image-col">
                      <div className="sticky-col">
                        <div className="main-image-wrapper">
                          <img 
                            src={selectedCharacter.image} 
                            alt={selectedCharacter.name} 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Rick+and+Morty';
                            }}
                          />
                          <div className={`status-tag ${(selectedCharacter.status || 'unknown').toLowerCase()}`}>
                            {selectedCharacter.status || 'UNKNOWN'}
                          </div>
                        </div>

                        <div className="left-details-box">
                          <div className="detail-carousel">
                            <div className="detail-carousel-dots">
                              {detailSlides.map((slide, index) => (
                                <button
                                  key={`${slide.label}-${index}`}
                                  type="button"
                                  className={`detail-carousel-dot ${index === characterInfoSlide ? 'active' : ''}`}
                                  aria-label={slide.label}
                                  onClick={() => selectCharacterInfoSlide(index)}
                                />
                              ))}
                            </div>
                            <div className="detail-carousel-viewport">
                              <div className="detail-carousel-track" style={{ transform: `translateX(-${characterInfoSlide * 100}%)` }}>
                                {detailSlides.map((slide) => (
                                  <div key={slide.label} className="detail-carousel-slide">
                                    <div className="detail-item">
                                      <span className="label">{slide.label}</span>
                                      <span className="value">{slide.value}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className={`ii-context ai-log-section mini ${!hasGeneratedDescription ? 'public-context' : ''}`}>
                            <div className={`ai-log-header ${!hasGeneratedDescription ? 'public-log-header' : ''}`}>
                              {hasGeneratedDescription ? (
                                <>
                                  <Zap size={14} color="#97ce4c" />
                                  <span>{t('modal.ai_analysis')}</span>
                                  <span className="ii-badge" style={{ marginLeft: '10px' }}>I<sup>I</sup></span>
                                </>
                              ) : (
                                <>
                                  <Info size={14} color="#00b5cc" />
                                  <span>{t('modal.public_analysis')}</span>
                                </>
                              )}
                              <div className="mini-actions">
                                <ThumbsUp 
                                  size={12} 
                                  className={(userVotes[selectedCharacter.id]?.s['desc'] === 'like' || userVotes[selectedCharacter.id]?.g === 'like') ? 'voted active' : ''}
                                  onClick={() => handleVote(selectedCharacter!.id, 'like', 'desc')} 
                                />
                                <ThumbsDown 
                                  size={12} 
                                  className={(userVotes[selectedCharacter.id]?.s['desc'] === 'dislike' || userVotes[selectedCharacter.id]?.g === 'dislike') ? 'voted active' : ''}
                                  onClick={() => handleVote(selectedCharacter!.id, 'dislike', 'desc')} 
                                />
                              </div>
                            </div>
                            <p className={`ai-log-text ${!hasGeneratedDescription ? 'public-log-text' : ''}`}>
                              {hasGeneratedDescription
                                ? selectedCharacter.narrative_summary
                                : t('modal.empty_description')}
                            </p>
                          </div>

                          <div className="episodes-section mini">
                            <h4 className="section-title mini">
                              {t('modal.monitoring')}
                              <span className="count-badge">({selectedCharacter.episodes?.length || 0})</span>
                            </h4>
                            <div className="episodes-log">
                              {selectedCharacter.episodes && selectedCharacter.episodes.length > 0 ? (
                                selectedCharacter.episodes.map((ep: any, i: number) => (
                                  <div key={i} className="episode-row">
                                    <span className="ep-code">{ep.code || `EP-${i+1}`}</span>
                                    <span className="ep-name">{ep.name}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="no-data">{t('modal.no_records')}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="modal-info-col">
                      <h2 className="modal-title-text">{selectedCharacter.name || 'Nome Indisponível'}</h2>
                      <div className="modal-badges">
                        <span className="modal-badge">{selectedCharacter.species || 'Unknown'}</span>
                        <span className="modal-badge">{selectedCharacter.gender || 'Unknown'}</span>
                      </div>

                      <div className={`ii-context stats-container ${!selectedCharacter.attributes ? 'public-context' : ''}`}>
                        <h4 className={`section-title ii-title ${!selectedCharacter.attributes ? 'public-title' : ''}`}>
                          {selectedCharacter.attributes ? <span className="ii-badge">I<sup>I</sup></span> : <Info size={14} color="#00b5cc" />} 
                          {t('modal.capacity_analysis')}
                          <div className="mini-actions">
                            <ThumbsUp 
                              size={12} 
                              className={(userVotes[selectedCharacter.id]?.s['stats'] === 'like' || userVotes[selectedCharacter.id]?.g === 'like') ? 'voted active' : ''}
                              onClick={() => handleVote(selectedCharacter!.id, 'like', 'stats')} 
                            />
                            <ThumbsDown 
                              size={12} 
                              className={(userVotes[selectedCharacter.id]?.s['stats'] === 'dislike' || userVotes[selectedCharacter.id]?.g === 'dislike') ? 'voted active' : ''}
                              onClick={() => handleVote(selectedCharacter!.id, 'dislike', 'stats')} 
                            />
                          </div>
                        </h4>
                        {selectedCharacter.attributes ? (
                          <div className="stats-grid">
                            {[
                              { label: t('attributes.genialidade'), val: selectedCharacter.attributes.genialidade ?? 0, color: '#97ce4c', desc: t('attributes.gen_desc') },
                              { label: t('attributes.sobrevivencia'), val: selectedCharacter.attributes.sobrevivencia ?? 0, color: '#97ce4c', desc: t('attributes.surv_desc') },
                              { label: t('attributes.caos'), val: selectedCharacter.attributes.caos ?? 0, color: '#97ce4c', desc: t('attributes.chaos_desc') },
                              { label: t('attributes.instabilidade'), val: selectedCharacter.attributes.instabilidade ?? 0, color: '#97ce4c', desc: t('attributes.inst_desc') },
                              { label: t('attributes.influencia'), val: selectedCharacter.attributes.influencia ?? 0, color: '#97ce4c', desc: t('attributes.infl_desc') },
                              { label: t('attributes.vitalidade'), val: selectedCharacter.attributes.vitalidade ?? 0, color: '#97ce4c', desc: t('attributes.vit_desc') }
                            ].map(stat => (
                              <div className="stat-bar-item tooltip-trigger" key={stat.label} data-tooltip={stat.desc}>
                                <div className="stat-label-row">
                                  <span>{stat.label}</span>
                                  <span>{stat.val}</span>
                                </div>
                                <div className="stat-bar-bg">
                                  <div className="stat-bar-fill ii-fill" style={{ width: `${stat.val}%` }}></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="analysis-placeholder">{t('modal.empty_capacity')}</p>
                        )}
                      </div>

                      <div className={`ii-context chips-grid ${!(selectedCharacter.abilities?.length || selectedCharacter.traits?.length || selectedCharacter.weaknesses?.length) ? 'public-context' : ''}`}>
                        <h4 className={`section-title ii-title ${!(selectedCharacter.abilities?.length || selectedCharacter.traits?.length || selectedCharacter.weaknesses?.length) ? 'public-title' : ''}`}>
                          {(selectedCharacter.abilities?.length || selectedCharacter.traits?.length || selectedCharacter.weaknesses?.length)
                            ? <span className="ii-badge">I<sup>I</sup></span>
                            : <Info size={14} color="#00b5cc" />} 
                          {t('modal.field_analysis')}
                          <div className="mini-actions">
                            <ThumbsUp 
                              size={12} 
                              className={(userVotes[selectedCharacter.id]?.s['chips'] === 'like' || userVotes[selectedCharacter.id]?.g === 'like') ? 'voted active' : ''}
                              onClick={() => handleVote(selectedCharacter!.id, 'like', 'chips')} 
                            />
                            <ThumbsDown 
                              size={12} 
                              className={(userVotes[selectedCharacter.id]?.s['chips'] === 'dislike' || userVotes[selectedCharacter.id]?.g === 'dislike') ? 'voted active' : ''}
                              onClick={() => handleVote(selectedCharacter!.id, 'dislike', 'chips')} 
                            />
                          </div>
                        </h4>
                        {(selectedCharacter.abilities && selectedCharacter.abilities.length > 0) ||
                        (selectedCharacter.traits && selectedCharacter.traits.length > 0) ||
                        (selectedCharacter.weaknesses && selectedCharacter.weaknesses.length > 0) ? (
                        <div className="chips-row">
                          {selectedCharacter.abilities && selectedCharacter.abilities.length > 0 && (
                            <div className="chips-column">
                              <span className="mini-label">{t('modal.abilities')}</span>
                              <div className="ability-chips">
                                {selectedCharacter.abilities.map((a: any, i: number) => (
                                  <span key={i} className="ability-chip tooltip-trigger" data-tooltip={a.reason}>
                                      {getTraitLabel(a)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedCharacter.traits && selectedCharacter.traits.length > 0 && (
                            <div className="chips-column">
                              <span className="mini-label">{t('modal.traits')}</span>
                              <div className="ability-chips traits">
                                {selectedCharacter.traits.map((t_item: any, i: number) => (
                                  <span key={i} className="ability-chip trait tooltip-trigger" data-tooltip={t_item.reason}>
                                    {getTraitLabel(t_item)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedCharacter.weaknesses && selectedCharacter.weaknesses.length > 0 && (
                            <div className="chips-column">
                              <span className="mini-label">{t('modal.weaknesses')}</span>
                              <div className="ability-chips weaknesses">
                                {selectedCharacter.weaknesses.map((w: any, i: number) => (
                                  <span key={i} className="ability-chip weakness tooltip-trigger" data-tooltip={w.reason}>
                                    {getTraitLabel(w)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        ) : (
                          <p className="analysis-placeholder">{t('modal.empty_field')}</p>
                        )}
                      </div>

                      <div className="modal-actions-inline">
                        <button 
                          className={`modal-btn like ${userVotes[selectedCharacter.id]?.g === 'like' ? 'voted active' : ''}`} 
                          onClick={() => handleVote(selectedCharacter!.id, 'like')}
                          disabled={userVotes[selectedCharacter.id]?.g === 'dislike' || Object.keys(userVotes[selectedCharacter.id]?.s || {}).length >= 3}
                        >
                          <ThumbsUp size={18} />
                          <span>{t('modal.like_btn')}</span>
                        </button>
                        <button 
                          className={`modal-btn dislike ${userVotes[selectedCharacter.id]?.g === 'dislike' ? 'voted active' : ''}`} 
                          onClick={() => handleVote(selectedCharacter!.id, 'dislike')}
                          disabled={userVotes[selectedCharacter.id]?.g === 'like' || Object.keys(userVotes[selectedCharacter.id]?.s || {}).length >= 3}
                        >
                          <ThumbsDown size={18} />
                          <span>{t('modal.dislike_btn')}</span>
                        </button>
                      </div>
                    </div>
                  </>
                      );
                    })()
                ) : selectedEpisode ? (
                  <div className="entity-modal-grid">
                    {detailNotice ? <div className="detail-notice">{detailNotice}</div> : null}
                    <div className="entity-modal-hero episode-visual">
                      <span className="entity-kicker">{selectedEpisode.code}</span>
                      <h2 className="modal-title-text">{selectedEpisode.name}</h2>
                    </div>
                    <div className="entity-modal-details">
                      <div className="modal-details-grid">
                        <div className="detail-item">
                          <span className="label">{t('modal.air_date')}</span>
                          <span className="value">{selectedEpisode.airDate || t('catalog.unknown_air_date')}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">{t('modal.characters_count')}</span>
                          <span className="value">{selectedEpisode.characterCount}</span>
                        </div>
                      </div>
                      <div className="ii-context public-context">
                        <h4 className="section-title ii-title public-title">
                          <Info size={14} color="#00b5cc" />
                          {t('modal.episode_overview')}
                        </h4>
                        <p className="analysis-placeholder">
                          {t('modal.episode_placeholder', {
                            code: selectedEpisode.code,
                            airDate: selectedEpisode.airDate || t('catalog.unknown_air_date'),
                            characterCount: selectedEpisode.characterCount
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : selectedLocation ? (
                  <div className="entity-modal-grid">
                    {detailNotice ? <div className="detail-notice">{detailNotice}</div> : null}
                    <div className="entity-modal-hero location-visual">
                      <span className="entity-kicker">{selectedLocation.dimension || t('catalog.unknown_dimension')}</span>
                      <h2 className="modal-title-text">{selectedLocation.name}</h2>
                    </div>
                    <div className="entity-modal-details">
                      <div className="modal-details-grid">
                        <div className="detail-item">
                          <span className="label">{t('modal.location_type')}</span>
                          <span className="value">{selectedLocation.type || t('catalog.unknown_type')}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">{t('modal.residents_count')}</span>
                          <span className="value">{selectedLocation.residentCount}</span>
                        </div>
                      </div>
                      <div className="ii-context public-context">
                        <h4 className="section-title ii-title public-title">
                          <Info size={14} color="#00b5cc" />
                          {t('modal.location_overview')}
                        </h4>
                        <p className="analysis-placeholder">
                          {t('modal.location_placeholder', {
                            type: selectedLocation.type || t('catalog.unknown_type'),
                            dimension: selectedLocation.dimension || t('catalog.unknown_dimension'),
                            residentCount: selectedLocation.residentCount
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <footer style={{ marginTop: '5rem', textAlign: 'center', paddingBottom: '3rem', color: '#666', fontSize: '0.8rem' }}>
        <p>{t('footer.hosted')}</p>
      </footer>
    </div>
  );
};

export default App;
