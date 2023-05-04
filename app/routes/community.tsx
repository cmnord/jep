import type { V2_MetaFunction } from "@remix-run/node";

import Link, { Anchor } from "~/components/link";
import Main from "~/components/main";

export const meta: V2_MetaFunction = () => [{ title: "Community Guidelines" }];

const SPORCLE = "https://www.sporcle.com/community/";

export default function Login() {
  return (
    <div className="max-w-full grow">
      <Main>
        <h1 className="mb-4 text-2xl font-semibold">Community Guidelines</h1>
        <h2 className="mb-4 mt-8 text-xl font-semibold">Summary</h2>
        <p className="mb-2">
          Be polite; don't post anything inappropriate.
          <br className="mb-1" />
          Report any inappropriate game content <Link to="/report">here</Link>.
          {/* TODO: or by clicking the "Report" button on the game page. */}
        </p>
        <h2 className="mb-4 mt-8 text-xl font-semibold">
          Moderation policy for uploaded games
        </h2>
        <p className="mb-2">
          "Game content" refers to any part of a game you uploaded, e.g.
          categories, clues, and answers.
        </p>
        <ul className="list-inside list-disc">
          <li>
            Game content must not contain any <em>inappropriate content</em>{" "}
            (see below).
          </li>
          <li>
            We have the right to remove any game content that violates the
            moderation policy.
          </li>
          <li>
            Accounts that violate the policy will be banned from the website.
          </li>
        </ul>
        <h3 className="mb-4 mt-8 text-lg font-semibold">
          Inappropriate content
        </h3>
        <p className="mb-2">
          Inappropriate content includes, but is not limited to:
        </p>
        <ul className="mb-4 list-inside list-disc">
          <li>NSFW material (OK for unlisted or private games)</li>
          <li>Racism, sexism, and other discrimination</li>
          <li>Spreading misinformation</li>
          <li>Spam</li>
          <li>Personal attacks</li>
          <li>Abuse of the reporting system</li>
          <li>Suicide and self-harm</li>
          <li>Threats of violence</li>
          <li>Child endangerment</li>
        </ul>
        <p className="text-sm text-slate-500">
          These guidelines are based on the{" "}
          <Anchor href={SPORCLE}>Sporcle community guidelines</Anchor>.
        </p>
      </Main>
    </div>
  );
}
