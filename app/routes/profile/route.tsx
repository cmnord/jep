import * as React from "react";
import { data, useFetcher } from "react-router";
import { ENV } from "varlock/env";

import Button from "~/components/button";
import Dialog from "~/components/dialog";
import { FormStateMessage, hasDetails } from "~/components/form-state-message";
import {
  Cog6Tooth,
  FaceSmile,
  PaperAirplane,
  PencilSquare,
} from "~/components/icons";
import Input from "~/components/input";
import Link from "~/components/link";
import Main from "~/components/main";
import OfflineIndicator from "~/components/offline-indicator";
import { PlayerIcon } from "~/components/player";
import { AvatarPicker } from "~/components/player/avatar-picker";
import SoundControl from "~/components/sound";
import Upload from "~/components/upload";
import WagerHintsControl from "~/components/wager-hints-control";
import { useTranslation } from "~/i18n";
import { requireAuthSession, type AuthSession } from "~/models/auth";
import { getGamesForUser, type DbGame } from "~/models/game.server";
import { hueToPlayerColor, normalizePlayerColor } from "~/models/player-color";
import { getSolvesForUser, type Solve } from "~/models/solves.server";
import { getUserByEmail } from "~/models/user/service.server";
import { getSessionFormState } from "~/session.server";
import { stringToHue } from "~/utils";
import { getAllCachedGames, type CachedGame } from "~/utils/offline-storage";
import { useGameDefaults } from "~/utils/user-settings";

interface OnlineLoaderData {
  user: { created_at: string; email: string; id: string; settings: unknown };
  formState:
    | { success: boolean; message: string; details?: string[] }
    | undefined;
  games: DbGame[];
  solves: Solve[];
  BASE_URL: string;
  authSession: AuthSession;
}

function isOnlineLoaderData(data: object): data is OnlineLoaderData {
  return "games" in data;
}

import type { Route } from "./+types/route";
import { DownloadedGameInfo } from "./downloaded-game-info";
import { GameInfo } from "./game-info";
import SolveInfo from "./solve-info";

export async function loader({ request }: Route.LoaderArgs) {
  const authSession = await requireAuthSession(request);

  const games = await getGamesForUser(
    authSession.userId,
    authSession.accessToken,
  );

  const solves = await getSolvesForUser(
    authSession.userId,
    authSession.accessToken,
  );

  const [formState, headers] = await getSessionFormState(request);

  const user = await getUserByEmail(authSession.email, authSession.accessToken);
  if (!user) {
    throw new Response("Account profile not found", { status: 500 });
  }

  return data(
    {
      user,
      formState,
      games,
      solves,
      BASE_URL: ENV.BASE_URL,
      authSession,
    },
    { headers },
  );
}

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  const cachedGames = await getAllCachedGames();
  try {
    const serverData = await serverLoader();
    return { ...serverData, cachedGames, offline: false as const };
  } catch {
    return { cachedGames, offline: true as const };
  }
}
clientLoader.hydrate = true as const;

function DownloadedGamesSection({
  cachedGames,
  onRemoved,
}: {
  cachedGames: CachedGame[];
  onRemoved: (gameId: string) => void;
}) {
  const { t } = useTranslation();
  if (cachedGames.length === 0) return null;
  return (
    <>
      <h2 className="mb-4 text-2xl font-semibold">
        {t("profile.downloadedGames")}
      </h2>
      <p className="mb-4 text-sm text-ink-500">
        {t("profile.downloadedGamesDescription")}
      </p>
      <ul className="mb-4 list-inside list-disc text-ink-700">
        {cachedGames.map((cg) => (
          <DownloadedGameInfo
            key={cg.id}
            cachedGame={cg}
            onRemoved={() => onRemoved(cg.id)}
          />
        ))}
      </ul>
    </>
  );
}

