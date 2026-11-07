import * as React from "react";
import { useNavigate } from "react-router";

import { AdminControls, AdminToasts } from "~/components/admin-room";
import { AnswerTimerControl } from "~/components/answer-timer-settings";
import BoardComponent from "~/components/board";
import Connection from "~/components/connection";
import GameClock from "~/components/game-clock";
import { HostBadge } from "~/components/host/host-badge";
import { HostPrompt } from "~/components/host/host-prompt";
import Link from "~/components/link";
import { PauseControl, PausedOverlay } from "~/components/pause";
import { PlayerScores } from "~/components/player";
import Preview from "~/components/preview";
import Prompt from "~/components/prompt";
import { Soundboard } from "~/components/soundboard";
import { StandingsButton } from "~/components/standings/standings";
import { UndoArmingContext, UndoArmingProvider } from "~/components/undo-check";
import { SpectatorBar, WatcherCount } from "~/components/watch/spectator-bar";
import { SpectatorPrompt } from "~/components/watch/viewer-prompt";
import { GameState, Player, useEngineContext } from "~/engine";
import { useTranslation } from "~/i18n";
import type { Game } from "~/models/convert.server";
import type { PlayerColor } from "~/models/player-color";
import useGameSound from "~/utils/use-sound";

const BOARD_FILL_SFX = "/sounds/board-fill.mp3";
const FINAL_CATEGORY_REVEAL_SFX = "/sounds/final-category-reveal.mp3";

export interface RoomProps {
  roomId: number;
  userId: string;
}

function CallToAction({
  type,
  isSingleLongFormClue,
  boardController,
  roomName,
  userId,
}: {
  type: GameState;
  isSingleLongFormClue: boolean;
  boardController?: Player;
  roomName: string;
  userId: string;
}) {
  const { t } = useTranslation();
  if (type === GameState.GameOver) {
    return (
      <>
        <h2 className="text-xl font-semibold">{t("room.gameOver")}</h2>
        <Link to={`/room/${roomName}/summary`}>
          {t("room.reviewGame")} &rarr;
        </Link>
      </>
    );
  }
  if (isSingleLongFormClue) {
    return <div className="text-slate-300 italic">{t("room.goToFinal")}</div>;
  }
  if (boardController) {
    if (boardController.userId === userId) {
      return <strong className="text-center">{t("room.youControl")}</strong>;
    }
    return (
      <strong className="text-center">
        {t("room.hasControl", { name: boardController.name })}
      </strong>
    );
  }
  return null;
}

/** GameComponent maintains the game state. */
/** GameOverSummaryRedirect navigates to the summary once the game is over —
 * unless this client's undo confirmation is armed. The correction record
 * survives game over, so the player can finish their correction before
 * reviewing the summary. Must render inside UndoArmingProvider.
 */
function GameOverSummaryRedirect({ roomName }: { roomName: string }) {
  const { type } = useEngineContext();
  const navigate = useNavigate();
  const { armed } = React.useContext(UndoArmingContext);
  React.useEffect(() => {
    if (type === GameState.GameOver && !armed) {
      navigate(`/room/${roomName}/summary`);
    }
  }, [navigate, roomName, type, armed]);
  return null;
}

