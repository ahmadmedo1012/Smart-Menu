# Smart-Menu Maestro E2E — README (P38 Phase L)

## What's here

| Flow | File | Journey |
|---|---|---|
| Customer | `customer-menu.yaml` | Landing (demo restaurant) → menu → product detail → add to cart → cart sheet → WhatsApp handoff |

Selectors are grounded in the real screen labels at commit `cf5a5f4a`
(source lines cited in the YAML header).

## Running (real device/emulator required — not runnable in the sandbox)

```bash
adb install smart-menu-preview.apk
maestro test maestro/
```

## Honest blocker + safety rules

Same sandbox limitation as P35 (no emulator/KVM/adb/USB, no macOS):
flows are **authored but not executed** here.

Safety: the flow orders from the DEMO restaurant only (QA data); the
server re-prices every line and the demo restaurant's WhatsApp number
is the QA one. No production restaurant is touched.
