<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList هي أداة لعرض الأدلة تدعم تركيب عدة أقراص سحابية، مع عشرات من خلفيات التخزين السحابي وإدارة الملفات والمشاركة والمزيد.</em></p>

  <p>هذا المستودع هو المنفذ الرسمي TypeScript + Serverless لمشروع <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a>.</p>
  <p>يعمل على Cloudflare Workers / EdgeOne Cloud Function.</p>

<a href="https://github.com/OpenListTeam/OpenList/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList/actions?query=workflow%3ABuild"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList/build.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList/releases"><img src="https://img.shields.io/github/release/OpenListTeam/OpenList" alt="latest version" /></a>

<a href="https://github.com/OpenListTeam/OpenList/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList/releases"><img src="https://img.shields.io/github/downloads/OpenListTeam/OpenList/total?color=%239F7AEA&logo=github" alt="Downloads" /></a>

</div>

<div align="center">

[English](README_en.md) | [中文](../README.md) | [日本語](README_ja.md) | [한국어](README_ko.md) | [Français](README_fr.md) | [Deutsch](README_de.md) | [Español](README_es.md) | [Português](README_pt.md) | [Русский](README_ru.md) | العربية（هذا الملف） | [Italiano](README_it.md)

[المشروع الأصلي](https://github.com/OpenListTeam/OpenList) · [دليل المساهمة](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CONTRIBUTING.md) · [مدونة السلوك](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CODE_OF_CONDUCT.md) · [الترخيص](../LICENSE)

[🌎 العرض العالمي](https://new.oplist.org) 　|　 [🇨🇳 عرض الصين](https://new.oplist.org.cn)

</div>

---

## النشر بنقرة واحدة

انقر فوق الزر أدناه لنشر هذا المشروع على المنصة المقابلة بنقرة واحدة：

<div align="center">

| EdgeOne Makers · دولي | EdgeOne Makers · الصين | Cloudflare Workers · عالمي |
| :---: | :---: | :---: |
| [![النشر على EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![النشر على EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![النشر على Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) |

</div>

> [!IMPORTANT]
> بعد النشر، ستُشغَّل **معالج التثبيت** تلقائيًا عند أول زيارة للموقع：
>
> متغيرات البيئة / الأسرار الاختيارية：
> - `ENCRYPTION_SECRET`：مفتاح تشفير ثابت（يوصى بـ ≥16 حرفًا؛ يُستخدم لتشفير الحقول الحساسة）
> - `JWT_SECRET`：مفتاح توقيع JWT（يوصى به؛ يُنشأ تلقائيًا ويُحفظ في KV إذا لم يُضبط）
> - `CRON_SECRET`：مفتاح مصادقة لمهام التحديث المجدولة（اختياري، مطلوب فقط لمهام EdgeOne المجدولة）

## الميزات

OpenList-Worker هو نظام عرض وإدارة ملفات متعدد التخزين يعمل على منصات الحوسبة الطرفية، ويوحّد الملفات المتناثرة عبر أقراص سحابية وتخزين كائنات وخدمات بروتوكولات مختلفة في واجهة واحدة للتصفح والمعاينة والتنزيل والإدارة.

### حول منفذ TypeScript

OpenList-Worker هو منفذ TypeScript للمشروع الرسمي [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList).

أُعيدت كتابة الواجهة الخلفية من Go إلى خدمة TypeScript تعمل على Workers، بينما تحافظ الواجهة الأمامية على واجهة وتجربة تفاعل متسقة.

### تجميع التخزين

**أكثر من 80 برنامج تشغيل تخزين** مدمجًا، جاهزة لتركيب خلفيات تخزين متنوعة：

| الفئة | الخلفيات المدعومة |
| :--- | :--- |
| الأقراص السحابية المحلية | Aliyundrive（Open/Share）、Quark、Baidu Netdisk、115、123 Pan、Thunder、Tianyi Cloud（189）、Tencent Weiyun、Lanzou、PikPak、UC Cloud、China Mobile Cloud、139 Cloud、Doubao、Wopan、Tianyi Family Cloud、LeTV Cloud وغيرها |
| الأقراص السحابية الدولية | Google Drive وOneDrive（App/ShareLink）وDropbox وMEGA وMediaFire وProton Drive وYandex Disk وDegoo وBunny Storage وTeraBox وغيرها |
| تخزين الكائنات | متوافق مع S3（AWS/OSS/COS/MinIO وغيرها）وWebDAV وFTP وSFTP وSMB وIPFS وAzure Blob وغيرها |
| استضافة الأكواد | GitHub وGitHub Releases وCNB Releases |
| برامج الأقراص السحابية | OpenList / AList V3 وCloudreve V3/V4 وKodbox وSeafile وTeldrive وFebbox وغيرها |
| برامج تشغيل أخرى | Netease Music وMisskey وEmby ومشاركة 115 ومشاركة Aliyundrive ومشاركة Quark وغيرها |

بالإضافة إلى التخزين الحقيقي أعلاه، تُوفَّر أيضًا برامج تشغيل افتراضية/وظيفية مثل `Local` و`Alias` و`UrlTree` و`AutoIndex` و`Strm` و`Crypt` و`Virtual` و`Chunk` للتركيب المحلي وأسماء العناوين المستعارة وقوائم URL والتخزين المشفر والتقسيم إلى أجزاء.

### القدرات الأساسية

- **تصفح الملفات**：تصفح موحّد لشجرة الأدلة، مع معاينة عبر الإنترنت للصور والفيديو والصوت والمستندات والأكواد والأرشيف وغيرها.
- **الرفع والتنزيل**：رفع عبر التخزين، وتنزيل جماعي، وبث، وإعادة توجيه برابط مباشر.
- **مشاركة الملفات**：إنشاء روابط مشاركة مع انتهاء صلاحية وكلمة مرور والتحكم في الصلاحيات، مع دعم الوصول المجهول ومشاركة الأدلة.
- **البحث بالنص الكامل**：بحث سريع عن الملفات في التخزين المفهرس.
- **المهام دون اتصال**：قائمة انتظار مهام في الخلفية تدعم العمليات الجماعية والمعالجة غير المتزامنة.
- **الواجهات الخارجية**：كشف التخزين المجمّع عبر بروتوكول WebDAV أو بروتوكول متوافق مع S3 للتركيب في أدوات خارجية.
- **خدمة MCP**：توفير نقطة نهاية Model Context Protocol يمكن دمجها واستدعاؤها من مساعدي الذكاء الاصطناعي والعملاء الآخرين.

### إدارة الوصول

- **الصلاحيات**：التحكم في الوصول القائم على الأدوار（RBAC）، مع دعم مجموعات المستخدمين وصلاحيات القراءة/الكتابة على مستوى الأدلة والحصص.
- **المصادقة**：كلمات مرور حسابات مدمجة مع التحقق عبر TOTP، وتسجيل الدخول WebAuthn/FIDO، والدخول الموحّد SSO، ومصادقة دليل LDAP.
- **تعزيز الأمان**：جلسات JWT، والحماية من CSRF، والحماية من النقر الخادع（X-Frame-Options），وسياسة أمان المحتوى（CSP）.
- **فحوصات السلامة**：توفير مسبار الحيوية `/health` ومسبار الجاهزية `/healthz` للمراقبة والتنبيه.

### النشر

- **منصات التشغيل**：Cloudflare Workers وTencent Cloud EdgeOne Makers وVercel وServerless وبيئات حاويات Node.js.
- **تخزين البيانات**：Cloudflare D1（SQLite）كأساس، مع دعم MySQL وMariaDB وPostgreSQL وSQL Server.
- **الذاكرة المؤقتة الدائمة**：Cloudflare KV / EdgeOne Blob（اختياري）لحفظ الإعدادات والتخزين المؤقت.
- **النشر بنقرة واحدة**：دعم أزرار النشر بنقرة واحدة + التهيئة على EdgeOne وCloudflare Workers ومنصات أخرى.

---

## النشر اليدوي

### المتطلبات الأساسية

- Node.js 18+
- حساب Cloudflare（للنشر على Workers）

### التطوير المحلي

```bash
# 1. تثبيت تبعيات الواجهة الخلفية
npm install

# 2. تثبيت تبعيات الواجهة الأمامية
npm run install:page

# 3. إعداد wrangler.jsonc（تعبئة JWT_SECRET وارتباطات KV/D1）

# 4. تشغيل خادم تطوير الواجهة الخلفية
npm run dev

# 5. تشغيل خادم تطوير الواجهة الأمامية في طرفية أخرى
npm run dev:page
```

### النشر في الإنتاج

```bash
# النشر بنقرة واحدة（بناء الواجهة الأمامية + نشر الواجهة الخلفية على Cloudflare Workers）
npm run deploy
```

---

## البنية التقنية

### الواجهة الخلفية

- **بيئة التشغيل**：Cloudflare Workers（Edge Computing）
- **إطار الويب**：Hono.js
- **قاعدة البيانات**：Cloudflare D1（SQLite）/ تدعم MySQL وMariaDB وPostgreSQL وSQL Server
- **الذاكرة المؤقتة**：Cloudflare KV（اختياري）
- **اللغة**：TypeScript
- **أدوات البناء**：Wrangler وesbuild

### الواجهة الأمامية

- **الإطار**：React 19 + TypeScript
- **مكتبات الواجهة**：Ant Design / Material-UI
- **أداة البناء**：Vite

---

## التوثيق

- 📘 [التوثيق الرسمي](https://doc.oplist.org)
- 🌏 [مرآة الصين](https://doc.oplist.org.cn)
- ⚖️ [شروط الاستخدام](https://doc.oplist.org/terms)
- 🔒 [سياسة الخصوصية](https://doc.oplist.org/privacy)

## الدعم

للأسئلة العامة، يُرجى زيارة منتدى [_Discussions_](https://github.com/OpenListTeam/OpenList/discussions). **_Issues_ مخصص فقط لتقارير الأخطاء وطلبات الميزات.**

## الترخيص

`OpenList` هو برنامج مفتوح المصدر بموجب ترخيص [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt).

## تواصل معنا

- [@GitHub](https://github.com/OpenListTeam)
- [مجموعة Telegram](https://t.me/OpenListTeam)
- [قناة Telegram](https://t.me/OpenListOfficial)

## المساهمون

نشكر بصدق مؤلف المشروع الأصلي [AlistGo/alist](https://github.com/AlistGo/alist)، [Xhofe](https://github.com/Xhofe)، وجميع المساهمين الآخرين.

شكرًا لهؤلاء الأشخاص الرائعين：

[![Contributors](https://contrib.rocks/image?repo=OpenListTeam/OpenList-Worker)](https://github.com/OpenListTeam/OpenList-Worker/graphs/contributors)