export default function GameComponent({
  game,
  isAdmin = false,
  name,
  playerColor,
  roomId,
  roomName,
  suppressDialogs = false,
  userId,
  url,
  watching = false,
  onWatchingChange,
}: {
  game: Game;
  /** The visitor is logged in as the site admin: they may change the room
   * settings (answer timer) and use the admin controls (skip a question, do
   * a stuck player's step, change scores), even without playing. */
  isAdmin?: boolean;
  name: string;
  playerColor?: PlayerColor;
  roomName: string;
  suppressDialogs?: boolean;
  url: string;
  /** The visitor chose "Just watch" instead of joining. */
  watching?: boolean;
  /** Offers "Just watch" in the join dialog (rooms, not solo play). */
  onWatchingChange?: (watching: boolean) => void;
} & RoomProps) {
  const {
    boardControl,
    connectionState,
    host,
    lastMessageAt,
    players,
    reconnect,
    round,
    soundboard,
    type,
    watchers,
  } = useEngineContext();

  // Everyone who is not in the game (still deciding in the join dialog, or
  // watching) sees the room read-only: no control on the page sends anything.
  const isPlayer = players.has(userId);
  // The host (feature 22) doesn't play but runs the game: they see the
  // answers, judge, start rounds and move on.
  const isHost = host !== null && host.userId === userId;
  const runsGame = isPlayer || isHost;

  const [playBoardFillSfx] = useGameSound(BOARD_FILL_SFX);
  const [playFinalSfx] = useGameSound(FINAL_CATEGORY_REVEAL_SFX);

  const boardController = boardControl ? players.get(boardControl) : undefined;

  const board = game.boards[round];
  const isSingleLongFormClue =
    board.categories.length === 1 &&
    board.categories[0].clues.length === 1 &&
    Boolean(board.categories[0].clues[0].longForm);

  return (
    <UndoArmingProvider userId={userId}>
      <GameOverSummaryRedirect roomName={roomName} />
      <Preview
        disabled={suppressDialogs}
        gameTitle={game.title}
        isAdmin={isAdmin}
        name={name}
        numRounds={game.boards.length}
        onDismiss={isSingleLongFormClue ? playFinalSfx : playBoardFillSfx}
        onWatch={onWatchingChange ? () => onWatchingChange(true) : undefined}
        playerColor={playerColor}
        url={url}
        roomId={roomId}
        userId={userId}
        watching={watching}
      />
      <div className="flex grow flex-col bg-blue-1000">
        <BoardComponent roomId={roomId} userId={userId} readOnly={!runsGame} />
        <div
          className={`mx-auto flex w-full max-w-screen-lg flex-col gap-4 p-3 text-slate-100 sm:p-6 md:p-12`}
        >
          <div className="flex flex-wrap items-center justify-between gap-y-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <CallToAction
                boardController={boardController}
                type={type}
                isSingleLongFormClue={isSingleLongFormClue}
                roomName={roomName}
                userId={userId}
              />
              <HostBadge roomId={roomId} userId={userId} />
            </div>
            <div className="flex items-center gap-1">
              <WatcherCount
                count={watchers}
                className="px-2 text-sm whitespace-nowrap text-slate-300"
              />
              <StandingsButton userId={userId} />
              {runsGame || isAdmin ? (
                <AnswerTimerControl
                  roomId={roomId}
                  userId={userId}
                  isAdmin={isAdmin}
                  isHost={isHost}
                />
              ) : null}
              {runsGame ? <PauseControl roomId={roomId} /> : null}
              <GameClock roomId={roomId} readOnly={!runsGame} />
            </div>
          </div>
          <PlayerScores roomId={roomId} userId={userId} isAdmin={isAdmin} />
          <Connection
            state={connectionState}
            lastMessageAt={lastMessageAt}
            reconnect={reconnect}
          />
        </div>
        {isPlayer ? (
          <Prompt roomId={roomId} userId={userId} />
        ) : isHost ? (
          <HostPrompt roomId={roomId} userId={userId} />
        ) : (
          <SpectatorPrompt />
        )}
        {isPlayer && soundboard.available ? (
          // Room for the floating soundboard button below the page content.
          <div className="h-16 shrink-0" aria-hidden />
        ) : null}
      </div>
      <PausedOverlay roomId={roomId} canResume={runsGame} />
      <Soundboard userId={userId} />
      {/* Solo play (room -1) has no admin. */}
      {(isAdmin || isHost) && roomId !== -1 ? (
        <AdminControls
          roomId={roomId}
          // The site admin's controls are a superset of the host's.
          actor={isAdmin ? "admin" : "host"}
          userId={userId}
          name={name}
          raised={!runsGame && watching && Boolean(onWatchingChange)}
        />
      ) : null}
      <AdminToasts />
      {!runsGame && watching && onWatchingChange ? (
        <>
          {/* Room for the floating bar below the page content. */}
          <div className="h-16" aria-hidden />
          <SpectatorBar
            onJoin={() => onWatchingChange(false)}
            watchers={watchers}
          />
        </>
      ) : null}
    </UndoArmingProvider>
  );
}
