import { HomeMenuButton } from "./HomeMenuButton";

interface LoadingCharacter {
  id: number;
  name: string;
  image: string;
  species: string;
}

interface TournamentLoadingScreenProps {
  loadingLine: string;
  loadingReady: boolean;
  loadingRoster: Array<LoadingCharacter | null>;
  loadedCount: number;
  totalCount: number;
  onContinue: () => void;
}

export function TournamentLoadingScreen({
  loadingLine,
  loadingReady,
  loadingRoster,
  loadedCount,
  totalCount,
  onContinue,
}: TournamentLoadingScreenProps) {
  return (
    <div className="screen tournament-loading-screen">
      <div className="tournament-loading-bg" />
      <div className="tournament-loading-portal" />
      <div className="tournament-loading-header">
        <img
          className="loading-corner-logo"
          src="/Rick and Morty logo sticker design.png"
          alt="Rick & Morty"
        />

        <div className="tournament-loading-copy">
          <div className="tournament-loading-eyebrow">Treta Multiversal em Curso</div>
          <h2>Convocando os integrantes da bagunca interdimensional</h2>
          <div className="tournament-loading-progress">
            <span className="loading-progress-pill">
              {loadedCount}/{totalCount} competidores materializados
            </span>
          </div>
          {!loadingReady && <p>{loadingLine}</p>}
        </div>
      </div>

      <div className="tournament-loading-stage">
        <div className="transport-grid">
          {loadingRoster.map((character, index) => (
            <div
              key={character ? character.id : `placeholder-${index}`}
              className={`transport-card ${character ? "is-arriving" : "is-placeholder"}`}
              style={{ animationDelay: `${index * 0.12}s` }}
            >
              <div className="transport-card-frame">
                {character ? (
                  <>
                    <img src={character.image} alt={character.name} />
                    <div className="transport-card-meta">
                      <span>{character.name}</span>
                      <small>{character.species}</small>
                    </div>
                  </>
                ) : (
                  <div className="transport-card-placeholder">
                    <div className="placeholder-portal" />
                    <span>Materializando...</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className={`loading-actions ${loadingReady ? "is-visible" : ""}`}>
          <div className="loading-actions-copy">
            {loadingReady
              ? "Roster fechado. O caos pode comecar."
              : "Sincronizando o portal e posicionando os ultimos combatentes..."}
          </div>
          <HomeMenuButton
            variant="portal"
            onClick={onContinue}
            disabled={!loadingReady}
          >
            Continuar
          </HomeMenuButton>
        </div>
      </div>
    </div>
  );
}
