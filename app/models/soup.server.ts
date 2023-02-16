// https://glitch.com/~jarchive-json
import { fetch } from "@remix-run/node";
import JSSoup, { SoupTag } from "jssoup";
import { Board } from "./convert.server";
import { Game } from "./game.server";

export class SoupGame {
  private jArchive_Board_URL?: string;
  private jArchive_Responses_URL?: string;
  private airDateMs: number;

  private j?: SoupRound;
  private dj?: SoupRound;
  private fj?: FinalSoup;

  constructor(airDateMs: number) {
    this.airDateMs = airDateMs;
    this.parseGame();
  }

  async parseGame() {
    const airDate = new Date(this.airDateMs);
    const month = airDate.getMonth().toString().padStart(2, "0");
    const day = airDate.getDate().toString().padStart(2, "0");
    const gameDate = `${airDate.getFullYear()}-${month}-${day}`;

    const jArchive_Query =
      "http://www.j-archive.com/search.php?search=date%3A" + gameDate;
    const res = await fetch(jArchive_Query);
    this.jArchive_Board_URL = res.url;
    const gameID = this.jArchive_Board_URL.split("game_id=")[1];
    this.jArchive_Responses_URL =
      "http://www.j-archive.com/showgameresponses.php?game_id=" + gameID;

    // console.log("\nJ Archive URLs:");
    // console.log(self.jArchive_Board_URL);
    // console.log(self.jArchive_Responses_URL);

    const boardRes = await fetch(this.jArchive_Board_URL);
    const boardPage = await boardRes.text();
    const gameRes = await fetch(this.jArchive_Responses_URL);
    const responsePage = await gameRes.text();

    const boardParser = new JSSoup(boardPage);
    const responseParser = new JSSoup(responsePage);

    const jSoup = boardParser.find<SoupTag>(undefined, {
      id: "jeopardy_round",
    });
    if (jSoup) {
      this.j = new SoupRound(jSoup);
      const roundSoup = responseParser.find<SoupTag>(undefined, {
        id: "jeopardy_round",
      });
      if (roundSoup) {
        this.j.parseAnswers(roundSoup);
      }
      // this.j.printRound();
    }

    const djSoup = boardParser.find<SoupTag>(undefined, {
      id: "double_jeopardy_round",
    });
    if (djSoup) {
      this.dj = new SoupRound(djSoup);
      const roundSoup = responseParser.find<SoupTag>(undefined, {
        id: "double_jeopardy_round",
      });
      if (roundSoup) {
        this.dj.parseAnswers(roundSoup);
      }
      // this.dj.printRound();
    }

    const fjSoup = boardParser.find<SoupTag>(undefined, {
      id: "final_jeopardy_round",
    });
    if (fjSoup) {
      this.fj = new FinalSoup(fjSoup);
      const roundSoup = responseParser.find<SoupTag>(undefined, {
        id: "final_jeopardy_round",
      });
      if (roundSoup) {
        this.fj.addAnswer(roundSoup);
      }
      // this.fj.printRound();
    }
  }

  jsonify(): Game | undefined {
    if (this.j && this.dj && this.fj) {
      // TODO: set properties
      return {
        id: "",
        title: "",
        author: "",
        version: "",
        copyright: "",
        note: "",
        boards: [this.j.jsonify(), this.dj.jsonify(), this.fj.jsonify()],
      };
    }
  }
}

class FinalSoup {
  private category: string;
  private clue: string;
  private answer?: string;

  constructor(roundSoup: JSSoup) {
    // clueSoup = roundSoup.find_all('td', class_='clue')
    const categoryNameSoup = roundSoup.find<SoupTag>(undefined, {
      class: "category_name",
    })?.text;
    if (!categoryNameSoup) {
      throw new Error("could not find class category_name on page");
    }
    this.category = categoryNameSoup;
    const clueTextSoup = roundSoup.find<SoupTag>(undefined, {
      class: "clue_text",
    })?.text;
    if (!clueTextSoup) {
      throw new Error("could not find class clue_text on page");
    }
    this.clue = clueTextSoup;
  }

  addAnswer(answerSoup: JSSoup) {
    const correctResponseSoup = answerSoup.find<SoupTag>(undefined, {
      class: "correct_response",
    })?.text;
    if (!correctResponseSoup) {
      throw new Error("could not find class correct_response on page");
    }
    this.answer = correctResponseSoup;
  }

