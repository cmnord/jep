import clsx from "clsx";
import * as React from "react";

import BoardComponent from "~/components/board";
import Connection from "~/components/connection";
import GameClock from "~/components/game-clock";
import { HostBadge } from "~/components/host/host-badge";
import { PausedOverlay } from "~/components/pause";
import { PlayerIcon, PlayerScore } from "~/components/player";
import { PROMPT_STATES } from "~/components/prompt/prompt";
import { QrCode } from "~/components/qr-code";
import SoundControl from "~/components/sound";
import { Soundboard } from "~/components/soundboard";
import { ScoreChange } from "~/components/standings/standings";
import { useRecentScoreChanges } from "~/components/standings/use-recent-score-changes";
import { getTeamName, TeamSwatch } from "~/components/team/team";
import { GameState, useEngineContext } from "~/engine";
import type { Player } from "~/engine";
import {
  getTeamStandings,
  getWinningTeams,
  isTeamMode,
  type TeamStanding,
} from "~/engine/teams";
import { useTranslation } from "~/i18n";
import type { Game } from "~/models/convert.server";
import { TEAM_COLORS } from "~/models/team";
import { formatDollars, getPlayerColor } from "~/utils";
import { useFullscreen } from "~/utils/use-fullscreen";
import { useWakeLock } from "~/utils/use-wake-lock";

import { WatcherCount } from "./spectator-bar";
import { getWinners, sortByScore } from "./status";
import {
  useViewerStatus,
  ViewerPromptContent,
  ViewerStatusLine,
} from "./viewer-prompt";

/** The presenter has no player: nothing on it can act for anyone. */
const NO_USER = "";

function FullscreenButton() {
  const { t } = useTranslation();
  const { supported, active, toggle } = useFullscreen();
  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-200 ring-1 ring-white/30 transition-colors hover:bg-white/10 hover:text-white"
    >
      {active ? t("watch.exitFullscreen") : t("watch.fullscreen")}
    </button>
  );
}

/** useNeedsSoundGesture is true until the viewer interacts with the page:
 * browsers block audio that starts without a tap/click/key press first. */
function useNeedsSoundGesture() {
  const [needed, setNeeded] = React.useState(false);
  React.useEffect(() => {
    if (
      "userActivation" in navigator &&
      navigator.userActivation.hasBeenActive
    ) {
      return;
    }

    setNeeded(true);
    const done = () => setNeeded(false);
    document.addEventListener("pointerdown", done, { once: true });
    document.addEventListener("keydown", done, { once: true });
    return () => {
      document.removeEventListener("pointerdown", done);
      document.removeEventListener("keydown", done);
    };
  }, []);
  return needed;
}

function JoinQr({
  joinUrl,
  size,
}: {
  joinUrl: string;
  size: "large" | "small";
}) {
  const { t } = useTranslation();
  const large = size === "large";
  return (
    <div
      className={clsx(
        "flex flex-col items-center gap-2 text-center",
        large ? "gap-3" : "gap-1",
      )}
    >
      <QrCode
        value={joinUrl}
        label={t("watch.qrLabel")}
        className={clsx(
          "rounded-lg",
          large
            ? "h-[min(45dvh,22rem)] w-[min(45dvh,22rem)]"
            : "h-28 w-28 lg:h-36 lg:w-36",
        )}
      />
      <p
        className={clsx(
          "font-bold text-white",
          large ? "text-3xl lg:text-4xl" : "text-sm",
        )}
      >
        {t("watch.scanToJoin")}
      </p>
      {large ? (
        <p className="text-lg break-all text-slate-300 lg:text-xl">
          {t("watch.orOpen", { url: joinUrl })}
        </p>
      ) : null}
    </div>
  );
}

/** PlayerList shows every player's tile, highest score first. */
function PlayerList({ players }: { players: Player[] }) {
  const { t } = useTranslation();
  const { boardControl } = useEngineContext();
  const changes = useRecentScoreChanges();
  if (players.length === 0) {
    return <p className="text-slate-300">{t("watch.noPlayers")}</p>;
  }
  const best = players[0].score;
  return (
    <ol
      className="grid grid-cols-2 gap-2 lg:grid-cols-1"
      aria-label={t("watch.players")}
      data-testid="presenter-players"
    >
      {players.map((p) => (
        <li key={p.userId} className="min-w-0">
          <PlayerScore
            player={p}
            hasBoardControl={p.userId === boardControl}
            winning={players.length > 1 && p.score === best}
            scoreChange={changes.get(p.userId)}
          />
        </li>
      ))}
    </ol>
  );
}

