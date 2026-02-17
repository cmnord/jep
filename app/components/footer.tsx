import clsx from "clsx";
import * as React from "react";
import { Link, useMatches } from "react-router";

import Dialog from "~/components/dialog";
import { GlobeAmericas } from "~/components/icons";
import { Anchor } from "~/components/link";
import { GITHUB_URL } from "~/utils";

function LinkItem({
  isInGame,
  children,
}: {
  isInGame: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx("text-sm decoration-dashed hover:underline", {
        "text-slate-300 decoration-slate-300 hover:text-slate-100": isInGame,
        "text-slate-500 decoration-slate-500 hover:text-slate-700": !isInGame,
      })}
    >
      {children}
    </div>
  );
}

function Dot({ isInGame }: { isInGame: boolean }) {
  return (
    <div
      className={clsx({
        "text-slate-300": isInGame,
        "text-slate-500": !isInGame,
      })}
    >
      &middot;
    </div>
  );
}

export default function Footer() {
  const [showModal, setShowModal] = React.useState(false);
  const matches = useMatches();
  const isInGame = matches.some((match) => {
    const loaderData = match.loaderData;
    return loaderData && typeof loaderData === "object" && "game" in loaderData;
  });

  return (
    <footer
      className={clsx("flex justify-center py-4", {
        "bg-blue-1000": isInGame,
      })}
    >
      <Dialog
        isOpen={showModal}
        title={
          <div className="flex items-center gap-4">
            <GlobeAmericas className="h-8 w-8" />
            <p>Jep!</p>
          </div>
        }
        description="Jep! is a website for playing trivia puzzles with friends online."
        onClickClose={() => setShowModal(false)}
      >
        <p className="text-slate-300">
          This website is open to contributions from developers of any level or
          experience. For more information or to report any issues, check out
          the project on <Anchor href={GITHUB_URL}>GitHub</Anchor>.
        </p>
      </Dialog>
      <div className="flex items-center gap-2">
        <button onClick={() => setShowModal(true)}>
          <LinkItem isInGame={isInGame}>About</LinkItem>
        </button>
        <Dot isInGame={isInGame} />
        <LinkItem isInGame={isInGame}>
          <Link to="howto">How to Play</Link>
        </LinkItem>
        <Dot isInGame={isInGame} />
        <LinkItem isInGame={isInGame}>
          <Link to="community">Community Guidelines</Link>
        </LinkItem>
      </div>
    </footer>
  );
}
