import type { V2_MetaFunction } from "@remix-run/node";

import Code, { CodeBlock } from "~/components/code";
import Link, { Anchor } from "~/components/link";
import Main from "~/components/main";

export const meta: V2_MetaFunction = () => [{ title: "Help" }];

const JSON_EDIT_URL =
  "https://json-editor.github.io/json-editor/?data=N4Ig9gDgLglmB2BnEAuUMDGCA2MBGqIAZglAIYDuApomALZUCsIANOHgFZUZQD62ZAJ5gArlELwwAJzplsrEIgwALKrNSgAJEtXqUIZVCgQUAelMda8ALQ61ZAHTSA5qYAmUskSjWADAHZTO1kAYgVNGDdCQ2MzU2wwDDllMEQoFABmX2zTZzIGB2DHSwQFMjc3GFgEOQAFKUgqKVgaVCI5RCo2CDIjJvhCAD0HACoAHTGHLggJqatNBVgobCpCACkqCABCAAIAcXyqHYBlFXtFwQhV/TBObnFuhqvmmFa0ECWVjQ/L68UoKQweDOEAAXzYZDEKSk3ygv0IaUBwLBbCwEEEgOchlh8P0iKBIPBIEkUGuoDhVwRAIJKJAeDAZCkbmQ7wpf0ZnkECiqahZ5Nx7C4PAUECeTRafJASVJzmkggAcodJWzCByhNzSXRlQL8cjQUTpVRZYC3vzKfo1Vy2DytTjzYL7iKxS9TcTDna/rrCWwSWSfvavbSMNgRK6VRapJyNbyPYRbkKHiBRY0XZLg6HY3jqXqIUhqDDWTrs96QAA3OQZwv2oEypq0ihkZxNMh3L5Vv70sArMgDIkJYEAMWkdEzdLAXaoPbBRKkVAAjiIYLOoigANpSkOrXOIfMKcubkAAXX1M/ni+XqHX8HdqM3yGP+rYs4XS6oK/XhuNCqVCk/0le94nk+Z6vu+HxVF8EJQtIv6QBiMBYomvoKPSjLMkeRKICkFC8E0DRSCyIA1s2PBwAMbBQLoHbjlAiJkBAAAs05AA===";

export default function Help() {
  return (
    <div className="max-w-full">
      <Main>
        <h1 className="mb-4 text-2xl font-semibold">
          <Code className="text-xl">.jep.json</Code> format help
        </h1>
        <p className="mb-4">
          A <Code className="text-sm">.jep.json</Code> file has the following
          format, also described in the{" "}
          <Link to="/game.schema.json">JSON schema</Link> file.
        </p>
        <p className="mb-4">
          You can compose a game using the schema with the JSON editor{" "}
          <Anchor href={JSON_EDIT_URL}>here</Anchor>, or in any text editor.
        </p>
        <h1 className="mb-4 text-2xl font-semibold">Full schema</h1>
        <CodeBlock
          text={`{
  "title": "Your Title",
  "author": "Author Name",
  "copyright": "(c) Copyright Holder",
  "note": "any note",
  "boards": [ ... board objects ]
}`}
        />
        <p className="mb-4">
          A game is a series of "boards". Each board looks like so:
        </p>

        <CodeBlock
          text={`{
  "categoryNames": [
    "Apples",
    "Bananas"
  ],
  "categories": [
    {
      "name": "Apples",
      "note": "Name the apple variety.",
      "clues": [
        {
          "clue": "This apple variety is named after a city in New York State",
          "answer": "Empire",
          "value": 200
        }
        // ... more clues
      ]
    },
    {
      "name": "Bananas",
      "clues": [ ... clues for category 2 ],
    }
  ]
}`}
        />
        <p className="mb-4">
          A clue can be <em>wagerable</em> or not. Wagerable clues allow players
          to wager on the answer and win or lose that value instead of the
          clue's value. The "wagerable" field is not required.
        </p>
        <p className="mb-4">
          Clues can also be <em>long-form</em> or not. For long-form clues, all
          players may write down their answers over a longer time period instead
          of competing to buzz in. Long-form clues must also be wagerable.
        </p>
        <p className="mb-4">In summary:</p>
        <CodeBlock
          text={`interface Game {
  title: string;
  author: string;
  copyright: string;
  note: string;
  boards: Board[];
}

interface Board {
  categoryNames: string[];
  categories: Category[];
}

interface Category {
  name: string;
  clues: Clue[];
  note?: string;
}

interface Clue {
  clue: string;
  answer: string;
  value: number;
  wagerable?: boolean; // default false
  longForm?: boolean; // default false
}`}
        />
      </Main>
    </div>
  );
}
