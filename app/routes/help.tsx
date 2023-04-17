import type { V2_MetaFunction } from "@remix-run/node";
import Code, { CodeBlock } from "~/components/code";

export const meta: V2_MetaFunction = () => [{ title: "jep! - Help" }];

export default function Help() {
  return (
    <div className="max-w-full">
      <main className="mx-auto max-w-screen-md px-4 pt-8 md:pt-16">
        <h2 className="mb-4 text-2xl font-semibold">.jep.json file format</h2>
        <p className="mb-4">
          A <Code>.jep.json</Code> file has the following format:
        </p>
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
          A clue can be <span className="italic">wagerable</span> or not.
          Wagerable clues allow players to wager on the answer and win or lose
          that value instead of the clue's value. The "wagerable" field is not
          required.
        </p>
        <p className="mb-4">
          Clues can also be <span className="italic">long-form</span> or not.
          For long-form clues, all players may write down their answers over a
          longer time period instead of competing to buzz in. Long-form clues
          must also be wagerable.
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
      </main>
    </div>
  );
}
