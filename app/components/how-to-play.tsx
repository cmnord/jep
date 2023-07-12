export default function HowToPlay() {
  return (
    <div className="mb-4 rounded-md bg-yellow-100 p-3 shadow-md">
      <p className="mb-2 font-handwriting text-3xl font-black text-yellow-900">
        How to Play
      </p>
      <ul className="text-sm leading-relaxed text-yellow-700">
        <li>
          <span className="text-lg">🎧</span> Join a voice call together
        </li>
        <li>
          <span className="text-lg">👉</span> Choose the clue when you have
          board control
        </li>
        <li>
          <span className="text-lg">👀</span> Wait until the buzzer opens
        </li>
        <li>
          <span className="text-lg">🚨</span> Buzz in when you know the answer
        </li>
        <li>
          <span className="text-lg">🗣️</span> Fastest buzzer guesses out loud on
          the call
        </li>
        <li>
          <span className="text-lg">🙊</span> Fastest buzzer checks the correct
          answer privately (don't say it!)
        </li>
        <li>
          <span className="text-lg">⚡</span> Swoop in when others are wrong
        </li>
        <li>
          <span className="text-lg">⚖️</span> Wager carefully on hidden Double
          Down clues
        </li>
      </ul>
    </div>
  );
}
