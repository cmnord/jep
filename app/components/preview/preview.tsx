import * as React from "react";
import { Form as fetcherForm, useFetcher } from "react-router";

import {
  AnswerTimerSettings,
  type SettingsAccessProps,
} from "~/components/answer-timer-settings";
import Button from "~/components/button";
import CopyLinkButton from "~/components/copy-link-button";
import Dialog from "~/components/dialog";
import type { RoomProps } from "~/components/game";
import HowToPlay from "~/components/how-to-play";
import Link from "~/components/link";
import { EditPlayerForm, PlayerIcon } from "~/components/player";
import { AvatarPicker } from "~/components/player/avatar-picker";
import SoundControl from "~/components/sound";
import { TeamPicker } from "~/components/team/team";
import {
  UndoArmingContext,
  UndoCheckButton,
  UndoCheckConfirm,
} from "~/components/undo-check";
import WagerHintsControl from "~/components/wager-hints-control";
import type { Player } from "~/engine";
import { Action, GameState, useEngineContext } from "~/engine";
import { useTranslation } from "~/i18n";
import { Board } from "~/models/convert.server";
import type { PlayerColor } from "~/models/player-color";
import type { TeamId } from "~/models/team";
import { getPlayerColor } from "~/utils";
import { useJoinAvatar } from "~/utils/avatar-storage";
import useSoloAction from "~/utils/use-solo-action";

