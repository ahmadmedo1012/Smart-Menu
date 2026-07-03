---
created: 2026-07-03
updated: 2026-07-03
---

# 📊 لوحة التحكم - Smart Menu

## 🔴 مهام قيد التنفيذ
```dataview
TABLE priority, targetDate, project
FROM "1-Projects"
WHERE status != "completed" AND contains(tags, "نوع/مهمة")
SORT priority DESC
```

## 📅 آخر 5 اجتماعات
```dataview
TABLE date, participants
FROM "5-Daily"
WHERE contains(tags, "نوع/اجتماع")
SORT date DESC
LIMIT 5
```

## 💡 أحدث الأفكار
```dataview
TABLE source, created
FROM "3-Resources"
WHERE contains(tags, "نوع/فكرة")
SORT created DESC
LIMIT 10
```

## 📈 تقدم المشروع
```dataview
TABLE 
  length(filter(rows, (r) => contains(r.tags, "حالة/مكتمل"))) AS "مكتمل",
  length(filter(rows, (r) => !contains(r.tags, "حالة/مكتمل") AND !contains(r.tags, "حالة/ملغى"))) AS "قيد التنفيذ"
FROM "1-Projects"
FLATTEN file.tasks AS task
GROUP BY project
```
