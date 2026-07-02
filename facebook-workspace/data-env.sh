#!/usr/bin/env bash
# Smart-Link Meta Configuration — source this file
# Usage: source data-env.sh

# ─── Discovered Values ───
export META_USER_ID="61553916910057"
export META_USER_NAME="Markaz Ahmed"
export META_PRIMARY_PAGE_ID="1235690416285843"
export META_PRIMARY_PAGE_NAME="Smart Link-الربط الذكي"
export META_GAMING_PAGE_ID="502352372970389"
export META_GAMING_PAGE_NAME="GameBox / جيم بوكس"
export META_BUSINESS_ID="1414660969553894"
export META_AD_ACCOUNT_ID="659787046865664"
export META_AD_ACCOUNT_NAME="GameBox Ads"
export META_BUSINESS_URL="https://business.facebook.com/latest/home?business_id=1414660969553894"
export META_SMART_LINK_URL="https://www.facebook.com/profile.php?id=61591502614404"
export META_GAMEBOX_URL="https://www.facebook.com/GameBoxLibya"

# ─── Placeholders — get these from Developer App ───
export META_APP_ID="<create_app@developers.facebook.com>"
export META_APP_SECRET="<create_app@developers.facebook.com>"
export META_USER_ACCESS_TOKEN="<after_app_creation>"
export META_PAGE_ACCESS_TOKEN="<after_user_token>"

echo "Meta config loaded. Pages: $META_PRIMARY_PAGE_NAME + $META_GAMING_PAGE_NAME"
