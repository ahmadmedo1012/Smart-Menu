#!/bin/bash
cd /home/ahmed/Downloads/smart-menu/src/components
find . -type f \( -name "*.tsx" -o -name "*.ts" \) | sort | while IFS= read -r f; do
  lines=$(wc -l < "$f")
  has_uc="no"; grep -q '"use client"\|'"'"'use client'"'"'' "$f" && has_uc="YES"
  has_memo="no"; grep -q 'React\.memo\|useMemo' "$f" && has_memo="YES"
  has_eb="no"; grep -qi 'ErrorBoundary\|error.*boundary\|ErrorBound' "$f" && has_eb="YES"
  has_pt="no"; grep -q 'interface.*Props\|type.*Props' "$f" && has_pt="YES"
  echo "$lines|$has_uc|$has_memo|$has_eb|$has_pt|$f"
done