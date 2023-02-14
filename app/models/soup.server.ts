// https://glitch.com/~jarchive-json
import { fetch } from "@remix-run/node";
import JSSoup, { SoupTag } from "jssoup";

export class SoupGame {
  private jArchive_Board_URL?: string;
  private jArchive_Responses_URL?: string;
  private gameDate: string;

  private j?: SoupRound;
  private dj?: SoupRound;
  private fj?: FinalSoup;

  constructor(month: string, day: string, year: string) {
    this.gameDate = `${year}-${month}-${day}`;
    this.parseGame();
  }

  async parseGame() {
    const jArchive_Query =
      "http://www.j-archive.com/search.php?search=date%3A" + this.gameDate;
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

  jsonify() {
    if (this.j && this.dj && this.fj) {
      const jsonData = {
        jeopardy: this.j.jsonify(),
        "double jeopardy": this.dj.jsonify(),
        "final jeopardy": this.fj.jsonify(),
      };
      return jsonData;
    }
  }
}

class FinalSoup {
  private category?: string;
  private clue?: string;
  private answer?: string;

  constructor(roundSoup: JSSoup) {
    // clueSoup = roundSoup.find_all('td', class_='clue')
    this.category = roundSoup.find<SoupTag>(undefined, {
      class: "category_name",
    })?.text;
    this.clue = roundSoup.find<SoupTag>(undefined, {
      class: "clue_text",
    })?.text;
  }

  addAnswer(answerSoup: JSSoup) {
    this.answer = answerSoup.find<SoupTag>(undefined, {
      class: "correct_response",
    })?.text;
  }

  printRound() {
    console.log();
    console.log(this.category);
    console.log(this.clue);
    console.log(this.answer);
  }

  jsonify() {
    const jsonData = {
      category: this.category,
      clue: this.clue,
      answer: this.answer,
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
    answerSoup
      .findAll<SoupTag>("td", { class: "clue" })
      .forEach((answer, i) => {
        this.clues[i].addAnswer(answer);
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
    const categories = new Set<string>();
    for (const clue of this.clues) {
      if (!categories.has(clue.category)) {
        categories.add(clue.category);
      }
    }
    return categories;
  }

  jsonify() {
    const jsonData = [];
    for (const clue of this.clues) {
      const clueDict = {
        category: clue.category,
        value: clue.value,
        clue: clue.clue,
        answer: clue.answer,
        order: clue.order,
      };
      jsonData.push(clueDict);
    }
    return jsonData;
  }
}

class SoupClue {
  clue?: string;
  category: string;
  value: number | string;
  order: number;
  answer?: string;

  constructor(clueSoup: JSSoup, category: string) {
    // Identify Clue Text and Category
    try {
      this.clue = clueSoup.find<SoupTag>(undefined, {
        class: "clue_text",
      })?.text;
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
    } catch (error: unknown) {
      // AttributeError
      this.value = "Daily Double";
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
      this.answer = answerSoup.find<SoupTag>(undefined, {
        class: "correct_response",
      })?.text;
    } catch (error: unknown) {
      // AttributeError
      this.answer = "Mystery";
    }
  }
}
