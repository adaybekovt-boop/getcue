// 12 varied developer tasks of mixed quality and language (RU/EN).
// Includes 2 deliberately vague tasks to exercise the ASSUMPTIONS rule,
// plus a bug fix, an error audit, a feature add, a refactor, and a perf task.
export const tasks = [
  {
    id: "t01",
    title: "Fix duplicate messages on offline resync",
    task:
      "There's a bug in chat_repository.dart: when the app comes back online, " +
      "messages that were sent offline sometimes appear twice in the thread. " +
      "Fix the duplication so each message appears exactly once after resync.",
  },
  {
    id: "t02",
    title: "Full error-handling audit of the chat feature",
    task:
      "Do a complete error-handling audit of the chat feature (data + " +
      "presentation). Find every place a Firestore or Drift call can fail " +
      "without being wrapped in Result<T> or surfaced to the user, and report " +
      "each gap with the file and a suggested fix.",
  },
  {
    id: "t03",
    title: "Add message reactions (emoji)",
    task:
      "Add emoji reactions to messages. Users should be able to long-press a " +
      "message bubble, pick from a small emoji set, and see reaction counts on " +
      "the bubble. Reactions must sync via Firestore and work in 1:1 and group chats.",
  },
  {
    id: "t04",
    title: "Refactor the composer widget",
    task:
      "composer.dart has grown to ~400 lines and mixes attachment picking, " +
      "voice recording, and send logic in one widget. Refactor it into smaller " +
      "focused widgets/controllers without changing behavior.",
  },
  {
    id: "t05",
    title: "Speed up chat list scrolling",
    task:
      "The conversations list (chat_list_screen.dart) janks while scrolling on " +
      "older Android devices. Improve scroll performance. Keep the current UI " +
      "and data exactly as they are.",
  },
  {
    id: "t06",
    title: "почини мой апп",
    task: "почини мой апп он чёт глючит",
  },
  {
    id: "t07",
    title: "сделай красиво",
    task: "сделай красиво экран чата",
  },
  {
    id: "t08",
    title: "Add Spanish review pass for i18n",
    task:
      "Мы добавили испанский язык (app_es.arb). Нужно убедиться, что во всём " +
      "приложении нет захардкоженных строк и все пользовательские тексты идут " +
      "через .arb файлы. Составь список нарушений с указанием файла.",
  },
  {
    id: "t09",
    title: "Add typing indicator to chat screen",
    task:
      "Add a 'typing…' indicator at the bottom of chat_screen.dart that shows " +
      "when the other participant is typing, using the existing presence docs " +
      "in Firestore. It should disappear after they stop typing for 3 seconds.",
  },
  {
    id: "t10",
    title: "Migrate message pagination to keyset cursor",
    task:
      "Refactor message pagination in chat_repository.dart and chat_controller.dart " +
      "to use a clean keyset (startAfterDocument) cursor approach, removing any " +
      "offset-style logic, while keeping the page size of 30.",
  },
  {
    id: "t11",
    title: "Добавить тёмную тему для экрана настроек",
    task:
      "На экране настроек (settings_screen.dart) есть переключатель темы, но " +
      "тёмная тема применяется не везде. Сделай так, чтобы весь экран настроек " +
      "корректно отображался в тёмной теме согласно app_theme.dart.",
  },
  {
    id: "t12",
    title: "Write tests for chat_controller optimistic send",
    task:
      "Write unit tests (flutter_test + mocktail) for the optimistic send logic " +
      "in chat_controller.dart: a pending local message is added immediately, " +
      "then reconciled or rolled back depending on the server response.",
  },
];
