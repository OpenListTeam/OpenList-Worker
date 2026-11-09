<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList هي أداة غنية بالميزات لعرض الأدلة، تدعم تركيب العشرات من الأقراص السحابية مع المعاينة والتنزيل ومشاركة الملفات والمزيد</em></p>
  <p>هذا المستودع هو المنفذ الرسمي TypeScript + Serverless لمشروع <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a></p>
  <p>يعمل على Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/build-verify.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/build-verify.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/releases"><img src="https://img.shields.io/github/release/OpenListTeam/OpenList-Worker" alt="latest version" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList-Worker?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/releases"><img src="https://img.shields.io/github/downloads/OpenListTeam/OpenList-Worker/total?color=%239F7AEA&logo=github" alt="Downloads" /></a>

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
> - بالنسبة إلى Alibaba Cloud ESA، استورد هذا المستودع من **الحوسبة الطرفية والذكاء الاصطناعي ← الدوال وPages** في وحدة التحكم: ملف `esa.jsonc` المضمّن يحدد بالفعل أوامر التثبيت والبناء ومجلد الموارد الثابتة. بعد النشر، اضبط `JWT_SECRET` و`KV_NAMESPACE` (الافتراضي `openlist`) وأنشئ مسبقًا مساحة أسماء EdgeKV بالاسم نفسه
> - عند النشر، املأ `JWT_SECRET` (سلسلة عشوائية من 16 حرفًا أو أكثر، مثل `openssl rand -hex 32`): تُستخدم لتوقيع JWT وتشفير البيانات؛ وإن لم تُضبط فسيتم توليدها وحفظها أثناء التهيئة
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

- **تصفح الملفات**: تصفح موحّد لشجرة الأدلة، مع معاينة عبر الإنترنت للصور والفيديو والصوت والمستندات والأكواد والأرشيف وغيرها.
- **الرفع والتنزيل**: رفع عبر التخزين، وتنزيل جماعي، وبث، وإعادة توجيه برابط مباشر.
- **مشاركة الملفات**: إنشاء روابط مشاركة مع انتهاء صلاحية وكلمة مرور والتحكم في الصلاحيات، مع دعم الوصول المجهول ومشاركة الأدلة.
- **البحث بالنص الكامل**: بحث سريع عن الملفات في التخزين المفهرس.
- **المهام دون اتصال**: قائمة انتظار مهام في الخلفية تدعم العمليات الجماعية والمعالجة غير المتزامنة.
- **الواجهات الخارجية**: كشف التخزين المجمّع عبر بروتوكول WebDAV أو بروتوكول متوافق مع S3 للتركيب في أدوات خارجية.
- **خدمة MCP**: توفير نقطة نهاية Model Context Protocol يمكن دمجها واستدعاؤها من مساعدي الذكاء الاصطناعي والعملاء الآخرين.
- **إزالة تكرار الطلبات المتزامنة**: طلبات قائمة الدليل / البيانات الوصفية المتطابقة في اللحظة نفسها تصل إلى القرص الأعلى مرة واحدة فقط؛ وتعيد الطلبات الأخرى استخدام النتيجة نفسها، مما يتجنب حدود المعدل واستهلاك المعالج غير الضروري.

### إدارة الوصول

- **الصلاحيات**: التحكم في الوصول القائم على الأدوار (RBAC)، مع دعم مجموعات المستخدمين وصلاحيات القراءة/الكتابة على مستوى الأدلة والحصص.
- **المصادقة**: كلمات مرور حسابات مدمجة مع التحقق عبر TOTP، وتسجيل الدخول WebAuthn/FIDO، والدخول الموحّد SSO، ومصادقة دليل LDAP.
- **تعزيز الأمان**: جلسات JWT، والحماية من CSRF، والحماية من النقر الخادع (X-Frame-Options)، وسياسة أمان المحتوى (CSP).
- **فحوصات السلامة**: توفير مسبار الحيوية `/health` ومسبار الجاهزية `/healthz` للمراقبة والتنبيه.

### النشر على المنصات

