// ONE realistic, hardcoded repo summary used as the project context fixture.
// Sample project: a Flutter cross-platform messenger app ("Whisp").
// In the real product this would be generated from a GitHub repo scan; here it
// is a static fixture so the generation core can be validated in isolation.
export const repoSummary = `PROJECT: Whisp — cross-platform messenger
PLATFORMS: iOS, Android, Web, macOS (single Flutter codebase)

STACK:
- Flutter 3.22 / Dart 3.4
- State management: Riverpod 2.x (riverpod_generator, code-gen providers)
- Navigation: go_router 14.x (declarative routes, ShellRoute for tab shell)
- Backend: Firebase (Auth, Cloud Firestore, Cloud Storage, Cloud Messaging)
- Realtime: Firestore snapshot streams; typing indicators via presence docs
- Local cache: Drift (SQLite) for offline message history
- Models/serialization: freezed + json_serializable
- Networking (non-Firebase): dio (link previews, GIF search)
- i18n: flutter_localizations + intl (.arb files: en, ru, es)
- Testing: flutter_test, mocktail; integration_test for E2E

ARCHITECTURE: feature-first folders, each feature has data/ domain/ presentation/.
Repositories abstract Firebase behind interfaces; Riverpod providers expose them.

FILE TREE (abridged):
lib/
  main.dart                         # bootstrap, ProviderScope, Firebase.init
  app.dart                          # MaterialApp.router, theme, locale wiring
  router/
    app_router.dart                 # go_router config, ShellRoute, guards
    routes.dart                     # route name + path constants
  core/
    theme/app_theme.dart            # light/dark ThemeData, color scheme
    errors/failure.dart             # Failure sealed classes
    utils/result.dart               # Result<T> wrapper for repo calls
    network/dio_client.dart         # configured dio instance + interceptors
  features/
    auth/
      data/auth_repository.dart       # FirebaseAuth wrapper, phone + Google
      domain/auth_user.dart           # freezed AuthUser model
      presentation/login_screen.dart  # phone/Google sign-in UI
      presentation/auth_controller.dart # Riverpod AsyncNotifier
    chat/
      data/chat_repository.dart       # Firestore messages CRUD + streams
      data/message_dao.dart           # Drift DAO for offline cache
      domain/message.dart             # freezed Message (text/image/voice)
      domain/chat.dart                # freezed Chat (1:1 + group)
      presentation/chat_list_screen.dart   # conversations list
      presentation/chat_screen.dart        # message thread + composer
      presentation/widgets/message_bubble.dart
      presentation/widgets/composer.dart   # text input, attach, send
      presentation/chat_controller.dart    # paginates, sends, marks read
    profile/
      data/profile_repository.dart
      presentation/profile_screen.dart
    settings/
      presentation/settings_screen.dart    # theme, language, notifications
  l10n/
    app_en.arb  app_ru.arb  app_es.arb
test/
  features/chat/chat_controller_test.dart
  features/auth/auth_controller_test.dart

KEY FILES (notes):
- chat_repository.dart: paginated message queries (limit 30, startAfter cursor),
  writes go to Firestore then mirror into Drift; has a known TODO about
  duplicate messages when offline writes resync.
- chat_controller.dart: Riverpod AsyncNotifier; holds message list state,
  optimistic send (adds local pending message before server ack).
- composer.dart: ~400 lines, mixes attachment picking, recording, and send
  logic in one widget — flagged for refactor.
- app_router.dart: redirect guard reads authStateProvider; unauthenticated
  users are sent to /login.
- message_bubble.dart: renders text/image/voice; image uses cached_network_image.

CONVENTIONS:
- All async repo methods return Result<T> (never throw to the UI layer).
- Providers are code-generated (@riverpod); run build_runner after model edits.
- Strings must come from .arb files (no hardcoded user-facing text).
- Prefer freezed models; no plain mutable classes for domain entities.`;
