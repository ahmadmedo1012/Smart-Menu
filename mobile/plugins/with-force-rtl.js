// r119-B2-M (S6 P1 / roadmap G6): build-time RTL — the flagship first-launch fix.
//
// I18nManager.forceRTL(true) in src/app/App.tsx writes a persisted native
// preference that is only READ AT NATIVE PROCESS START. On a first-ever launch
// (English-locale phone — common in LY) the native window, splash and Yoga
// layout are already LTR; the JS-bundle call is one launch too late by design
// and the app needs a restart to look right. This plugin moves the decision to
// BUILD time so the very first frame of the very first launch is RTL:
//
//   Android: <application android:layoutDirection="rtl"> (cascades to every
//            activity; read when the window is created, before any JS runs).
//            android:supportsRtl stays "true" (prebuild template default —
//            re-asserted here so it can never regress).
//   iOS:     drop "en" from CFBundleLocalizations — an Arabic-only app on an
//            English-locale iPhone must not resolve "en" and lay out LTR on
//            frame one. "ar" is enforced (CFBundleDevelopmentRegion is already
//            "ar" in app.json). Future extra localizations are preserved; only
//            "en" is stripped, mirroring the app.json edit of this round.
//
// Registered in app.json `plugins` as "./plugins/with-force-rtl" so EAS prebuild
// keeps applying it (android/ is gitignored and fully regenerated from
// app.json + plugins — hand-editing the manifest alone would be wiped).
// The runtime forceRTL(true) in App.tsx STAYS as an idempotent safety net for
// Expo Go / dev-clients built without this plugin.
//
// NOTE: expo-updates is not installed (updates disabled), so the classic
// Updates.reloadAsync() workaround is unavailable — this plugin is the only
// clean path (S6 §1.4).

const { withAndroidManifest, withInfoPlist } = require("expo/config-plugins");

function withForceRTL(config) {
  // ── Android: force RTL layout direction on the application node (and each
  //    declared activity, belt-and-suspenders — the attribute cascades anyway).
  config = withAndroidManifest(config, (config) => {
    const application = config.modResults?.manifest?.application?.[0];
    if (application) {
      application.$["android:supportsRtl"] = "true";
      application.$["android:layoutDirection"] = "rtl";
      for (const activity of application.activity ?? []) {
        activity.$["android:layoutDirection"] = "rtl";
      }
    }
    return config;
  });

  // ── iOS: Arabic-only localizations — remove "en", guarantee "ar" present.
  config = withInfoPlist(config, (config) => {
    const plist = config.modResults;
    const locales = (plist.CFBundleLocalizations ?? []).filter((l) => l !== "en");
    if (!locales.includes("ar")) locales.unshift("ar");
    plist.CFBundleLocalizations = locales;
    return config;
  });

  return config;
}

module.exports = withForceRTL;
