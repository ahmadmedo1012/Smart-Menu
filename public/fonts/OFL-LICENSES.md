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
| **IBM Plex Serif** | `plex-serif-{400,500}-italic-latin.woff2` | Copyright © 2017 IBM Corp. (Reserved Font Name "Plex") — <https://github.com/IBM/plex> | SIL OFL 1.1 |
| **Cairo** (web fallback) | `cairo-arabic.woff2` · `cairo-latin.woff2` · `cairo-latin-ext.woff2` | Copyright 2016 The Cairo Project Authors — <https://github.com/googlefonts/cairo> | SIL OFL 1.1 |
| **Readex Pro** (web fallback) | `readex-pro.woff2` · `readex-pro-latin.woff2` | Copyright 2021 The Readex Pro Project Authors — <https://github.com/ThomasJockin/ReadexPro> | SIL OFL 1.1 |
| **Noto Naskh Arabic** (web fallback + `.font-naskh`) | `noto-naskh-arabic.woff2` · `noto-naskh-arabic-latin.woff2` | Copyright 2015-2021 The Noto Project Authors — <https://github.com/notofonts/arabic> | SIL OFL 1.1 |

The font **names** are reserved per OFL §1 (Reserved Font Name): modified
subsets served here keep their original family names because no glyph/behavior
changes were made — only subsetting (unicode-range splits) and format
conversion (TTF→woff2), which the OFL permits.