  printRound() {
    console.log();
    console.log(this.category);
    console.log(this.clue);
    console.log(this.answer);
  }

  jsonify() {
    const jsonData: Board = {
      categoryNames: [this.category],
      categories: [
        {
          name: this.category,
          clues: [
            {
              clue: this.clue,
              value: 0,
              answer: this.answer!,
              isDailyDouble: true,
            },
          ],
        },
      ],
    };
    return jsonData;
  }
}

class SoupRound {
  private categories: string[];
  private clues: SoupClue[];

  constructor(roundSoup: JSSoup) {
    // Identify the Categories
    const categorySoup = roundSoup.findAll<SoupTag>("td", {
      class: "category_name",
    });
    this.categories = [];
    // console.log("\nCategories:");
    for (const cat of categorySoup) {
      this.categories.push(cat.text);
      // console.log(cat.text);
    }

    // Pull Clues
    let col = 0;
    const clueSoup = roundSoup.findAll<SoupTag>("td", { class: "clue" });
    this.clues = [];
    for (const clue of clueSoup) {
      this.clues.push(new SoupClue(clue, this.categories[col]));
      col += 1;
      if (col > 5) col = 0;
    }
  }

  parseAnswers(answerSoup: JSSoup) {
    const soupClues = answerSoup.findAll<SoupTag>("td", { class: "clue" });

    soupClues.forEach((answer, i) => {
      if (i < this.clues.length) {
        this.clues[i].addAnswer(answer);
      }
    });
  }

  printRound() {
    for (const question of this.clues) {
      console.log("");
      console.log(question.category);
      console.log(question.value);
      console.log(question.clue);
      console.log(question.answer);
      console.log(question.order);
    }
  }

  getCategories() {
    const categories = new Map<string, number>();

    let numCategories = 0;
    for (const clue of this.clues) {
      if (!categories.has(clue.category)) {
        categories.set(clue.category, numCategories);
        numCategories++;
      }
    }

    return categories;
  }

  jsonify(): Board {
    const categories = this.getCategories();

    const jsonData: Board = {
      categoryNames: this.categories,
      categories: this.categories.map((c) => ({
        name: c,
        clues: [],
      })),
    };

    for (const clue of this.clues) {
      const categoryIdx = categories.get(clue.category);
      if (categoryIdx !== undefined) {
        const clueDict = {
          category: clue.category,
          value: clue.value,
          clue: clue.clue,
          answer: clue.answer!,
          order: clue.order,
        };
        jsonData.categories[categoryIdx].clues.push(clueDict);
      }
    }
    return jsonData;
  }
}

class SoupClue {
  clue: string;
  category: string;
  value: number;
  order: number;
  answer?: string;
  isDailyDouble: boolean;

  constructor(clueSoup: JSSoup, category: string) {
    // Identify Clue Text and Category
    try {
      const soupText = clueSoup.find<SoupTag>(undefined, {
        class: "clue_text",
      })?.text;
      if (!soupText) {
        throw new Error("could not find class clue_text on page");
      }
      this.clue = soupText;
    } catch (error: unknown) {
      // AttributeError
      this.clue = "Unrevealed";
    }
    this.category = category;

    // Find Clue Value
    try {
      const valueStr = clueSoup
        .find<SoupTag>(undefined, { class: "clue_value" })
        ?.text.slice(1);
      this.value = parseInt(valueStr ?? "");
      this.isDailyDouble = false;
    } catch (error: unknown) {
      // AttributeError
      this.value = 0;
      this.isDailyDouble = true;
    }

    // Find Order of Clue in Round
    try {
      const orderStr = clueSoup.find<SoupTag>(undefined, {
        class: "clue_order_number",
      })?.text;
      this.order = parseInt(orderStr ?? "");
    } catch (error: unknown) {
      // AttributeError
      this.order = 100;
    }
  }

  addAnswer(answerSoup: JSSoup) {
    try {
      const soupResult = answerSoup.find<SoupTag>(undefined, {
        class: "correct_response",
      })?.text;
      if (!soupResult) {
        throw new Error("could not find class correct_response on page");
      }
      this.answer = soupResult;
    } catch (error: unknown) {
      // AttributeError
      this.answer = "Mystery";
    }
  }
}
