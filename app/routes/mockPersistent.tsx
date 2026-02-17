import * as React from "react";
import { useMatches } from "react-router";

import GameComponent from "~/components/game";
import ResumePrompt from "~/components/resume-prompt";
import {
  ActionType,
  GameEngineContext,
  GameState,
  useSoloGameEngine,
} from "~/engine";
import { getMockGame } from "~/models/mock.server";
import { BASE_URL } from "~/utils";
import {
  deleteSavedSoloState,
  deserializeState,
  getSavedSoloState,
} from "~/utils/offline-storage";

import type { Route } from "./+types/mockPersistent";

export const meta: Route.MetaFunction = ({ data }) => {
  try {
    return [{ title: data?.game.title }];
  } catch {
    return [];
  }
};

export async function loader() {
  const game = await getMockGame();

  return { game, BASE_URL };
}

export default function PlayGame({ loaderData }: Route.ComponentProps) {
  const matches = useMatches();
  const pathname = matches[matches.length - 1].pathname;

  const persistenceConfig = React.useMemo(
    () => ({ gameId: "mock", userId: "mock", name: "mock" }),
    [],
  );
  const gameReducer = useSoloGameEngine(loaderData.game, persistenceConfig);

  // Resume / New Game prompt
  const [showResume, setShowResume] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    getSavedSoloState("mock")
      .then((saved) => {
        setShowResume(saved != null);
      })
      .catch(() => setShowResume(false));
  }, []);

  function handleResume() {
    getSavedSoloState("mock")
      .then((saved) => {
        if (saved) {
          const restored = deserializeState(saved.state, loaderData.game);
          gameReducer.soloDispatch?.({
            type: ActionType.Restore,
            payload: restored,
            ts: Date.now(),
          });
        }
        setShowResume(false);
      })
      .catch(() => setShowResume(false));
  }

  function handleNewGame() {
    deleteSavedSoloState("mock").catch(() => {});
    setShowResume(false);
  }

  // Clear saved state on game over
  React.useEffect(() => {
    if (gameReducer.type === GameState.GameOver) {
      deleteSavedSoloState("mock").catch(() => {});
    }
  }, [gameReducer.type]);

  // Wait for resume check to complete
  if (showResume === null) {
    return <div className="flex-grow bg-blue-1000" />;
  }
  const resumeGateActive = showResume === true;

  return (
    <GameEngineContext.Provider value={gameReducer}>
      <GameComponent
        game={loaderData.game}
        roomId={-1}
        roomName="-1-mock"
        suppressDialogs={resumeGateActive}
        userId="mock"
        name="mock"
        url={loaderData.BASE_URL + pathname}
      />
      {resumeGateActive ? (
        <ResumePrompt onResume={handleResume} onNewGame={handleNewGame} />
      ) : null}
    </GameEngineContext.Provider>
  );
}
