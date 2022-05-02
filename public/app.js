const generateCategory = category => {
  const categoryElement = document.createElement('div');
  categoryElement.classList.add('category');
  categoryElement.textContent = category;
  return categoryElement;
};

const generateQuestion = (question, index) => {
  const questionElement = document.createElement('div');
  questionElement.classList.add('question');
  questionElement.dataset.answer = question.answer;
  questionElement.dataset.clue = question.clue;
  questionElement.textContent = `$${200 * (index + 1)}`;
  return questionElement;
};

const generateColumn = ([category, questions]) => {
  const categoryElement = generateCategory(category);
  const questionElements = questions.map(generateQuestion);
  return [categoryElement, ...questionElements];
};

const isAQuestion = element => element.classList.contains('question');
const isAnswered = element => element.classList.contains('is-answered');
const prompt = document.getElementById('prompt');
const handleClick = (event) => {
  const target = event.target;
  if (isAQuestion(target) && !isAnswered(target)) {
    target.classList.add('is-active');
    prompt.classList.add('is-active');
    prompt.innerText = target.dataset.clue;
  } else if (target === prompt) {
    const activeQuestion = document.querySelector('.question.is-active');
    prompt.classList.remove('is-active');
    activeQuestion.classList.remove('is-active');
    activeQuestion.classList.add('is-answered');
    activeQuestion.innerText = activeQuestion.dataset.answer;
  }
};

const init = async () => {
  let questions;
  if (!window.location.hash){
    const response = await fetch('/questions.json');
    questions = await response.json();
  } else {
    const hash = window.location.hash;
    questions = await parseHash(hash);
  }
  const columns = Object.entries(questions).map(generateColumn);
  const content = [].concat(...columns).reduce((fragment, element) => {
    fragment.appendChild(element);
    return fragment;
  }, document.createDocumentFragment());

  const board = document.getElementById("board");
  board.appendChild(content);
  document.body.addEventListener('click', handleClick);
};

init();



async function parseHash(hash) {
  let hashStart;
  if (hash.slice(1, 7) === "custom") {
    hashStart = 8;
  } else if (hash.slice(1, 5) === "date") {
    const year = hash.slice(6, 10);
    const month = hash.slice(11, 13);
    const day = hash.slice(14, 16);
    const round = hash.slice(17, 18);
    const apiUrl = `https://jarchive-json.glitch.me/glitch/${month}/${day}/${year}/${round}`;
    const proxyUrl = 'https://cors-anywhere.herokuapp.com/'
    const response = await fetch(proxyUrl + apiUrl);
    return await response.json();
  } else if (hash.slice(1, 7) === "random") {
    let valid = false;
    let dateQuestions, year, month, day, round;
    while (!valid) {
      year = 1999 + Math.ceil(Math.random() * 20);
      month = Math.ceil(Math.random() * 12);
      if (month < 10) {
        month = "0" + month;
      }
      day = Math.ceil(Math.random() * 30);
      if (day < 10) {
        day = "0" + day;
      }
      round = Math.ceil(Math.random() * 2);
      const apiUrl = `https://jarchive-json.glitch.me/glitch/${month}/${day}/${year}/${round}`;
      console.log(apiUrl);
      const proxyUrl = '/proxy?url='
      const response = await fetch(proxyUrl + apiUrl);
      dateQuestions = await response.json();
      if (dateQuestions && !dateQuestions.message) {
        valid = true;
      }
    }
    alert(`Game for ${year}-${month}-${day}, round ${round}`);
    return dateQuestions
  } else {
    alert("Invalid game URL, loading default board.");
    const response = await fetch('/questions.json');
    return await response.json();
  }
  const questions = JSON.parse(atob(hash.slice(hashStart, hash.length)))
  return questions
}
