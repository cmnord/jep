import * as React from "react";
import {
  data,
  Form,
  useNavigation,
  useSearchParams,
  useSubmit,
} from "react-router";

import { ButtonLink } from "~/components/button";
import { DefaultErrorBoundary } from "~/components/error";
import { FormStateMessage, hasDetails } from "~/components/form-state-message";
import { LoadingSpinner } from "~/components/icons";
import Main from "~/components/main";
import { MyRoomsList } from "~/components/my-rooms";
import Search from "~/components/search";
import Upload from "~/components/upload";
import { useTranslation } from "~/i18n";
import { getValidAuthSession } from "~/models/auth";
import { getGames } from "~/models/game.server";
import { getMyRoomsInProgress } from "~/models/my-rooms.server";
import { getSolvesForUser, Solve } from "~/models/solves.server";
import { getSessionFormState, getUserSession } from "~/session.server";
import useDebounce from "~/utils/use-debounce";
import useInfiniteScroll from "~/utils/use-scroll";

import type { Route } from "./+types/route";
import GameCard from "./game-card";

export async function loader({ request }: Route.LoaderArgs) {
  const authSession = await getValidAuthSession(request);

  const searchParams = new URL(request.url).searchParams;
  const pageStr = searchParams.get("page");
  const page = pageStr ? Number(pageStr) : 1;

  // "Your games in progress": the user's own ids only (account and guest
  // cookie), on the first page (infinite scroll loads further pages here).
  const [serverGames, myRooms] = await Promise.all([
    getGames({ page, search: searchParams.get("q") }, authSession?.accessToken),
    page === 1
      ? getMyRoomsInProgress(
          [authSession?.userId, await getUserSession(request)],
          {
            accessToken: authSession?.accessToken,
            accountId: authSession?.userId,
          },
        )
      : [],
  ]);

  const userId = authSession?.userId;
  const solves = userId
    ? await getSolvesForUser(userId, authSession?.accessToken)
    : [];

  const [formState, headers] = await getSessionFormState(request);

  return data(
    { serverGames, formState, authSession, solves, myRooms },
    { headers },
  );
}

export default function Index({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation();
  const [params] = useSearchParams();

  // Upload
  const uploadFormRef = React.useRef<HTMLFormElement | null>(null);
  // The success and error messages are shown even if JavaScript is not
  // available.
  const [formState, setFormState] = React.useState(loaderData.formState);

  // Search
  const searchFormRef = React.useRef<HTMLFormElement | null>(null);
  const initialSearch = params.get("q") ?? undefined;
  const [search, setSearch] = React.useState(initialSearch);
  const debouncedSearch = useDebounce(search, 500);
  const submit = useSubmit();
  const navigation = useNavigation();

  // Pagination
  const {
    items: games,
    sentinelRef,
    shouldLoadMore,
    isLoading: isLoadingMore,
  } = useInfiniteScroll(loaderData.serverGames, {
    getUrl: (page) => {
      const qParam = debouncedSearch ? `&q=${debouncedSearch}` : "";
      return `/?index${qParam}&page=${page}`;
    },
    getItems: (data: typeof loaderData) => data.serverGames,
  });

  // solvesMap is a map from game_id to solve. Check against it to see if a game
  // has been solved.
  const solvesMap = new Map<string, Solve>();
  loaderData.solves.forEach((solve) => {
    solvesMap.set(solve.game_id, solve);
  });

  const loaderFormState = loaderData.formState;
  React.useEffect(() => {
    setFormState(loaderFormState);

    if (loaderFormState?.success && !hasDetails(loaderFormState)) {
      // Use JavaScript to reset form
      uploadFormRef.current?.reset();
      const handler = window.setTimeout(() => {
        // Use JavaScript to hide success message after timeout
        setFormState(undefined);
      }, 10_000);
      return () => window.clearTimeout(handler);
    }
  }, [loaderFormState]);

  React.useEffect(() => {
    if (debouncedSearch !== undefined) {
      submit(searchFormRef.current);
    }
  }, [debouncedSearch, submit]);

  return (
    <Main>
      <MyRoomsList rooms={loaderData.myRooms} />
      <Form method="GET" ref={searchFormRef}>
        <Search
          name="q"
          onChange={(s) => setSearch(s)}
          defaultValue={initialSearch}
          loading={navigation.state === "loading"}
        />
      </Form>
      <Upload
        formRef={uploadFormRef}
        loggedIn={loaderData.authSession !== null}
        redirectTo="/"
        // JavaScript to clean messages when submitting
        onUploadStart={() => setFormState(undefined)}
      />
      <div className="mb-4 flex justify-center">
        <ButtonLink to="/random-board">{t("random.homeButton")}</ButtonLink>
      </div>
      {formState ? <FormStateMessage formState={formState} /> : null}
      {games.length === 0 && (
        <p className="text-sm text-ink-500">
          {search
            ? t("home.noGamesForSearch", { search: debouncedSearch ?? "" })
            : t("home.noGames")}
        </p>
      )}
      <div className="mb-4 flex flex-col gap-4 sm:grid sm:grid-cols-2">
        {games.map((game, i) => (
          <GameCard
            key={`game-${i}`}
            game={game}
            solve={solvesMap.get(game.id)}
            loggedIn={loaderData.authSession !== null}
          />
        ))}
      </div>
      {shouldLoadMore && <div ref={sentinelRef} />}
      {isLoadingMore && (
        <div className="flex h-5 justify-center">
          <LoadingSpinner />
        </div>
      )}
    </Main>
  );
}

export { DefaultErrorBoundary as ErrorBoundary };
