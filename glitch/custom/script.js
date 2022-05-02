const gameUrl = document.getElementById("game-url");

const boardDataArray = [];

for (let i = 1; i <=5; i++) {
  boardDataArray.push({
    categoryName: "",
    answerQuestions: [
      {
        answer: "",
        question: ""
      },
      {
        answer: "",
        question: ""
      },
      {
        answer: "",
        question: ""
      },
      {
        answer: "",
        question: ""
      },
      {
        answer: "",
        question: ""
      },
    ]
  })
}

let boardData = boardDataFromArray(boardDataArray);


for (let i = 1; i <=5; i++) {
  const category = boardDataArray[i - 1]
  const categoryInput = document.getElementById(`category-${i}`);
  categoryInput.addEventListener("input", event => {
    category.categoryName = event.target.value;
    boardDataFromArray(boardDataArray);
  });
  
  const amounts = ["200", "400", "600", "800", "1000"];
  for (let a in amounts) {
    
    const answerInput = document.getElementById(`cat-${i}-answer-${amounts[a]}`);
    const questionInput = document.getElementById(`cat-${i}-question-${amounts[a]}`);
    const bdaq = category.answerQuestions[a];
    
    answerInput.addEventListener("input", event => {
      bdaq.answer = event.target.value;
      boardDataFromArray(boardDataArray);
    })
    questionInput.addEventListener("input", event => {
      bdaq.question = event.target.value;
      boardDataFromArray(boardDataArray);
    })
    
  }
}



function boardDataFromArray(boardDataArray) {
  const boardData = {};
  boardDataArray.forEach(category => {
    boardData[category.categoryName] = [];
    category.answerQuestions.forEach(qa => {
      const item = {
        // These property names are confusing, sorry
        clue: qa.answer,
        answer: qa.question
      }
      boardData[category.categoryName].push(item);
    })
  })
  updateGameUrl(boardData);
}

function updateGameUrl(boardData) {
  const hash = btoa(JSON.stringify(boardData));
  const baseUrl = "https://three-caramel-macadamia.glitch.me/"
  const fullUrl = `${baseUrl}#custom=${hash}`
  gameUrl.innerHTML = "Click Here";
  gameUrl.href = fullUrl;
}