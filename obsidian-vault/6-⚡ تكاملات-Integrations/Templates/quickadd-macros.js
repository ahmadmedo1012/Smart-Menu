// QuickAdd Macro — Second Brain Hub
// 1. سحب GitHub Issues
// 2. إنشاء مراجعة أسبوعية
// 3. تفريغ صندوق الوارد

module.exports = {
  // ===== macOS/Linux: سحب Issues =====
  pullIssues: async () => {
    const { execSync } = require('child_process');
    const fs = require('fs');
    const path = require('path');

    const repo = 'ahmadmedo1012/Smart-Menu';
    const inboxDir = app.vault.adapter.basePath + '/0-📥 صندوق-الوارد-Inbox';

    try {
      const raw = execSync(`gh issue list --repo ${repo} --state open --json number,title,labels,body,createdAt --limit 20`, {
        timeout: 15000,
      });
      const issues = JSON.parse(raw.toString());

      for (const issue of issues) {
        const slug = issue.title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 60);
        const filePath = path.join(inboxDir, `issue-${issue.number}-${slug}.md`);

        if (fs.existsSync(filePath)) continue; // تجنب التكرار

        const content = `---
aliases: ["GH#${issue.number}"]
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

**Labels:** ${(issue.labels || []).map(l => l.name).join(', ') || 'none'}

**Body:**
${issue.body || '_No description_'}

- [ ] معالجة
↪ [[صندوق-الوارد]]
`;

        fs.writeFileSync(filePath, content);
      }

      new Notice(`✅ Pulled ${issues.length} issues`);
    } catch (e) {
      new Notice(`❌ GitHub pull failed: ${e.message}`);
    }
  },

  // ===== إنشاء مراجعة أسبوعية =====
  weeklyReview: async (params) => {
    const now = new Date();
    const weekNum = getWeekNumber(now);
    const filename = `مراجعة-الأسبوع-W${weekNum}.md`;
    const folder = app.vault.adapter.basePath + '/2-📂 أقسام-Areas/🔄 مراجعات-Reviews';

    // أول الفترة الجمعة 9 صباحاً
    // احسب الجمعة هذي: آخر جمعة قبل اليوم أو اليوم نفسه لو جمعة
    const friday = new Date(now);
    friday.setDate(friday.getDate() + ((5 - friday.getDay() + 7) % 7));
    if (friday > now) friday.setDate(friday.getDate() - 7);

    const content = `---
title: "مراجعة الأسبوع W${weekNum}"
type: review
tags:
  - نوع/مراجعة
  - حالة/قيد-التنفيذ
period: weekly
week: ${weekNum}
year: ${now.getFullYear()}
created: ${now.toISOString().split('T')[0]}
---

# 📅 مراجعة الأسبوع W${weekNum}

## ✅ المكتمل هذا الأسبوع
-

## 🚧 قيد التنفيذ
-

## 🛑 توقف / تأجل
-

## 🎯 أولويات الأسبوع الجاي
1.
2.
3.

## 📝 ملاحظات
-

## روابط
- [[المراجعات-الدورية]]
- [[📊 لوحة-التحكم-Dashboard]]
`;

    fs.writeFileSync(path.join(folder, filename), content);
    new Notice(`📅 Created weekly review W${weekNum}`);
  },
};

function getWeekNumber(date) {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diff = date - startOfYear + (startOfYear.getTimezoneOffset() - date.getTimezoneOffset()) * 60000;
  return Math.ceil((diff / 86400000 + startOfYear.getDay() + 1) / 7);
}
