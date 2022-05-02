const gameUrl = document.getElementById("game-url");
const datePicker = document.getElementById("date-picker");

const baseUrl = "https://jeopardy-remixable-app.glitch.me/#date="
let round = 1;
let year = "2000";
let month = "01";
let day = "03";

const defaultGameUrl = `${baseUrl}${year}-${month}-${day}R${round}`

gameUrl.innerHTML = defaultGameUrl;
gameUrl.href = defaultGameUrl;

console.log(gameUrl)


datePicker.addEventListener("change", event => {
  const d = event.target.value;
  year = d.slice(0, 4);
  month = d.slice(5, 7);
  day = d.slice(8, 10);
  gameUrl.innerHTML = `${baseUrl}${year}-${month}-${day}R${round}`;
  gameUrl.href = `${baseUrl}${year}-${month}-${day}R${round}`;
});