- **منصات التشغيل**: Cloudflare Workers وTencent Cloud EdgeOne Makers وAlibaba Cloud ESA وVercel / AWS Lambda وبيئات حاويات Node.js.
- **تخزين البيانات**: Cloudflare D1 (SQLite) كأساس، بالإضافة إلى KV / Blob / Durable Objects وMySQL / MariaDB الخارجيين.
- **النشر بنقرة واحدة**: مداخل نشر EdgeOne وCloudflare Workers وAlibaba Cloud ESA + معالج التثبيت.

---

## النشر اليدوي

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

## الإعداد

بعد النشر، **تفتح أول زيارة للموقع معالج التثبيت تلقائيًا**: عيّن حساب المسؤول وكلمة المرور في المتصفح لإكمال التهيئة. لتخطي المعالج، اضبط `ADMIN_PASS` ليتم تهيئة المسؤول تلقائيًا.

معظم عمليات النشر **لا تحتاج إلى أي إعداد إضافي**: يستخدم التخزين افتراضيًا `DB_DRIVER=auto`، الذي يختار تلقائيًا واجهة خلفية دائمة متاحة (Cloudflare Workers ← KV / D1 / DO، EdgeOne / ESA ← Blob). المتغير الوحيد الذي يُستحسن ضبطه صراحةً هو:

| المتغير | الوصف |
| :--- | :--- |
| `JWT_SECRET` | مفتاح توقيع رموز JWT (≥16 حرفًا، يُوصى بـ `openssl rand -hex 32`)، ويُستخدم أيضًا لمصادقة مهام cron. إذا لم يُضبط، يُولَّد ويُحفظ أثناء التهيئة |

> اضبط `JWT_SECRET` كـ **Secret** (وليس متغيرًا عاديًا): المتغيرات العادية قد تُستبدل بإعدادات المستودع عند إعادة النشر، أما Secrets فلا.

المتغيرات الأخرى لها قيم افتراضية معقولة:

| المتغير | الافتراضي | الوصف |
| :--- | :--- | :--- |
| `ADMIN_PASS` | — | تخطي معالج التثبيت وتهيئة المسؤول بهذه الكلمة |
| `DB_FORMAT` | `map` | تنسيق التخزين: `map` (كائن JSON كامل) / `key` (لكل مفتاح) / `sql` (جداول علائقية، متوافق مع الواجهة الخلفية Go) |
| `DB_DRIVER` | `auto` | برنامج تشغيل التخزين: `auto` / `blob` / `cfkv` / `kv` / `d1` / `do` / `mysql`؛ لا يُستبدل البرنامج المحدد صراحةً تلقائيًا |
| `DB_CIPHER` | `none` | تشفير الحقول الحساسة عند التخزين (بلا تشفير افتراضيًا)، مثل `aes-256-gcm` |
| `ALLOW_URLS` | — | قائمة CORS المسموح بها (مفصولة بفواصل؛ وعند عدم ضبطها يُسمح بالمصدر نفسه فقط) |
| `MAX_UPLOAD` / `MAX_UPPART` | 26214400 / 16777216 | الحد الأقصى (بايت) للرفع الكامل / لجزء الرفع المتعدد |
| `ASSET_URLS` | — | عنوان CDN الأساسي لموارد الواجهة الأمامية، يدعم العنصر النائب `$version` |

تُجلب قوائم الأدلة وروابط التنزيل دائمًا مباشرة من القرص — لا يوجد تخزين مؤقت بين الطلبات (لا متغيرات `CACHE_*`)، لذا تظهر التغييرات الخارجية فورًا.

للاطلاع على القائمة الكاملة للمتغيرات (تشفير الحقول `DB_CIPHER`، وإعدادات `cfkv` / MySQL، إلخ) وخطوات النشر لكل منصة، راجع التوثيق:

- [متغيرات البيئة](https://doc.oplist.org/ecosystem/official_worker/guide_env)
- [النشر](https://doc.oplist.org/ecosystem/official_worker/guide)
- [الأسئلة الشائعة](https://doc.oplist.org/ecosystem/official_worker/about)

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