export function JoinGameDialog({
  Form,
  gameTitle,
  name,
  onWatch,
  playerColor,
  players,
  roomId,
  type,
  userId,
  watching = false,
}: {
  Form: typeof fetcherForm;
  gameTitle: string;
  name: string;
  /** When set, a "Just watch" button closes the dialog without joining. */
  onWatch?: () => void;
  playerColor?: PlayerColor;
  players: Map<string, Player>;
  type: GameState;
  /** The visitor chose to watch: the dialog stays closed. */
  watching?: boolean;
} & RoomProps) {
  const { t } = useTranslation();
  const [avatar, setAvatar] = useJoinAvatar();
  const { teamNames, host, activeClue } = useEngineContext();
  // Host mode (feature 22): a visitor may take the free host seat instead of
  // playing (rooms only; the seat changes between questions).
  const canClaimHost = onWatch !== undefined && !host && activeClue === null;
  const [team, setTeam] = React.useState<TeamId | null>(null);
  return (
    <Dialog
      isOpen={type !== GameState.GameOver && !watching}
      title={t("room.joinGameTitle", { title: gameTitle })}
      description={t("room.playersSoFar", { count: players.size })}
    >
      {players.size > 0 ? (
        <ul className="mb-4 grid grid-cols-3 gap-3 font-handwriting text-lg font-bold sm:grid-cols-4">
          {Array.from(players.values()).map((p, i) => (
            <li
              key={i}
              className="flex min-w-0 flex-col items-center gap-1"
              style={{ color: getPlayerColor(p) }}
            >
              <PlayerIcon player={p} size="tile" />
              <span className="w-full truncate text-center">{p.name}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <PlayerIcon
            player={{ name, userId, color: playerColor, avatar }}
            size="tile"
          />
          <p className="text-slate-300">{t("room.pickAvatarOptional")}</p>
        </div>
        <AvatarPicker value={avatar} onChange={setAvatar} />
      </div>
      {host ? (
        <p className="mb-4 text-slate-300" data-testid="join-host-info">
          <span aria-hidden>🎤 </span>
          {t("host.seatTaken", { name: host.name })}
        </p>
      ) : null}
      <div className="mb-4 flex flex-col gap-2">
        <p className="text-slate-300">{t("team.pickOptional")}</p>
        <TeamPicker
          value={team}
          onChange={setTeam}
          players={players}
          teamNames={teamNames}
        />
      </div>
      {canClaimHost ? (
        <p className="mb-2 text-sm text-slate-300">{t("host.claimHelp")}</p>
      ) : null}
      <Dialog.Footer>
        {onWatch ? (
          // Watching sends nothing: the visitor only reads the room.
          <Button type="button" onClick={onWatch}>
            {t("watch.justWatch")}
          </Button>
        ) : null}
        {canClaimHost ? (
          <Form method="POST" action={`/room/${roomId}/host`}>
            <input type="hidden" name="intent" value="claim" />
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="name" value={name} />
            {avatar ? (
              <input type="hidden" name="avatar" value={avatar} />
            ) : null}
            <Button type="submit">
              <span aria-hidden>🎤</span> {t("host.claim")}
            </Button>
          </Form>
        ) : null}
        <Form method="POST" action={`/room/${roomId}/player`}>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="name" value={name} />
          {playerColor != null && (
            <input type="hidden" name="color" value={playerColor} />
          )}
          {avatar ? <input type="hidden" name="avatar" value={avatar} /> : null}
          {team ? <input type="hidden" name="team" value={team} /> : null}
          <Button variant="primary" type="submit">
            {t("room.joinGame")}
          </Button>
        </Form>
      </Dialog.Footer>
    </Dialog>
  );
}

function PreviewRoundDialog({
  board,
  boardControl,
  Form,
  numRounds,
  onDismiss,
  players,
  round,
  type,
  url,
  roomId,
  userId,
  isAdmin = false,
  isHost = false,
}: {
  board: Board;
  boardControl: string | null;
  Form: typeof fetcherForm;
  numRounds: number;
  onDismiss: () => void;
  players: Map<string, Player>;
  round: number;
  type: GameState;
  url: string;
} & RoomProps &
  SettingsAccessProps) {
  const { t, rich } = useTranslation();
  const isOpen = type === GameState.PreviewRound;

  // The dialog is modal, so a correction still pending from the last clue
  // of the previous round must be reachable from inside it. In host mode
  // (feature 22) the verdicts are the host's: players have nothing to undo.
  const { getCheckCorrection, host } = useEngineContext();
  const hostMode = host !== null;
  const correction = hostMode ? undefined : getCheckCorrection(userId);
  const { armed, setArmed } = React.useContext(UndoArmingContext);

  const boardController = boardControl ? players.get(boardControl) : undefined;
  const boardControlName = boardController
    ? boardController.name
    : t("room.unknownPlayer");

  if (!board) return null;

  const isSingleLongFormClue =
    board.categories.length === 1 &&
    board.categories[0].clues.length === 1 &&
    board.categories[0].clues[0].longForm;

  const borderColor = boardController
    ? getPlayerColor(boardController)
    : "gray";

  return (
    <Dialog
      isOpen={isOpen}
      title={
        <div className="flex justify-between">
          <span>
            {t("room.startRoundOf", { round: round + 1, total: numRounds })}
          </span>
          <SoundControl showLabel={false} showSlider={false} />
        </div>
      }
      description={
        isSingleLongFormClue ? null : (
          <>
            {rich("room.startsWithControl", {
              name: (
                <span
                  className="border-b-4 font-handwriting text-xl font-bold"
                  style={{ borderColor }}
                >
                  {boardControlName}
                </span>
              ),
            })}
          </>
        )
      }
    >
      {hostMode ? (
        <p className="mb-2 text-slate-300" data-testid="preview-host">
          <span aria-hidden>🎤 </span>
          {isHost
            ? t("host.startRoundHelp")
            : t("host.badge", { name: host.name })}
        </p>
      ) : null}
      {round === 0 ? (
        <div className="flex flex-col gap-2">
          {isHost ? null : (
            <EditPlayerForm roomId={roomId} userId={userId} winning={false} />
          )}
          <div className="flex flex-wrap gap-2">
            {Array.from(players.values()).map((p, i) => (
              <PlayerIcon key={i} player={p} size="lg" />
            ))}
          </div>
          <WagerHintsControl theme="dark" />
          <HowToPlay />
          <div className="mb-2">
            <Link variant="inverse" to="/howto">
              {t("room.practiceBuzzing")} &rarr;
            </Link>
          </div>
        </div>
      ) : null}
      <div className="mb-4">
        <AnswerTimerSettings
          roomId={roomId}
          userId={userId}
          isAdmin={isAdmin}
          isHost={isHost}
        />
      </div>
      {correction ? (
        <div className="mb-2 flex justify-center">
          {armed ? (
            <UndoCheckConfirm
              roomId={roomId}
              userId={userId}
              prompt={t("room.undoLastCheck")}
              onCancel={() => setArmed(false)}
            />
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-300">{t("room.fixLastClue")}</p>
              <UndoCheckButton onClick={() => setArmed(true)} />
            </div>
          )}
        </div>
      ) : null}
      <Dialog.Footer>
        <CopyLinkButton url={url} text={t("header.copyRoomLink")} />
        {hostMode && !isHost ? (
          <p className="self-center text-sm text-slate-300">
            {t("host.player.hostStarts")}
          </p>
        ) : null}
        {(hostMode && isHost) ||
        (!hostMode && (boardControl === userId || isSingleLongFormClue)) ? (
          <Form method="POST" action={`/room/${roomId}/start`}>
            <input type="hidden" name="round" value={round} />
            <input type="hidden" name="userId" value={userId} />
            <Button variant="primary" type="submit" onClick={onDismiss}>
              {t("room.startRound")}
            </Button>
          </Form>
        ) : null}
      </Dialog.Footer>
    </Dialog>
  );
}

export function Preview({
  disabled = false,
  gameTitle,
  isAdmin = false,
  name,
  numRounds,
  onDismiss,
  onWatch,
  playerColor,
  url,
  roomId,
  userId,
  watching = false,
}: {
  disabled?: boolean;
  gameTitle: string;
  name: string;
  numRounds: number;
  onDismiss: () => void;
  /** Offer "Just watch" in the join dialog (rooms, not solo play). */
  onWatch?: () => void;
  playerColor?: PlayerColor;
  url: string;
  /** The visitor chose to watch instead of joining. */
  watching?: boolean;
} & RoomProps &
  SettingsAccessProps) {
  const { type, board, boardControl, host, players, round, soloDispatch } =
    useEngineContext();

  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);

  if (disabled) return null;
  if (!board) return null;

  const userInGame = players.has(userId);
  // The host doesn't play but starts the rounds (feature 22).
  const isHost = host?.userId === userId;

  if (userInGame || isHost) {
    return (
      <PreviewRoundDialog
        board={board}
        boardControl={boardControl}
        Form={fetcher.Form}
        numRounds={numRounds}
        onDismiss={onDismiss}
        players={players}
        round={round}
        type={type}
        url={url}
        roomId={roomId}
        userId={userId}
        isAdmin={isAdmin}
        isHost={isHost}
      />
    );
  }
  return (
    <JoinGameDialog
      type={type}
      Form={fetcher.Form}
      gameTitle={gameTitle}
      name={name}
      onWatch={onWatch}
      playerColor={playerColor}
      players={players}
      roomId={roomId}
      userId={userId}
      watching={watching}
    />
  );
}
