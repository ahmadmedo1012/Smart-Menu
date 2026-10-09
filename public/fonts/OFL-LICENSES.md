# Font Licenses (SIL Open Font License 1.1)

The woff2 subsets served from `public/fonts/` (via `fonts.css`) and the TTFs
bundled in the mobile app (via the `@expo-google-fonts/ibm-plex-sans-arabic`
npm package, registered through the `expo-font` plugin in `mobile/app.json`)
are redistributed under the **SIL Open Font License, Version 1.1** — which
explicitly permits bundling, redistribution and embedding, and requires that
the license accompany the font when redistributed.

Full license text: <https://openfontlicense.org/open-font-license-official-text/>
(also at <https://scripts.sil.org/OFL>).

| Family | Files here | Copyright / attribution | License |
|---|---|---|---|
| **IBM Plex Sans Arabic** (primary brand face) | `plex-sans-arabic-{400,500,600,700}-normal-{arabic,latin}.woff2` (web) + `@expo-google-fonts/ibm-plex-sans-arabic` 400–700 (mobile) | Copyright © 2017 IBM Corp. (Reserved Font Name "Plex") — <https://github.com/IBM/plex> | SIL OFL 1.1 |
| **IBM Plex Mono** | `plex-mono-{400,500}-normal-latin.woff2` | Copyright © 2017 IBM Corp. (Reserved Font Name "Plex") — <https://github.com/IBM/plex> | SIL OFL 1.1 |

<!-- r132 (A3 §1.3): the never-fetched fallback families — IBM Plex Serif
     (italic 400/500), Cairo ×3, Readex Pro ×2, Noto Naskh Arabic ×2 — were
     deleted from public/fonts (zero rendered-stack consumers; 285KB of
     deploy weight). Their OFL rows are retired with the files; the license
     obligations above cover every woff2 actually redistributed now. -->

The font **names** are reserved per OFL §1 (Reserved Font Name): modified
subsets served here keep their original family names because no glyph/behavior
changes were made — only subsetting (unicode-range splits) and format
conversion (TTF→woff2), which the OFL permits.