/** useTeamStandings is the team standings, or null when no one has a team. */
function useTeamStandings(): TeamStanding[] | null {
  const { players, leftPlayers, teamNames } = useEngineContext();
  if (!isTeamMode({ players, leftPlayers })) return null;
  return getTeamStandings({ players, leftPlayers, teamNames });
}

/** TeamTotals shows every team's total in big type, highest first. */
function TeamTotals({ standings }: { standings: TeamStanding[] }) {
  const { t } = useTranslation();
  const changes = useRecentScoreChanges();
  return (
    <ol
      className="flex flex-col gap-2"
      aria-label={t("team.teams")}
      data-testid="presenter-teams"
    >
      {standings.map((s) => {
        const name = getTeamName(t, s.team, s.name);
        return (
          <li
            key={s.team}
            className="flex min-w-0 items-center gap-3 rounded-2xl border-l-8 bg-white/5 px-3 py-2"
            style={{ borderColor: TEAM_COLORS[s.team] }}
            aria-label={t("team.score", {
              name,
              score: formatDollars(s.score),
            })}
          >
            <span className="min-w-0 grow truncate text-2xl font-bold lg:text-3xl">
              {name}
            </span>
            <span
              className={clsx(
                "shrink-0 font-inter text-3xl font-bold lg:text-4xl",
                s.score < 0 ? "text-red-400" : "text-white",
              )}
            >
              {formatDollars(s.score)}
            </span>
            {changes.size > 0 ? (
              <ScoreChange
                size="lg"
                amount={[...s.members, ...s.leftMembers].reduce(
                  (sum, p) => sum + (changes.get(p.userId) ?? 0),
                  0,
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Lobby is the round preview: a big QR code to join, and who is in. */
function Lobby({ joinUrl, game }: { joinUrl: string; game: Game }) {
  const { t } = useTranslation();
  const { players, round } = useEngineContext();
  return (
    <div className="flex grow flex-col items-center justify-center gap-6 overflow-y-auto p-6 lg:flex-row lg:gap-16">
      <JoinQr joinUrl={joinUrl} size="large" />
      <div className="flex max-w-xl flex-col items-center gap-4 text-center lg:items-start lg:text-left">
        <h2 className="font-korinna text-4xl font-bold text-white uppercase text-shadow-md lg:text-6xl">
          {game.title}
        </h2>
        <p className="text-2xl text-slate-300">
          {t("watch.roundOf", { round: round + 1, total: game.boards.length })}
        </p>
        <ul className="flex flex-wrap justify-center gap-4 lg:justify-start">
          {Array.from(players.values()).map((p) => (
            <li
              key={p.userId}
              className="flex w-24 flex-col items-center gap-1 font-handwriting text-xl font-bold lg:w-28"
              style={{ color: getPlayerColor(p) }}
            >
              <PlayerIcon player={p} size="tile" />
              <span className="w-full truncate text-center">{p.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** GameOverScreen shows the winner(s) and the final standings. */
function GameOverScreen() {
  const { t } = useTranslation();
  const { players } = useEngineContext();
  const winners = getWinners(players);
  const standings = sortByScore(players);
  const teamStandings = useTeamStandings();
  const winningTeams = teamStandings ? getWinningTeams(teamStandings) : [];
  return (
    <div className="flex grow flex-col items-center justify-center gap-6 overflow-y-auto p-6 text-center">
      <h2 className="font-korinna text-5xl font-bold text-white uppercase text-shadow-md lg:text-7xl">
        {t("watch.status.gameOver")}
      </h2>
      {winningTeams.length > 0 ? (
        <p
          className="flex flex-wrap items-center justify-center gap-3 text-4xl font-bold text-yellow-300 lg:text-6xl"
          data-testid="presenter-winning-team"
        >
          <span aria-hidden>🏆</span>
          {winningTeams.map((s) => (
            <TeamSwatch key={s.team} team={s.team} className="h-10 w-10" />
          ))}
          <span>
            {winningTeams.length === 1
              ? t("team.winner", {
                  name: getTeamName(
                    t,
                    winningTeams[0].team,
                    winningTeams[0].name,
                  ),
                })
              : t("team.tie", {
                  names: winningTeams
                    .map((s) => getTeamName(t, s.team, s.name))
                    .join(", "),
                })}
          </span>
        </p>
      ) : null}
      {winners.length > 0 ? (
        <>
          <div className="flex flex-wrap justify-center gap-6">
            {winners.map((p) => (
              <div key={p.userId} className="flex flex-col items-center gap-2">
                <span className="text-6xl" aria-hidden>
                  👑
                </span>
                <PlayerIcon player={p} size="tile" />
              </div>
            ))}
          </div>
          <p
            className="text-4xl font-bold text-yellow-300 lg:text-6xl"
            data-testid="presenter-winner"
          >
            {winners.length === 1
              ? t("watch.winner", { name: winners[0].name })
              : t("watch.tie", {
                  names: winners.map((p) => p.name).join(", "),
                })}
          </p>
        </>
      ) : null}
      <ol className="flex flex-col gap-1 text-2xl text-white lg:text-3xl">
        {standings.map((p, i) => (
          <li key={p.userId} className="flex justify-between gap-8">
            <span>
              {i + 1}. {p.name}
            </span>
            <span className="font-bold">{formatDollars(p.score)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Presenter is the big-screen view of a room for a TV (or a laptop on a
 * projector): the board, the open question with its media, players and
 * scores, what is happening, and a QR code to join. It never sends anything:
 * it only renders the shared engine state. */
export function Presenter({ game, joinUrl }: { game: Game; joinUrl: string }) {
  const { t } = useTranslation();
  const {
    connectionState,
    lastMessageAt,
    players,
    reconnect,
    round,
    type,
    watchers,
  } = useEngineContext();
  const status = useViewerStatus();
  const needsSoundGesture = useNeedsSoundGesture();
  useWakeLock();

  const sorted = sortByScore(players);
  const teamStandings = useTeamStandings();
  const promptOpen = PROMPT_STATES.has(type);
  const lobby = type === GameState.PreviewRound;
  const gameOver = type === GameState.GameOver;

  let main: React.ReactNode;
  if (lobby) {
    main = <Lobby joinUrl={joinUrl} game={game} />;
  } else if (gameOver) {
    main = <GameOverScreen />;
  } else if (promptOpen) {
    main = (
      <div
        className="flex min-h-0 grow flex-col justify-between overflow-y-auto rounded-xl bg-blue-bright"
        data-testid="presenter-prompt"
      >
        <ViewerPromptContent variant="tv" status={status} />
      </div>
    );
  } else {
    main = (
      // Let the board use the whole width of a big screen.
      <div className="flex min-h-0 grow flex-col justify-center overflow-y-auto [&_[data-columns]]:max-w-none!">
        <BoardComponent roomId={-1} userId={NO_USER} readOnly />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-dvh flex-col bg-blue-1000 text-white lg:h-dvh"
      data-testid="presenter"
    >
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <h1 className="font-korinna text-xl font-bold text-shadow-md">Jep!</h1>
        <p className="min-w-0 truncate text-slate-300">
          {game.title}
          {!lobby && !gameOver
            ? ` · ${t("watch.roundOf", { round: round + 1, total: game.boards.length })}`
            : null}
        </p>
        <HostBadge />
        <div className="ml-auto flex items-center gap-2">
          <WatcherCount count={watchers} className="text-sm text-slate-300" />
          <GameClock roomId={-1} readOnly />
          <SoundControl showLabel={false} showSlider={false} />
          <FullscreenButton />
        </div>
      </header>
      {!promptOpen && !gameOver ? (
        <ViewerStatusLine
          status={status}
          className="px-4 pb-2 text-center text-2xl font-bold lg:text-4xl"
        />
      ) : null}
      <div className="flex min-h-0 grow flex-col gap-4 p-4 pt-0 lg:flex-row">
        <main className="flex min-h-0 min-w-0 grow flex-col">{main}</main>
        <aside className="flex shrink-0 flex-col gap-4 lg:w-80 xl:w-96">
          <div className="flex min-h-0 grow flex-col gap-4 overflow-y-auto">
            {teamStandings ? <TeamTotals standings={teamStandings} /> : null}
            <PlayerList players={sorted} />
          </div>
          {lobby ? null : (
            <div className="hidden lg:block">
              <JoinQr joinUrl={joinUrl} size="small" />
            </div>
          )}
        </aside>
      </div>
      <div className="px-4 pb-2">
        <Connection
          state={connectionState}
          lastMessageAt={lastMessageAt}
          reconnect={reconnect}
        />
      </div>
      {needsSoundGesture ? (
        <p className="fixed bottom-3 left-1/2 z-40 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm text-white">
          <span aria-hidden>🔊 </span>
          {t("watch.soundHint")}
        </p>
      ) : null}
      <PausedOverlay roomId={-1} canResume={false} />
      {/* Players' reaction sounds: the TV only listens. */}
      <Soundboard userId={null} variant="tv" />
    </div>
  );
}
