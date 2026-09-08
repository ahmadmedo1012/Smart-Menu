#!/usr/bin/env bash
# r96-W2: توليد صور منيو العرض شبه الحقيقية (28 صورة: 25 صنف + شعار + غلافان)
# idempotent: يتخطى الصور الموجودة — أعد تشغيله حتى يكتمل كل شيء.
set -uo pipefail
cd /home/z/my-project

OUT=public/demo
SRC=scripts/r96-imgs-tmp
mkdir -p "$OUT" "$SRC"

# نمط موحد يلائم ثيم اللهب الداكن (SmartBot twin)
STYLE="professional food photography, dark moody background, warm ambient lighting, dark wooden table, shallow depth of field, appetizing, high quality, detailed, restaurant menu photography, no text, no words, no watermark"

gen() { # gen <file-slug> <size> <prompt>
  local slug="$1" size="$2" prompt="$3"
  local png="$SRC/$slug.png"
  if [ -s "$png" ] && [ "$(stat -c%s "$png")" -gt 20000 ]; then
    echo "[skip] $slug"
    return 0
  fi
  for attempt in 1 2 3; do
    if timeout 120 z-ai image -p "$prompt, $STYLE" -o "$png" -s "$size" >/dev/null 2>&1 && [ -s "$png" ]; then
      echo "[ok] $slug ($(stat -c%s "$png")b, attempt $attempt)"
      return 0
    fi
    echo "[retry $attempt] $slug"
    sleep 3
  done
  echo "[FAIL] $slug"
  return 1
}

# ═══ الشعار والغلاف ═══
gen logo 1024x1024 "minimalist circular café logo emblem, coffee cup with steam and palm tree silhouette, warm burnt orange and cream colors, flat design, badge style, dark background"
gen cover-interior 1344x768 "cozy modern Arabic specialty coffee shop interior, warm hanging lights, wooden coffee bar, dark ambiance, inviting atmosphere"
gen cover-barista 1344x768 "barista pouring latte art in a cozy café, warm golden light, dark moody atmosphere, close-up hands and cup"

# ═══ مشروبات ساخنة (6) ═══
gen espresso 1152x864 "double espresso shot in small white ceramic cup with thick golden crema, on dark saucer"
gen cappuccino 1152x864 "cappuccino with rosetta latte art foam in ceramic cup, cocoa dusting"
gen caramel-latte 1152x864 "caramel latte in tall glass, layered milk and espresso, caramel drizzle on foam"
gen turkish-coffee 1152x864 "Turkish coffee served in small traditional cup with copper cezve pot, Turkish delight beside"
gen mint-tea 1152x864 "green tea with fresh mint leaves in tall clear glass, steam rising"
gen hot-chocolate 1152x864 "hot chocolate with whipped cream swirl and cocoa powder dusting, marshmallows"

# ═══ مشروبات باردة (5) ═══
gen iced-coffee 1152x864 "iced coffee with cream cascading through coffee ice cubes in tall glass, condensation"
gen mint-lemonade 1152x864 "fresh mint lemonade in frosted tall glass, lemon slice and mint sprig garnish, ice cubes"
gen mango-smoothie 1152x864 "thick mango smoothie in tall glass topped with fresh mango cubes, golden color"
gen mojito 1152x864 "classic mojito with mint leaves, lime wedges and soda bubbles in highball glass, condensation drops"
gen orange-juice 1152x864 "freshly squeezed orange juice in glass with orange halves beside, vibrant color"

# ═══ الحلويات (5) ═══
gen cheese-kunafa 1152x864 "kunafa with cheese, golden crispy shredded pastry, sugar syrup drizzle, crushed pistachios on top, served on round plate"
gen cheesecake 1152x864 "classic New York cheesecake slice with berry compote and fresh berries on top"
gen chocolate-cake 1152x864 "rich chocolate fudge cake slice with glossy molten chocolate dripping"
gen nutella-crepe 1152x864 "folded crepe with Nutella spread, banana slices, powdered sugar dusting"
gen basbousa 1152x864 "basbousa semolina cake squares with almond center, coconut sprinkle, syrup glaze, diamond cut"

# ═══ وجبات خفيفة (5) ═══
gen oasis-burger 1152x864 "gourmet double beef burger with melted cheddar, caramelized onions, fresh lettuce, glossy brioche bun, served with fries"
gen tuna-sandwich 1152x864 "tuna sandwich on toasted artisan bread with fresh greens and tomato slices, cut diagonally"
gen fries 1152x864 "golden crispy french fries in serving basket with garlic dipping sauce"
gen caesar-salad 1152x864 "caesar salad with romaine lettuce, parmesan shavings, croutons, grilled chicken strips"
gen chicken-shawarma 1152x864 "chicken shawarma wrap cut open showing filling, garlic sauce drizzle, pickles, on parchment paper"

# ═══ الفطور (4) ═══
gen oasis-breakfast 1152x864 "Libyan breakfast spread, fava beans ful medames, fried eggs, warm flatbread, olives, cheese, small plates"
gen butter-croissant 1152x864 "golden flaky butter croissant on wooden board, soft butter beside, layer detail"
gen avocado-toast 1152x864 "avocado toast with poached egg, chili flakes, microgreens on sourdough bread"
gen honey-pancakes 1152x864 "stack of fluffy pancakes with honey drizzle, butter pat melting, honey dipper"

echo "───"
echo "PNG count: $(ls $SRC/*.png 2>/dev/null | wc -l)/28"
