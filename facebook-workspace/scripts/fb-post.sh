#!/usr/bin/env bash
# fb-post.sh — Post a message to a Facebook page
# Usage: fb-post.sh <page_id> <message_text> [image_path]

PAGE_ID="${1}"
MESSAGE="${2}"
IMAGE="${3}"

if [ -z "$PAGE_ID" ] || [ -z "$MESSAGE" ]; then
  echo "Usage: fb-post.sh <page_id> <message_text> [image_path]"
  exit 1
fi

# Navigate to page and use Business Suite create post
PAGE_URL=""
case "$PAGE_ID" in
  "1235690416285843") PAGE_URL="https://www.facebook.com/profile.php?id=61591502614404" ;;
  "502352372970389")  PAGE_URL="https://www.facebook.com/GameBoxLibya" ;;
  *) echo "Unknown page ID. Add mapping in fb-post.sh" && exit 1 ;;
esac

echo "Navigate to $PAGE_URL and click 'Create Post'"
echo "Message: $MESSAGE"
echo "Image: ${IMAGE:-none}"
echo ""
echo "POST THIS TO FACEBOOK:"
echo "---"
echo "$MESSAGE"
echo "---"
