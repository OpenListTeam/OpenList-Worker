<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList هي أداة غنية بالميزات لعرض الأدلة، تدعم تركيب العشرات من الأقراص السحابية مع المعاينة والتنزيل ومشاركة الملفات والمزيد</em></p>
  <p>هذا المستودع هو المنفذ الرسمي TypeScript + Serverless لمشروع <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a></p>
  <p>يعمل على Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/build-verify.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/build-verify.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList-Worker?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/stargazers"><img src="https://img.shields.io/github/stars/OpenListTeam/OpenList-Worker?color=%23ED8936&logo=github" alt="Stars" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/forks"><img src="https://img.shields.io/github/forks/OpenListTeam/OpenList-Worker?color=%239F7AEA&logo=github" alt="Forks" /></a>

📘 [التوثيق](https://doc.oplist.org) · 🌏 [التوثيق (الصين القارية)](https://doc.oplist.org.cn)  · ⚖️ [شروط الاستخدام](https://doc.oplist.org/terms)  · 🔒 [سياسة الخصوصية](https://doc.oplist.org/privacy)

</div>

<div align="center">

[English](README_en.md) | [简体中文](../README.md) | [繁體中文](README_zh-TW.md) | [日本語](README_ja.md) | [한국어](README_ko.md) | [Français](README_fr.md) | [Deutsch](README_de.md) 

[Português](README_pt.md) | [Русский](README_ru.md) | العربية | [Italiano](README_it.md) | [हिन्दी](README_hi.md) | [Español](README_es.md)

[المشروع الأصلي](https://github.com/OpenListTeam/OpenList) · [دليل المساهمة](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CONTRIBUTING.md) · [مدونة السلوك](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CODE_OF_CONDUCT.md) · [الترخيص](./LICENSE)

[🌎 العرض العالمي](https://new.oplist.org) 　|　 [🇨🇳 عرض الصين](https://new.oplist.org.cn)

</div>

---

## النشر بنقرة واحدة

انقر فوق الزر أدناه لنشر هذا المشروع على المنصة المقابلة بنقرة واحدة:
<div align="center">


| EdgeOne Makers · دولي | EdgeOne Makers · الصين | Cloudflare Workers · عالمي | Alibaba Cloud ESA · الصين |
| :---: | :---: | :---: | :---: |
| [![النشر على EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![النشر على EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) | [![النشر على Alibaba Cloud ESA](assets/esa-deploy.svg)](https://esa.console.aliyun.com/edge/function/list) |

</div>

> [!IMPORTANT]
> - إذا عرض Cloudflare رسالة `تعذّر جلب محتوى المستودع`، [قم بعمل fork](https://github.com/OpenListTeam/OpenList-Worker/fork) لهذا المشروع أولاً ثم انشر من خلال الاتصال بمستودع Github
> - بالنسبة إلى Alibaba Cloud ESA، استورد هذا المستودع من **الحوسبة الطرفية والذكاء الاصطناعي ← الدوال وPages** في وحدة التحكم
> - اضبط `JWT_SECRET` أثناء النشر (≥16 حرفًا) لتوقيع JWT والتشفير
> - يستخدم تخزين البيانات تلقائيًا الواجهة الخلفية الدائمة للمنصة (`DB_DRIVER=auto`) — لا حاجة لأي إعداد؛ ولمتغيرات أخرى راجع [متغيرات البيئة](https://doc.oplist.org/ecosystem/official_worker/guide_env)
> - بعد النشر، يظهر **معالج التثبيت** عند أول زيارة: عيّن حساب المسؤول وكلمة المرور في المتصفح لإكمال التهيئة (اضبط `ADMIN_PASS` لتخطي المعالج)


## الميزات

OpenList هو نظام عرض وإدارة ملفات متعدد التخزين يعمل على منصات الحوسبة الطرفية. يوحّد الملفات المتناثرة عبر أقراص سحابية وتخزين كائنات وخدمات بروتوكولات مختلفة في واجهة واحدة للتصفح والمعاينة والتنزيل والإدارة.

OpenList-Worker هو المنفذ الرسمي TypeScript + Serverless لمشروع [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList). أُعيدت كتابة الواجهة الخلفية من Go إلى خدمة TypeScript تعمل على Workers، بينما تحافظ الواجهة الأمامية على واجهة وتجربة تفاعل متسقة.

### تجميع التخزين

**78 برنامج تشغيل تخزين** مدمجًا، جاهزة لتركيب خلفيات تخزين متنوعة:

- **الأقراص السحابية المحلية**: Aliyundrive (Open/Share)، Quark (Open/UC TV)، Baidu Netdisk (الألبوم)، 115 (Open/Share)، 123 Pan (Open/Share)، Tianyi Cloud (189/PC/TV)، China Mobile Cloud (139/Hecaiyun)، Wopan، Thunder، Tencent Weiyun، Lanzou، PikPak (Share)، Doubao، Guangyapan، Chaoxing Group، Lenovo NAS Share، Teambition، WPS Cloud، Alibaba Docs، HalalCloud، MediaTrack وغيرها
- **الأقراص السحابية الدولية**: Google Drive (الألبوم)، OneDrive (App/ShareLink)، Dropbox، MEGA، MediaFire، Proton Drive، Yandex Disk، Degoo، Bunny Storage، TeraBox وغيرها
- **تخزين الكائنات**: متوافق مع S3 (AWS/OSS/COS/MinIO وغيرها)، Cloudflare R2 (ربط Workers أو S3 API)، UpYun USS، Azure Blob، WebDAV، FTP، SFTP، SMB، IPFS وغيرها
- **استضافة الأكواد**: GitHub، GitHub Releases، CNB Releases
- **برامج الأقراص السحابية**: OpenList (Share)، AList V3، Cloudreve V3/V4، Kodbox، Seafile، Teldrive، Febbox وغيرها
- **برامج تشغيل أخرى**: Netease Music، Misskey، Emby، Cloudflare Image Hosting وغيرها

بالإضافة إلى التخزين الحقيقي أعلاه، تُوفَّر أيضًا برامج تشغيل افتراضية/وظيفية مثل `Local` و`Alias` و`UrlTree` و`AutoIndex` و`Strm` و`Crypt` و`Virtual` و`Chunk` للتركيب المحلي وأسماء العناوين المستعارة وقوائم URL والتخزين المشفر والتقسيم إلى أجزاء.

### القدرات الأساسية

- **إدارة الملفات**: تصفح موحّد لشجرة الأدلة مع معاينة عبر الإنترنت للصور والفيديو والصوت والمستندات والأكواد والأرشيف؛ رفع عبر التخزين وتنزيل جماعي وبث وإعادة توجيه برابط مباشر؛ روابط مشاركة مع انتهاء صلاحية وكلمة مرور والتحكم في الصلاحيات.
- **البحث والمهام**: بحث بالنص الكامل في التخزين المفهرس؛ قائمة مهام في الخلفية للعمليات الجماعية والمعالجة غير المتزامنة.
- **الواجهات الخارجية**: WebDAV وبروتوكول متوافق مع S3 ونقطة نهاية MCP لمساعدي الذكاء الاصطناعي.
- **الوصول والمصادقة**: RBAC (مجموعات المستخدمين وصلاحيات القراءة/الكتابة على مستوى الأدلة والحصص)، وكلمات مرور الحسابات مع TOTP / WebAuthn / SSO / LDAP.
- **الأمان والتشغيل**: جلسات JWT والحماية من CSRF والنقر الخادع (X-Frame-Options) وCSP، ومسبارات `/health` و`/healthz`.
- **إزالة تكرار الطلبات المتزامنة**: طلبات قائمة الدليل / البيانات الوصفية المتطابقة تصل إلى القرص الأعلى مرة واحدة فقط؛ وتعيد الطلبات الأخرى استخدام النتيجة، مما يقلل حدود المعدل واستهلاك المعالج.
- **منصات التشغيل**: Cloudflare Workers وTencent Cloud EdgeOne Makers وAlibaba Cloud ESA وVercel / AWS Lambda وحاويات Node.js.
- **تخزين البيانات**: Cloudflare D1 (SQLite) كأساس، بالإضافة إلى KV / Blob / Durable Objects وMySQL / MariaDB الخارجيين.
- **النشر بنقرة واحدة**: أزرار نشر EdgeOne وCloudflare Workers وAlibaba Cloud ESA + معالج التثبيت.

---

## النشر اليدوي

<details>
<summary>عرض المتطلبات الأساسية والتطوير المحلي والنشر في الإنتاج</summary>

### المتطلبات الأساسية

- Node.js 18+ (يُوصى باستخدام pnpm)
- حساب Cloudflare (للنشر على Workers)

### التطوير المحلي

```bash
# 1. تثبيت التبعيات
pnpm install

# 2. إعداد الارتباطات والمتغيرات في wrangler.jsonc حسب الحاجة (JWT_SECRET انظر .dev.vars.example)

# 3. تشغيل خادم التطوير (يجلب الواجهة الأمامية الرسمية تلقائيًا ويشغّل Worker)
pnpm run dev:unified

# أو تشغيل Worker فقط (بدون جلب الواجهة الأمامية)
pnpm run dev:worker
```

### النشر في الإنتاج

```bash
# النشر بنقرة واحدة: بناء الواجهة الأمامية ← النشر على Cloudflare Workers (تُجهَّز ارتباطات KV تلقائيًا بواسطة wrangler)
pnpm run deploy

# أو نشر Worker مباشرة (تخطي بناء الواجهة الأمامية)
pnpm run deploy:worker
```

</details>

---

## البنية التقنية

### الواجهة الخلفية

- **بيئة التشغيل**: Cloudflare Workers / EdgeOne Functions / Alibaba Cloud ESA (Edge Computing)
- **إطار الويب**: Hono.js
- **قاعدة البيانات**: Cloudflare D1 (SQLite) / KV / Blob / Durable Objects أو MySQL / MariaDB خارجي
- **اللغة**: TypeScript
- **أدوات البناء**: Wrangler وesbuild

### الواجهة الأمامية

- **الإطار**: SolidJS + TypeScript (الرسمي [OpenList-Frontend](https://github.com/OpenListTeam/OpenList-Frontend))
- **مكتبة الواجهة**: Hope UI
- **أداة البناء**: Vite

---

## إعداد النشر

بعد النشر، اضبط المتغيرات التالية:

| المتغير | الافتراضي | الوصف |
| :--- | :--- | :--- |
| `JWT_SECRET` | (لا شيء) | مفتاح توقيع JWT (≥16 حرفًا) |
| `DB_FORMAT` | `map` | `map` (JSON) / `key` (لكل مفتاح) / `sql` (علائقي) |
| `DB_DRIVER` | `auto` | `auto` / `blob` / `cfkv` / `kv` / `d1` / `do` / `mysql` |
| `DB_CIPHER` | `none` | تشفير الحقول الحساسة عند التخزين، مثل `aes-256-gcm` |

للقائمة الكاملة للمتغيرات، راجع [متغيرات الإعداد](https://doc.oplist.org/ecosystem/official_worker/guide_env).

## الدعم

إذا واجهت أي مشكلة، تتوفر المساعدة عبر القنوات التالية:

- 🐛 **تقارير الأخطاء أو طلبات الميزات**: تفضّل بزيارة [_Issues_](https://github.com/OpenListTeam/OpenList-Worker/issues)
- 💬 **الأسئلة العامة والنقاش**: تفضّل بزيارة منتدى [_Discussions_](https://github.com/OpenListTeam/OpenList/discussions)

## الترخيص

`OpenList` هو برنامج مفتوح المصدر بموجب ترخيص [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt).


## تواصل معنا

🌐 [@GitHub](https://github.com/OpenListTeam) · ✈️ [مجموعة Telegram](https://t.me/OpenListTeam) · ✈️ [قناة Telegram](https://t.me/OpenListOfficial)

## المساهمون

شكرًا للمشاريع التالية ومساهميها:

- مؤلف [Alist](https://github.com/AlistGo/alist) وجميع المساهمين
- مؤلف [OpenList](https://github.com/OpenListTeam/OpenList) (نسخة Go) وجميع المساهمين
- جميع المساهمين في هذا المشروع:

[![Contributors](https://contrib.rocks/image?repo=OpenListTeam/OpenList-Worker)](https://github.com/OpenListTeam/OpenList-Worker/graphs/contributors)
