import { readFile } from "fs/promises";
import { Convert } from "./convert.server";

import type { Game } from "./game.server";

export const MOCK_GAME: Game = {
  id: "mock",
  title: "Mock Game",
  author: "Patrick Weaver",
  copyright: "(c) Patrick Weaver",
  note: "",
  boards: [
    {
      categoryNames: [
        "Ferns",
        "Delaware",
        "Dolly Parton",
        "Pasta Shapes",
        "New York City",
        "Dairy Products",
      ],
      categories: [
        {
          name: "Ferns",
          clues: [
            {
              clue: "The leaf of a fern is often referred to as this",
              answer: "Frond",
              value: 200,
            },
            {
              clue: "Unlike seed plants, ferns reproduce with these particles",
              answer: "Spores",
              value: 400,
            },
            {
              clue: "Ferns first emerge in the fossil record in this period",
              answer: "Devonian",
              value: 600,
            },
            {
              clue: "The study of ferns and other pteridophytes is called this",
              answer: "Pteridology",
              value: 800,
            },
            {
              clue: "Ferns of this genus, commonly known as water ferns are small, floating plants that do not resemble ferns",
              answer: "Azolla",
              value: 1000,
            },
          ],
        },
        {
          name: "Delaware",
          clues: [
            {
              clue: "This senator was reelected 6 times to represent Delaware",
              answer: "Joe Biden",
              value: 200,
            },
            {
              clue: "This nickname pays homage to Delaware's order in ratifying the constitution",
              answer: "The First State",
              value: 400,
            },
            {
              clue: "This historical geographic marker forms part of Delaware's border",
              answer: "The Mason-Dixon Line",
              value: 600,
            },
            {
              clue: "Along with New Castle and Kent, this is the 3rd county in Delaware",
              answer: "Sussex",
              value: 800,
            },
            {
              clue: "Before European contact people spoke this language family in the region now known as Delaware",
              answer: "Algonquian",
              value: 1000,
            },
          ],
        },
        {
          name: "Dolly Parton",
          clues: [
            {
              clue: "Dolly got her start singing duets with this established star",
              answer: "Porter Wagoner",
              value: 200,
            },
            {
              clue: "Dolly wrote this song featured in the movie The Bodyguard",
              answer: "I Will Always Love You",
              value: 400,
            },
            {
              clue: "Dolly starred in this 1980 film with Jane Fonda and Lily Tomlin",
              answer: "9 to 5",
              value: 600,
            },
            {
              clue: "Dolly, Emmylou Harris and this singer released an album in 1987",
              answer: "Linda Ronstadt",
              value: 800,
            },
            {
              clue: "The Dollywood theme park is in this town in Tennessee",
              answer: "Pigeon Forge",
              value: 1000,
            },
          ],
        },
        {
          name: "Pasta Shapes",
          clues: [
            {
              clue: "One of the most common filled pastas, this can be square, circular, or semi-circular",
              answer: "Raviolli",
              value: 200,
            },
            {
              clue: "A long, thin, cylindrical pasta of Italian origin, made of semolina or flour and water.",
              answer: "Spaghetti",
              value: 400,
            },
            {
              clue: "This type of pasta is commonly known as bow-tie pasta",
              answer: "Farfalle",
              value: 600,
            },
            {
              clue: "Medium length tubes with ridges, cut diagonally at both ends",
              answer: "Penne",
              value: 800,
            },
            {
              clue: "Long, thick, corkscrew-shaped pasta that may be solid or hollow.",
              answer: "Fusilli",
              value: 1000,
            },
          ],
        },
        {
          name: "New York City",
          clues: [
            {
              clue: "In this year the English explorer Henry Hudson rediscovered New York Harbor while searching for the Northwest Passage",
              answer: "1609",
              value: 200,
            },
            {
              clue: "The U.S. military's only active duty installation within New York City",
              answer: "Fort Hamilton",
              value: 400,
            },
            {
              clue: "In 1774 the Government of New York enacted a law to widen this creek into a canal, to keep the watercourse in good condition",
              answer: "The Gowanus Canal",
              value: 600,
            },
            {
              clue: "The coldest month on record in the city is this monrth in 1857, with a mean temperature of 19.6 °F",
              answer: "January",
              value: 800,
            },
            {
              clue: "This NYC bridge's anchorage-to-anchorage total length is 2,910 feet",
              answer: "Throgs Neck Bridge",
              value: 1000,
            },
          ],
        },
        {
          name: "Dairy Products",
          clues: [
            {
              clue: "A separator divides milk into light & heavy parts; this substance is light, so as they say, it rises to the top",
              answer: "cream",
              value: 200,
            },
            {
              clue: "This product that's 80% milk fat typically takes 24 hours to make as the globules of fat are broken down so the fat will coagulate",
              answer: "butter",
              value: 400,
            },
            {
              clue: "Milk is tested for these, such as penicillin, which may have been used to treat cows that fell ill",
              answer: "antibiotics",
              value: 600,
            },
            {
              clue: "This process requires higher temperatures for products with more sugar & fat; for chocolate milk, it's 180 degrees, compared to 162 for milk",
              answer: "pasteurization",
              value: 800,
            },
            {
              clue: "Greek-style this, like oikos, has become popular with its lush texture",
              answer: "yogurt",
              value: 1000,
            },
          ],
        },
      ],
    },
    {
      categoryNames: ["English Spelling"],
      categories: [
        {
          name: "English Spelling",
          clues: [
            {
              clue: "There are at least 50 common exceptions to the rule expressed by this popular rhyming mnemonic couplet",
              answer: "I before E, except after C",
              value: 0,
            },
          ],
        },
      ],
    },
  ],
};

export async function getMockGame(): Promise<Game> {
  // Find the absolute path of the json directory
  // Note: Vercel doesn't include the json directory when using process.cwd() or
  // path.join(). The workaround is to use __dirname and concatenate the json
  // directory to it.
  const jsonDirectory = __dirname + "/../app/static";
  // Read the json data file data.json
  const fileContents = await readFile(jsonDirectory + "/mock.jep.json", "utf8");

  const game = Convert.toGame(fileContents);
  return { id: "mock", ...game };
}