export default function Profile({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation();
  const [cachedGames, setCachedGames] = React.useState<CachedGame[]>([]);

  // clientLoader runs after hydration, so sync its result into state.
  React.useEffect(() => {
    if ("cachedGames" in loaderData) {
      setCachedGames(loaderData.cachedGames);
    }
  }, [loaderData]);

  function handleRemoved(gameId: string) {
    setCachedGames((prev) => prev.filter((g) => g.id !== gameId));
  }

  // Offline-only render: show downloaded games only
  if ("offline" in loaderData && loaderData.offline) {
    return (
      <div className="max-w-full grow">
        <Main>
          <h1 className="mb-4 text-2xl font-semibold">{t("profile.title")}</h1>
          <OfflineIndicator />
          <DownloadedGamesSection
            cachedGames={cachedGames}
            onRemoved={handleRemoved}
          />
        </Main>
      </div>
    );
  }

  // Online render
  if (isOnlineLoaderData(loaderData)) {
    return (
      <OnlineProfile
        loaderData={loaderData}
        cachedGames={cachedGames}
        onRemoved={handleRemoved}
      />
    );
  }

  return null;
}

function PlayerDefaultsControl({
  email,
  userId,
}: {
  email: string;
  userId: string;
}) {
  const {
    playerName,
    playerColor,
    playerAvatar,
    setPlayerName,
    setPlayerColor,
    setPlayerAvatar,
  } = useGameDefaults();
  const { t } = useTranslation();
  const [editing, setEditing] = React.useState(false);
  const [avatarOpen, setAvatarOpen] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState(playerName ?? "");
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const fallbackHex = hueToPlayerColor(stringToHue(userId));
  const effectiveColor = playerColor ?? fallbackHex;
  const namePlaceholder = t("profile.randomEmoji");

  React.useEffect(() => {
    if (!editing) {
      setNameDraft(playerName ?? "");
    }
  }, [playerName, editing]);

  function commitName(name: string) {
    const trimmed = name.trim();
    setPlayerName(trimmed ? trimmed : undefined);
  }

  function handleFocus() {
    inputRef.current?.focus();
    setEditing(true);
  }

  function handleBlur() {
    commitName(nameDraft);
    setEditing(false);
  }

  return (
    <section className="mb-6 flex flex-col gap-3">
      <h1 className="text-3xl font-semibold text-ink-900">{email}</h1>

      {/* Rough ripoff of PlayerScoreBox */}
      <div className="flex items-center gap-2 rounded-2xl bg-blue-700 p-2 sm:gap-3 sm:p-3">
        <label
          htmlFor="defaultPlayerColor"
          className="inline-flex cursor-pointer"
          title={t("profile.pickColor")}
        >
          <PlayerIcon
            player={{
              name: playerName ?? "🔀",
              userId,
              color: effectiveColor,
              avatar: playerAvatar,
            }}
            size="tile"
          />
        </label>
        <div className="flex w-full items-center gap-2 rounded-xl text-white">
          <Input
            variant="player"
            ref={inputRef}
            id="defaultPlayerName"
            type="text"
            maxLength={50}
            value={nameDraft}
            placeholder={namePlaceholder}
            onChange={(e) => setNameDraft(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            aria-label={t("profile.playerName")}
          />
          <button
            type="button"
            onClick={() => setAvatarOpen(true)}
            className="rounded-xl bg-white/10 px-3 py-2"
          >
            <FaceSmile
              className="h-5 w-5 opacity-50"
              title={t("profile.changeAvatar")}
            />
          </button>
          {editing ? (
            <button
              type="button"
              onClick={() => {
                inputRef.current?.blur();
                setEditing(false);
              }}
              className="rounded-xl bg-white/10 px-3 py-2"
            >
              <PaperAirplane
                className="h-5 w-5 opacity-50"
                title={t("profile.submit")}
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFocus}
              className="rounded-xl bg-white/10 px-3 py-2"
            >
              <PencilSquare
                className="h-5 w-5 opacity-50"
                title={t("profile.edit")}
              />
            </button>
          )}
        </div>
      </div>

      <input
        id="defaultPlayerColor"
        type="color"
        className="sr-only"
        value={effectiveColor}
        onChange={(e) => {
          const color = normalizePlayerColor(e.target.value);
          if (color != null) {
            setPlayerColor(color);
          }
        }}
      />

      <Dialog
        isOpen={avatarOpen}
        onClose={() => setAvatarOpen(false)}
        title={t("profile.defaultAvatar")}
        description={t("profile.defaultAvatarDescription")}
      >
        <AvatarPicker value={playerAvatar} onChange={setPlayerAvatar} />
      </Dialog>

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          disabled={playerName == null}
          onClick={() => {
            setNameDraft("");
            setPlayerName(undefined);
            setEditing(false);
          }}
        >
          {t("profile.clearName")}
        </Button>
        <Button
          type="button"
          disabled={playerColor == null}
          onClick={() => setPlayerColor(undefined)}
        >
          {t("profile.clearColor")}
        </Button>
      </div>
    </section>
  );
}

function OnlineProfile({
  loaderData,
  cachedGames,
  onRemoved,
}: {
  loaderData: OnlineLoaderData;
  cachedGames: CachedGame[];
  onRemoved: (gameId: string) => void;
}) {
  const { t } = useTranslation();
  const patchGame = useFetcher<never>();
  const formRef = React.useRef<HTMLFormElement | null>(null);

  const [formState, setFormState] = React.useState(loaderData.formState);

  React.useEffect(() => {
    if (patchGame.state === "submitting") {
      setFormState(undefined);
    }
  }, [patchGame.state]);

  const loaderFormState = loaderData.formState;
  React.useEffect(() => {
    setFormState(loaderFormState);

    if (loaderFormState?.success && !hasDetails(loaderFormState)) {
      const handler = window.setTimeout(() => {
        setFormState(undefined);
      }, 5000);
      return () => window.clearTimeout(handler);
    }
  }, [loaderFormState]);

  return (
    <div className="max-w-full grow">
      <Main>
        <PlayerDefaultsControl
          email={loaderData.user.email}
          userId={loaderData.user.id}
        />

        <p className="mb-4 text-sm">
          <Link to="/settings">
            <span className="inline-flex items-center gap-1.5">
              <Cog6Tooth className="h-4 w-4" />
              {t("profile.accountSettings")}
            </span>
          </Link>
        </p>
        <OfflineIndicator />

        <h2 className="mb-2 text-2xl font-semibold">
          {t("profile.gameSettings")}
        </h2>
        <div className="mb-6 flex flex-col gap-4">
          <SoundControl />
          <WagerHintsControl />
        </div>

        <DownloadedGamesSection
          cachedGames={cachedGames}
          onRemoved={onRemoved}
        />

        <h2 className="mb-4 text-2xl font-semibold">{t("profile.myGames")}</h2>
        <Upload
          formRef={formRef}
          loggedIn
          redirectTo="/profile"
          onUploadStart={() => setFormState(undefined)}
        />
        {loaderData.games.length === 0 ? (
          <p className="text-sm text-ink-500">{t("profile.noGames")}</p>
        ) : null}
        <ul className="mb-4 list-inside list-disc text-ink-700">
          {loaderData.games.map((game) => (
            <GameInfo
              key={game.id}
              BASE_URL={loaderData.BASE_URL}
              game={game}
              fetcher={patchGame}
            />
          ))}
        </ul>
        {formState ? <FormStateMessage formState={formState} /> : null}
        <h2 className="mb-4 text-2xl font-semibold">{t("profile.mySolves")}</h2>
        <div>
          {loaderData.solves.map((solve) => (
            <SolveInfo key={solve.id} solve={solve} />
          ))}
        </div>
      </Main>
    </div>
  );
}
