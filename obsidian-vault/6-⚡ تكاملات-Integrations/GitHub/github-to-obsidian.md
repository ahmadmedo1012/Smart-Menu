---
title: "سحب GitHub Issues"
type: reference
tags:
  - نوع/script
  - حالة/معلق
created: 2026-07-03
---

# سحب GitHub Issues إلى Obsidian

## المتطلبات
- GitHub CLI (`gh`) منصب ومسجل دخول
- QuickAdd plugin في Obsidian — http://localhost:27748/api

## الاستخدام
شغل السكربت من الطرفية:

```bash
# سحب الـ issues المفتوحة من المشروع
gh issue list --repo ahmadmedo1012/Smart-Menu --state open --json number,title,labels,body,createdAt --limit 20 | node /absolute/path/to/github-to-obsidian.js
```

## السكربت (`6-تكاملات-Integrations/GitHub/github-to-obsidian.js`)

```javascript
const fs = require('fs');
const path = require('path');

const inboxDir = '/home/ahmed/Downloads/smart-menu/obsidian-vault/0-📥 صندوق-الوارد-Inbox';
const issues = JSON.parse(fs.readFileSync('/dev/stdin', 'utf8'));

issues.forEach(issue => {
  const labels = (issue.labels || []).map(l => l.name).join(', ');
  const slug = issue.title
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60);
  
  const content = `---
title: "GH#${issue.number}: ${issue.title}"
type: task
source: github
tags:
  - نوع/issue
  - حالة/معلق
project: Smart Menu
created: ${issue.createdAt}
---

# GH#${issue.number}: ${issue.title}

**Labels:** ${labels}

**Body:**
${issue.body || '_No description_'}

**Actions:**
- [ ] معالجة
- [[صندوق-الوارد]]
`;

  fs.writeFileSync(path.join(inboxDir, `issue-${issue.number}-${slug}.md`), content);
});

console.log(`Imported ${issues.length} issues`);
```
