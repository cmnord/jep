import type { host as en } from "../en/host";
import type { Dictionary } from "../types";

/** Ukrainian messages: the host role (feature 22). */
export const host: Dictionary<typeof en> = {
  "host.badge": "Ведучий: {name}",
  "host.badgeYou": "Ви ведучий",
  "host.claim": "Вести гру",
  "host.claimHelp":
    "Ведучий не грає: він бачить відповіді, оцінює те, що гравці кажуть уголос, і веде гру.",
  "host.seatTaken": "Цю гру веде {name}.",
  "host.stop": "Більше не вести",
  "host.stopHelp": "Гравці знову самі позначатимуть свої відповіді.",
  "host.answer": "Відповідь",
  "host.answerHidden": "Відповідь з’явиться, коли питання завершиться.",
  "host.isAnswering": "Відповідає {name}",
  "host.secretAnswering": "Кіт у мішку: відповідає {name}",
  "host.right": "Правильно",
  "host.wrong": "Неправильно",
  "host.rightFor": "Правильно: {name}",
  "host.wrongFor": "Неправильно: {name}",
  "host.pickAuto": "Вибір перевіряється автоматично.",
  "host.judgeFinal": "Оцініть кожну відповідь:",
  "host.finalWriting": "Гравці пишуть відповіді:",
  "host.noAnswerYet": "Відповіді ще немає",
  "host.judgedRight": "Правильно",
  "host.judgedWrong": "Неправильно",
  "host.chooseFor":
    "{name} обирає наступне питання — ви можете обрати його замість гравця.",
  "host.startRoundHelp": "Почніть раунд, коли всі будуть готові.",
  "host.waitingForPlayers": "Чекаємо на гравців.",
  "host.timeUp": "Час вийшов: зараховано як неправильну.",
  "host.player.youAnswer":
    "Ваша черга: скажіть відповідь уголос. Ведучий її оцінить.",
  "host.player.answering": "Відповідає {name} — ведучий оцінить відповідь.",
  "host.player.judging": "Ведучий оцінює відповіді.",
  "host.player.yourAnswerSent": "Ваша відповідь: {answer}",
  "host.player.revealing": "Зараз буде відповідь…",
  "host.player.hostStarts": "Раунд починає ведучий.",
  "host.player.hostMovesOn": "Ведучий переходить до наступного питання.",
  "host.panel.open": "Керування ведучого",
  "host.panel.title": "Керування ведучого",
  "host.panel.description":
    "Допоможіть, коли гравець застряг. Усі бачать, що ви змінюєте.",
  "host.toast.score": "Ведучий: {name} {amount}",
  "host.toast.skipped": "Ведучий пропустив питання.",
  "host.skipped": "Ведучий пропустив це питання.",
  "host.admin.seat": "Місце ведучого",
  "host.admin.none": "Ведучого немає: гравці самі позначають свої відповіді.",
  "host.admin.is": "Гру веде {name}.",
  "host.admin.take": "Стати ведучим",
  "host.admin.free": "Звільнити місце ведучого",
  "host.admin.makeHost": "Зробити {name} ведучим",
  "host.admin.watchers": "Дивляться (не грають):",
  "host.admin.noWatchers": "Більше ніхто не дивиться.",
  "host.admin.betweenQuestions":
    "Місце ведучого змінюється між питаннями (замінити ведучого можна будь-коли).",
};
