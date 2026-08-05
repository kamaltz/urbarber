# Batch 10: Android Release Build & Production Packaging

## 1. Scope
Configuring Android build settings, Expo application configuration (`app.json`), assets (app icon, splash screen, adaptive icon), environment variable binding, and generating release APK/AAB build artifacts for thesis demonstration.

---

## 2. Affected Files

- `[MODIFY]` [app.json](file:///e:/app/urbarber/app.json) (Configure Android package name `com.urbarber.app`, permissions, adaptive icon, and versioning)
- `[NEW]` [eas.json](file:///e:/app/urbarber/eas.json) (Expo Application Services build profiles for development, preview, and production APK builds)
- `[MODIFY]` [package.json](file:///e:/app/urbarber/package.json) (Verify release scripts `android`, `check`, `doctor`)

---

## 3. Acceptance Criteria

1. `app.json` contains valid Android package name `com.urbarber.app`, scheme `urbarber`, and asset paths.
2. `eas.json` defines preview and production profiles with `developmentClient: false` and `distribution: "internal"`.
3. Standalone Android release build generates a working APK that installs on physical Android devices.
4. Application launches cleanly, displays splash screen, connects to live Firebase/Supabase environment, and executes all 30 thesis features.

---

## 4. Validation Commands

Execute the following commands in the workspace root:
```bash
npm run check
npm run doctor
git diff --check
```

---

## 5. Manual User Actions

- MANUAL ACTION REQUIRED: Trigger EAS build command `npx eas build --platform android --profile preview --local` or via EAS cloud build service.
- MANUAL ACTION REQUIRED: Install generated `.apk` file on test physical Android device and verify runtime execution.

---

## 6. Rollback Notes

If Android build fails:
1. Revert changes to `app.json` and `package.json` using `git checkout HEAD -- app.json package.json`.
2. Inspect EAS build log file for missing native credentials or asset resolution issues.
