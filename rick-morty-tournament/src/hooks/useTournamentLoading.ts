import { useCallback, useEffect, useState } from "react";

function wait(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

interface LoadingCharacter {
  id: number;
  name: string;
  image: string;
  species: string;
}

export function useTournamentLoading(
  screen: string,
  loadingLines: string[],
) {
  const [loadingRoster, setLoadingRoster] = useState<Array<LoadingCharacter | null>>([]);
  const [loadingLineIndex, setLoadingLineIndex] = useState(0);
  const [loadingReady, setLoadingReady] = useState(false);
  const [loadingCharacters, setLoadingCharacters] = useState<LoadingCharacter[]>([]);

  const resetLoadingState = useCallback(() => {
    setLoadingRoster(Array.from({ length: 8 }, () => null));
    setLoadingLineIndex(0);
    setLoadingReady(false);
  }, []);

  const startLoadingSequence = useCallback((characters: LoadingCharacter[]) => {
    resetLoadingState();
    setLoadingCharacters(characters);
  }, [resetLoadingState]);

  useEffect(() => {
    if (screen !== "loading-tournament") {
      setLoadingLineIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setLoadingLineIndex(prev => (prev + 1) % loadingLines.length);
    }, 1700);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadingLines.length, screen]);

  useEffect(() => {
    if (screen !== "loading-tournament" || loadingCharacters.length === 0) {
      return;
    }

    let cancelled = false;

    const runLoadingSequence = async () => {
      resetLoadingState();

      for (const [index, character] of loadingCharacters.slice(0, 8).entries()) {
        await wait(180);
        if (cancelled) {
          return;
        }

        setLoadingRoster(prev => prev.map((item, itemIndex) => (
          itemIndex === index ? character : item
        )));
      }

      await wait(220);
      if (!cancelled) {
        setLoadingReady(true);
      }
    };

    void runLoadingSequence();

    return () => {
      cancelled = true;
    };
  }, [loadingCharacters, resetLoadingState, screen]);

  return {
    currentLoadingLine: loadingLines[loadingLineIndex],
    loadingReady,
    loadingRoster,
    resetLoadingState,
    startLoadingSequence,
  };
}
