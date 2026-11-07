import type { upload as en } from "../en/upload";
import type { Dictionary } from "../types";

/** Ukrainian messages: upload. */
export const upload: Dictionary<typeof en> = {
  "upload.uploadOrImport": "Завантажити або імпортувати гру",
  "upload.invalidFileType": "Непідтримуваний тип файлу",
  "upload.dropFileHere": "Перетягни файл сюди",
  "upload.hint": "Гра Jep! (.jep.json) або пакет SIGame (.siq, до 100 МБ)",
  "upload.help": "Як завантажити гру",
  "upload.confirmPublic": "Завантажити публічно?",
  "upload.confirmPublicDescription":
    "Завантажити гру «{name}» у публічний доступ?",
  "upload.unknownFile": "без назви",
  "upload.guestWarning":
    "Як гість ти не зможеш потім редагувати чи видалити цю гру.",
  "upload.cancel": "Скасувати",
  "upload.guidelines":
    "Ігри мають відповідати <link>правилам спільноти</link>.",
  "upload.uploadPublicly": "Завантажити публічно",
  "upload.importingSiq": "Імпортуємо пакет SIGame…",
  "upload.uploading": "Завантажуємо…",
  "upload.createdPublic":
    "Нову публічну гру створено. Її вже видно на головній сторінці.",
  "upload.createdUnlisted":
    "Нову гру, доступну за посиланням, створено. Щоб зіграти, відкрий {url}",
  "upload.error.prefix": "Не вдалося завантажити гру: {reason}",
  "upload.error.noGameKey": "сервер не повернув ідентифікатор гри.",
  "upload.error.tooLarge":
    "файл завеликий (пакети SIGame — до 100 МБ, ігри JSON — до 1 МБ).",
  "upload.error.unsupported":
    "Непідтримуваний файл. Завантаж гру Jep! (.jep.json) або пакет SIGame (.siq).",
  "upload.error.jsonTooLarge": "Гра у форматі JSON має бути не більша за 1 МБ.",
  "upload.progress.importingTitle": "Імпортуємо пакет…",
  "upload.progress.savingTitle": "Зберігаємо гру…",
  "upload.progress.uploadingHint": "Не закривай цю сторінку.",
  "upload.progress.importingHint":
    "Обробляємо медіафайли — великі пакети можуть імпортуватися до хвилини. Не закривай цю сторінку.",
  "upload.progress.savingHint": "Майже готово.",
  "upload.progress.bytes": "{loaded} з {total}",
  "upload.progress.barLabel": "Хід завантаження",
  "upload.progress.processingLabel": "Обробка на сервері",
  "upload.progress.cancel": "Скасувати завантаження",
  "upload.progress.announceUploading": "Завантажуємо {name}…",
  "upload.progress.announceImporting": "Файл завантажено. Імпортуємо пакет…",
  "upload.progress.announceSaving": "Файл завантажено. Зберігаємо гру…",
  "upload.progress.announceCanceled": "Завантаження скасовано.",
  "upload.retry": "Спробувати ще раз",
  "upload.error.network":
    "Не вдалося завантажити гру: зв’язок обірвався. Перевір підключення до інтернету й спробуй ще раз.",
  "upload.error.server":
    "Не вдалося завантажити гру: сервер відповів помилкою {status}. Спробуй ще раз пізніше.",
};
