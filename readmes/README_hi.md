<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList एक सुविधा-संपन्न निर्देशिका सूची उपकरण है जो दर्जनों क्लाउड ड्राइव माउंट करने और फ़ाइल पूर्वावलोकन/डाउनलोड/साझाकरण आदि का समर्थन करता है</em></p>
  <p>यह रिपॉजिटरी आधिकारिक <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a> परियोजना का TypeScript + Serverless आर्किटेक्चर पोर्ट है</p>
  <p>Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA पर चलता है</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/build-verify.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/build-verify.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList-Worker?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/stargazers"><img src="https://img.shields.io/github/stars/OpenListTeam/OpenList-Worker?color=%23ED8936&logo=github" alt="Stars" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/forks"><img src="https://img.shields.io/github/forks/OpenListTeam/OpenList-Worker?color=%239F7AEA&logo=github" alt="Forks" /></a>

📘 [उपयोग दस्तावेज़](https://doc.oplist.org) · 🌏 [उपयोग दस्तावेज़（मुख्यभूमि चीन）](https://doc.oplist.org.cn)  · ⚖️ [उपयोग की शर्तें](https://doc.oplist.org/terms)  · 🔒 [गोपनीयता नीति](https://doc.oplist.org/privacy)

</div>

<div align="center">

[English](README_en.md) | [简体中文](../README.md) | [繁體中文](README_zh-TW.md) | [日本語](README_ja.md) | [한국어](README_ko.md) | [Français](README_fr.md) | [Deutsch](README_de.md) 

[Português](README_pt.md) | [Русский](README_ru.md) | [العربية](README_ar.md) | [Italiano](README_it.md) | हिन्दी | [Español](README_es.md)

[अपस्ट्रीम परियोजना](https://github.com/OpenListTeam/OpenList) · [योगदान मार्गदर्शिका](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CONTRIBUTING.md) · [आचार संहिता](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CODE_OF_CONDUCT.md) · [लाइसेंस](./LICENSE)

[🌎 वैश्विक डेमो](https://new.oplist.org) 　|　 [🇨🇳 चीन डेमो](https://new.oplist.org.cn)

</div>

---

## एक-क्लिक डिप्लॉयमेंट

इस परियोजना को संबंधित प्लेटफ़ॉर्म पर एक क्लिक में तैनात करने के लिए नीचे दिए गए बटन पर क्लिक करें:
<div align="center">


| EdgeOne Makers · अंतर्राष्ट्रीय | EdgeOne Makers · चीन | Cloudflare Workers · वैश्विक | Alibaba Cloud ESA · चीन |
| :---: | :---: | :---: | :---: |
| [![EdgeOne पर तैनात करें](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![EdgeOne पर तैनात करें](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=JWT_SECRET) | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) | [![Alibaba Cloud ESA पर तैनात करें](assets/esa-deploy.svg)](https://esa.console.aliyun.com/edge/function/list) |

</div>

> [!IMPORTANT]
> - यदि Cloudflare `रिपॉजिटरी सामग्री प्राप्त नहीं कर सकता` दिखाता है, तो पहले इस परियोजना को [Fork](https://github.com/OpenListTeam/OpenList-Worker/fork) करें, फिर Github रिपॉजिटरी से कनेक्ट करके तैनात करें
> - Alibaba Cloud ESA के लिए, कंसोल में **एज कंप्यूटिंग और AI → फ़ंक्शन और Pages** से इस रिपॉजिटरी को आयात करें
> - तैनाती के समय `JWT_SECRET` सेट करें (≥16 वर्ण) — JWT हस्ताक्षर और एन्क्रिप्शन के लिए
> - डेटा संग्रहण स्वतः प्लेटफ़ॉर्म के स्थायी बैकएंड का चयन करता है (`DB_DRIVER=auto`) — कोई कॉन्फ़िगरेशन आवश्यक नहीं; शेष चरों के लिए [पर्यावरण चर](https://doc.oplist.org/ecosystem/official_worker/guide_env) देखें
> - तैनाती के बाद पहली विज़िट पर **इंस्टॉल विज़ार्ड** खुलता है: इनिशियलाइज़ेशन पूरा करने के लिए ब्राउज़र में एडमिन खाता और पासवर्ड सेट करें (`ADMIN_PASS` सेट करने पर विज़ार्ड छूट जाता है)


## विशेषताएँ

OpenList एक बहु-स्टोरेज एग्रीगेशन फ़ाइल सूची और प्रबंधन प्रणाली है जो एज कंप्यूटिंग प्लेटफ़ॉर्म पर चलती है। यह विभिन्न क्लाउड ड्राइव, ऑब्जेक्ट स्टोरेज और प्रोटोकॉल सेवाओं में बिखरी फ़ाइलों को एक ही इंटरफ़ेस में एकीकृत करती है, जिससे ब्राउज़िंग, पूर्वावलोकन, डाउनलोड और प्रबंधन संभव होता है।

OpenList-Worker आधिकारिक [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList) परियोजना का TypeScript + Serverless पोर्ट है। बैकएंड को Go से Workers पर चलने वाली TypeScript सेवा में फिर से लिखा गया है, जबकि फ्रंटएंड एक सुसंगत इंटरफ़ेस और इंटरैक्शन अनुभव बनाए रखता है।

### स्टोरेज एग्रीगेशन

अंतर्निहित **78 स्टोरेज ड्राइवर**, विभिन्न स्टोरेज बैकएंड को तुरंत माउंट करने के लिए तैयार:

- **घरेलू क्लाउड ड्राइव**: Aliyundrive（ओपन प्लेटफ़ॉर्म/शेयर）、Quark（ओपन प्लेटफ़ॉर्म/UC TV）、Baidu Netdisk（एल्बम）、115（ओपन प्लेटफ़ॉर्म/शेयर）、123 Pan（ओपन प्लेटफ़ॉर्म/शेयर）、Tianyi Cloud（189/PC/TV）、China Mobile Cloud（139/Hecaiyun）、Wopan、Thunder、Tencent Weiyun、Lanzou、PikPak（शेयर）、Doubao、Guangyapan、Chaoxing Group、Lenovo NAS शेयर、Teambition、WPS Cloud、Alibaba Docs、HalalCloud、MediaTrack आदि
- **अंतर्राष्ट्रीय क्लाउड ड्राइव**: Google Drive（एल्बम）、OneDrive（ऐप/शेयर लिंक）、Dropbox、MEGA、MediaFire、Proton Drive、Yandex Disk、Degoo、Bunny Storage、TeraBox आदि
- **ऑब्जेक्ट स्टोरेज**: S3-संगत（AWS/OSS/COS/MinIO आदि）、Cloudflare R2（Workers binding या S3 API）、UpYun USS、Azure Blob、WebDAV、FTP、SFTP、SMB、IPFS आदि
- **कोड होस्टिंग**: GitHub、GitHub Releases、CNB Releases
- **क्लाउड ड्राइव प्रोग्राम**: OpenList（शेयर）、AList V3、Cloudreve V3/V4、Kodbox、Seafile、Teldrive、Febbox आदि
- **अन्य ड्राइवर**: Netease Music、Misskey、Emby、Cloudflare इमेज होस्टिंग आदि

उपरोक्त वास्तविक स्टोरेज के अलावा, स्थानीय माउंट, पता उपनाम, URL सूची, एन्क्रिप्टेड स्टोरेज और विभाजन जैसे परिदृश्यों के लिए `Local`、`Alias`、`UrlTree`、`AutoIndex`、`Strm`、`Crypt`、`Virtual`、`Chunk` जैसे वर्चुअल/कार्यात्मक ड्राइवर भी प्रदान किए गए हैं।

### मुख्य क्षमताएँ

- **फ़ाइल प्रबंधन**：एकीकृत निर्देशिका ट्री ब्राउज़िंग, छवियों / वीडियो / ऑडियो / दस्तावेज़ों / कोड / संग्रहों का ऑनलाइन पूर्वावलोकन; क्रॉस-स्टोरेज अपलोड, बैच डाउनलोड, स्ट्रीमिंग और डायरेक्ट-लिंक रीडायरेक्ट; समाप्ति, पासवर्ड और अनुमति नियंत्रण के साथ साझाकरण लिंक।
- **खोज और कार्य**：अनुक्रमित स्टोरेज में पूर्ण-पाठ खोज; बैच और अतुल्यकालिक प्रसंस्करण के लिए बैकग्राउंड कार्य कतार।
- **बाहरी इंटरफ़ेस**：WebDAV、S3-संगत प्रोटोकॉल, और AI सहायकों के लिए MCP एंडपॉइंट।
- **पहुंच और प्रमाणीकरण**：RBAC（उपयोगकर्ता समूह, निर्देशिका-स्तरीय पढ़ने/लिखने की अनुमतियाँ, कोटा）, खाता पासवर्ड + TOTP / WebAuthn / SSO / LDAP।
- **सुरक्षा और संचालन**：JWT सत्र, CSRF, क्लिकजैकिंग（X-Frame-Options）और CSP सुरक्षा, `/health` और `/healthz` प्रोब।
- **समवर्ती अनुरोध डिडुप्लिकेशन**：समान निर्देशिका सूची / मेटाडेटा अनुरोध अपस्ट्रीम ड्राइव पर केवल एक बार जाते हैं; बाकी वही परिणाम पुनः उपयोग करते हैं, जिससे रेट लिमिट और CPU खपत कम होती है।
- **रनटाइम प्लेटफ़ॉर्म**：Cloudflare Workers、Tencent Cloud EdgeOne Makers、Alibaba Cloud ESA、Vercel / AWS Lambda और Node.js कंटेनर।
- **डेटा स्टोरेज**：Cloudflare D1（SQLite）प्राथमिक, साथ ही KV / Blob / Durable Objects और बाहरी MySQL / MariaDB।
- **एक-क्लिक तैनाती**：EdgeOne、Cloudflare Workers और Alibaba Cloud ESA तैनाती बटन + इंस्टॉल विज़ार्ड।

---

## मैन्युअल तैनाती

<details>
<summary>पूर्वापेक्षाएँ, स्थानीय विकास और उत्पादन तैनाती देखें</summary>

### पूर्वापेक्षाएँ

- Node.js 18+（pnpm अनुशंसित）
- Cloudflare खाता（Workers पर तैनात करने के लिए）

### स्थानीय विकास

```bash
# 1. निर्भरताएँ स्थापित करें
pnpm install

# 2. आवश्यकतानुसार wrangler.jsonc में बाइंडिंग और चर कॉन्फ़िगर करें（JWT_SECRET के लिए .dev.vars.example देखें）

# 3. विकास सर्वर शुरू करें（आधिकारिक फ्रंटएंड को स्वचालित रूप से प्राप्त करता है और Worker चलाता है）
pnpm run dev:unified

# या केवल Worker चलाएँ（फ्रंटएंड प्राप्त किए बिना）
pnpm run dev:worker
```

### उत्पादन तैनाती

```bash
# एक-क्लिक तैनाती: फ्रंटएंड बिल्ड करें → Cloudflare Workers पर तैनात करें（KV बाइंडिंग wrangler द्वारा स्वतः प्रावधानित）
pnpm run deploy

# या Worker को सीधे तैनात करें（फ्रंटएंड बिल्ड छोड़ें）
pnpm run deploy:worker
```

</details>

---

## तकनीकी संरचना

### बैकएंड

- **रनटाइम वातावरण**: Cloudflare Workers / EdgeOne Functions / Alibaba Cloud ESA（Edge Computing）
- **वेब फ्रेमवर्क**: Hono.js
- **डेटाबेस**: Cloudflare D1（SQLite）/ KV / Blob / Durable Objects या बाहरी MySQL / MariaDB
- **भाषा**: TypeScript
- **बिल्ड टूल**: Wrangler、esbuild

### फ्रंटएंड

- **फ्रेमवर्क**: SolidJS + TypeScript（आधिकारिक [OpenList-Frontend](https://github.com/OpenListTeam/OpenList-Frontend)）
- **UI लाइब्रेरी**: Hope UI
- **बिल्ड टूल**: Vite

---

## तैनाती कॉन्फ़िगरेशन

तैनाती के बाद निम्न चर सेट करें:

| चर | डिफ़ॉल्ट | विवरण |
| :--- | :--- | :--- |
| `JWT_SECRET` | (कोई नहीं) | JWT हस्ताक्षर कुंजी (≥16 वर्ण) |
| `DB_FORMAT` | `map` | `map` (JSON) / `key` (प्रति कुंजी) / `sql` (संबंधपरक) |
| `DB_DRIVER` | `auto` | `auto` / `blob` / `cfkv` / `kv` / `d1` / `do` / `mysql` |
| `DB_CIPHER` | `none` | संवेदनशील फ़ील्ड का एट-रेस्ट एन्क्रिप्शन, जैसे `aes-256-gcm` |

पूरी चर सूची के लिए [कॉन्फ़िगरेशन चर](https://doc.oplist.org/ecosystem/official_worker/guide_env) देखें।

## सहायता

उपयोग के दौरान समस्या आने पर, निम्नलिखित चैनलों से सहायता प्राप्त कर सकते हैं:

- 🐛 **बग रिपोर्ट या सुविधा अनुरोध सबमिट करें**: [_Issues_](https://github.com/OpenListTeam/OpenList-Worker/issues) पर जाएँ
- 💬 **सामान्य प्रश्न और संवाद**: [_Discussions_](https://github.com/OpenListTeam/OpenList/discussions) फ़ोरम पर जाएँ

## लाइसेंस

`OpenList` [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt) लाइसेंस के तहत ओपन-सोर्स सॉफ़्टवेयर है।


## संपर्क करें

🌐 [@GitHub](https://github.com/OpenListTeam) · ✈️ [Telegram समूह](https://t.me/OpenListTeam) · ✈️ [Telegram चैनल](https://t.me/OpenListOfficial)

## योगदानकर्ता

निम्नलिखित परियोजनाओं और उनके योगदानकर्ताओं को धन्यवाद:

- [Alist](https://github.com/AlistGo/alist) परियोजना के लेखक और सभी योगदानकर्ता
- [OpenList](https://github.com/OpenListTeam/OpenList)（Go संस्करण）परियोजना के लेखक और सभी योगदानकर्ता
- इस परियोजना के सभी योगदानकर्ता:

[![Contributors](https://contrib.rocks/image?repo=OpenListTeam/OpenList-Worker)](https://github.com/OpenListTeam/OpenList-Worker/graphs/contributors)
