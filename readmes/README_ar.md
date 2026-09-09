<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList هي أداة غنية بالميزات لعرض الأدلة، تدعم تركيب العشرات من الأقراص السحابية مع المعاينة والتنزيل ومشاركة الملفات والمزيد</em></p>
  <p>هذا المستودع هو المنفذ الرسمي TypeScript + Serverless لمشروع <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a></p>
  <p>يعمل على Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/edgeone-artifact-guard.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/edgeone-artifact-guard.yml?branch=main" alt="Build status" /></a>
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


| EdgeOne Makers · دولي | EdgeOne Makers · الصين | Cloudflare Workers · عالمي |
| :---: | :---: | :---: |
| [![النشر على EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![النشر على EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) |

</div>

> [!IMPORTANT]
> - إذا عرض Cloudflare رسالة `تعذّر جلب محتوى المستودع`، [قم بعمل fork](https://github.com/OpenListTeam/OpenList-Worker/fork) لهذا المشروع أولاً ثم انشر من خلال الاتصال بمستودع Github
> - بعد النشر، قم بتكوين متغيرات البيئة: **EdgeOne**: [الكونسول الدولي](https://console.edgeone.ai/makers) · [كونسول الصين](https://console.cloud.tencent.com/edgeone/makers); **Cloudflare**: [لوحة تحكم Worker](https://dash.cloudflare.com/). متغيرات البيئة:
>   - `DB_DRIVER`: طريقة حفظ البيانات: `json` (افتراضي) / `d1` (Cloudflare) / `kv` / `mysql`
>   - `DB_JSON_BACKEND`: الواجهة الخلفية المستخدمة بواسطة تنسيق `json`: `blob` (افتراضي) / `kv` / `cf_rest`
>   - لبقية المتغيرات الاختيارية، راجع **دليل النشر التفصيلي**: [Cloudflare](https://doc.oplist.org/guide/installation/worker#deploy-to-cloudflare-workers) · [EdgeOne](https://doc.oplist.org/guide/installation/worker#deploy-to-edgeone) · [ESA](https://doc.oplist.org/guide/installation/worker#deploy-to-alibaba-cloud-esa)


## الميزات

OpenList هو نظام عرض وإدارة ملفات متعدد التخزين يعمل على منصات الحوسبة الطرفية. يوحّد الملفات المتناثرة عبر أقراص سحابية وتخزين كائنات وخدمات بروتوكولات مختلفة في واجهة واحدة للتصفح والمعاينة والتنزيل والإدارة.

OpenList-Worker هو المنفذ الرسمي TypeScript + Serverless لمشروع [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList). أُعيدت كتابة الواجهة الخلفية من Go إلى خدمة TypeScript تعمل على Workers، بينما تحافظ الواجهة الأمامية على واجهة وتجربة تفاعل متسقة.

### تجميع التخزين

**78 برنامج تشغيل تخزين** مدمجًا، جاهزة لتركيب خلفيات تخزين متنوعة:

- **الأقراص السحابية المحلية**: Aliyundrive (Open/Share)، Quark (Open/UC TV)، Baidu Netdisk (الألبوم)، 115 (Open/Share)، 123 Pan (Open/Share)، Tianyi Cloud (189/PC/TV)، China Mobile Cloud (139/Hecaiyun)، Wopan، Thunder، Tencent Weiyun، Lanzou، PikPak (Share)، Doubao، Guangyapan، Chaoxing Group، Lenovo NAS Share، Teambition، WPS Cloud، Alibaba Docs، HalalCloud، MediaTrack وغيرها
- **الأقراص السحابية الدولية**: Google Drive (الألبوم)، OneDrive (App/ShareLink)، Dropbox، MEGA، MediaFire، Proton Drive، Yandex Disk، Degoo، Bunny Storage، TeraBox وغيرها
- **تخزين الكائنات**: متوافق مع S3 (AWS/OSS/COS/MinIO وغيرها)، UpYun USS، Azure Blob، WebDAV، FTP، SFTP، SMB، IPFS وغيرها
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

### إدارة الوصول

- **الصلاحيات**: التحكم في الوصول القائم على الأدوار (RBAC)، مع دعم مجموعات المستخدمين وصلاحيات القراءة/الكتابة على مستوى الأدلة والحصص.
- **المصادقة**: كلمات مرور حسابات مدمجة مع التحقق عبر TOTP، وتسجيل الدخول WebAuthn/FIDO، والدخول الموحّد SSO، ومصادقة دليل LDAP.
- **تعزيز الأمان**: جلسات JWT، والحماية من CSRF، والحماية من النقر الخادع (X-Frame-Options)، وسياسة أمان المحتوى (CSP).
- **فحوصات السلامة**: توفير مسبار الحيوية `/health` ومسبار الجاهزية `/healthz` للمراقبة والتنبيه.

### النشر على المنصات

- **منصات التشغيل**: Cloudflare Workers وTencent Cloud EdgeOne Makers وVercel وServerless وبيئات حاويات Node.js.
- **تخزين البيانات**: Cloudflare D1 (SQLite) كأساس، مع دعم MySQL وMariaDB وPostgreSQL وSQL Server.
- **الذاكرة المؤقتة الدائمة**: Cloudflare KV / EdgeOne Blob (اختياري) لحفظ الإعدادات والتخزين المؤقت.
- **النشر بنقرة واحدة**: دعم أزرار النشر بنقرة واحدة + التهيئة على EdgeOne وCloudflare Workers ومنصات أخرى.

---

## النشر اليدوي

### المتطلبات الأساسية

- Node.js 18+ (يُوصى باستخدام pnpm)
- حساب Cloudflare (للنشر على Workers)

### التطوير المحلي

```bash
# 1. تثبيت التبعيات
pnpm install

# 2. إعداد wrangler.toml (تعبئة JWT_SECRET وارتباطات KV/D1)

# 3. تشغيل خادم التطوير (يجلب الواجهة الأمامية الرسمية تلقائيًا ويشغّل Worker)
pnpm run dev:unified

# أو تشغيل Worker فقط (بدون جلب الواجهة الأمامية)
pnpm run dev:worker
```

### النشر في الإنتاج

```bash
# النشر بنقرة واحدة: التأكد من وجود namespace الخاص بـ KV → جلب الواجهة الأمامية الرسمية → النشر على Cloudflare Workers
pnpm run deploy

# أو نشر Worker مباشرة (تخطي فحص KV وبناء الواجهة الأمامية)
pnpm run deploy:worker
```

---

## البنية التقنية

### الواجهة الخلفية

- **بيئة التشغيل**: Cloudflare Workers (Edge Computing)
- **إطار الويب**: Hono.js
- **قاعدة البيانات**: Cloudflare D1 (SQLite) / تدعم MySQL وMariaDB وPostgreSQL وSQL Server
- **الذاكرة المؤقتة**: Cloudflare KV (اختياري)
- **اللغة**: TypeScript
- **أدوات البناء**: Wrangler وesbuild

### الواجهة الأمامية

- **الإطار**: React 19 + TypeScript
- **مكتبات الواجهة**: Ant Design / Material-UI
- **أداة البناء**: Vite

---


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
