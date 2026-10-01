# Development

Expo SDK 57 · React Native 0.86 · Node 22 · npm.

## Expo Go or a development build?

**Expo Go is sufficient for the current dependency set.** Every native module in use (Reanimated, Worklets, Gesture Handler, Screens, Safe Area, SVG) ships inside Expo Go for SDK 57. Uniwind, HeroUI Native and `@gorhom/bottom-sheet` are JavaScript. `expo-doctor` and `expo install --check` pass.

**Move to a development build** (`expo-dev-client`) when the first of these arrives:

- Remote push notifications (e.g. "you have been called"), which is likely for the queue
- A native module not in Expo Go (e.g. `react-native-mmkv`, `react-native-keyboard-controller`)
- Testing the real app icon, splash screen, app links or config plugins

Prefer **local** development builds (free). EAS cloud builds use paid build minutes: ask before triggering one.

## Commands

```bash
# Install (clean checkout)
npm ci

# Start Metro (Expo Go: scan the QR code, or press a / i)
npm start

# Android emulator or connected device (Expo Go)
npm run android

# iOS simulator (macOS only; on Linux, use Expo Go on a physical iPhone via npm start)
npm run ios

# Static checks
npm run lint            # ESLint, zero warnings allowed
npm run typecheck       # tsc --noEmit
npm run format:check    # Prettier
npm run check           # all three

# Dependency validation
npm run doctor          # npx expo-doctor
npm run deps:check      # npx expo install --check (versions match the SDK)

# Add an Expo-managed or native dependency (resolves SDK-compatible versions)
npx expo install <package>
```

## Local development build (later)

```bash
npx expo install expo-dev-client
npx expo run:android            # needs the Android SDK (ANDROID_HOME) and JDK 17
npx expo run:ios                # macOS + Xcode only
npx expo start --dev-client
```

`run:*` generates `android/` and `ios/` locally. They are gitignored (Continuous Native Generation): configure native behavior through `app.json` and config plugins, not by editing those folders. Set `android.package` and `ios.bundleIdentifier` in `app.json` before the first native build.

## Machine notes

- This workstation is Linux: no local iOS builds.
- JDK 17 and `adb` are present. The Android SDK is not installed (`ANDROID_HOME` unset). Install Android Studio for an emulator or `expo run:android`, or use Expo Go on a physical Android device.
