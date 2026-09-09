<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList एक सुविधा-संपन्न निर्देशिका सूची उपकरण है जो दर्जनों क्लाउड ड्राइव माउंट करने और फ़ाइल पूर्वावलोकन/डाउनलोड/साझाकरण आदि का समर्थन करता है</em></p>
  <p>यह रिपॉजिटरी आधिकारिक <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a> परियोजना का TypeScript + Serverless आर्किटेक्चर पोर्ट है</p>
  <p>Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA पर चलता है</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/edgeone-artifact-guard.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/edgeone-artifact-guard.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/releases"><img src="https://img.shields.io/github/release/OpenListTeam/OpenList-Worker" alt="latest version" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList-Worker?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/releases"><img src="https://img.shields.io/github/downloads/OpenListTeam/OpenList-Worker/total?color=%239F7AEA&logo=github" alt="Downloads" /></a>

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


| EdgeOne Makers · अंतर्राष्ट्रीय | EdgeOne Makers · चीन | Cloudflare Workers · वैश्विक |
| :---: | :---: | :---: |
| [![EdgeOne पर तैनात करें](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![EdgeOne पर तैनात करें](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) |

</div>

> [!IMPORTANT]
> - यदि Cloudflare `रिपॉजिटरी सामग्री प्राप्त नहीं कर सकता` दिखाता है, तो पहले इस परियोजना को [Fork](https://github.com/OpenListTeam/OpenList-Worker/fork) करें, फिर Github रिपॉजिटरी से कनेक्ट करके तैनात करें
> - तैनाती के बाद पर्यावरण चर कॉन्फ़िगर करें: **EdgeOne**: [अंतर्राष्ट्रीय कंसोल](https://console.edgeone.ai/makers) · [चीन कंसोल](https://console.cloud.tencent.com/edgeone/makers); **Cloudflare**: [Worker डैशबोर्ड](https://dash.cloudflare.com/)। पर्यावरण चर:
>   - `DB_DRIVER`: डेटा संग्रहण विधि: `json` (डिफ़ॉल्ट) / `d1` (Cloudflare) / `kv` / `mysql`
>   - `DB_JSON_BACKEND`: `json` प्रारूप द्वारा उपयोग किया जाने वाला बैकएंड: `blob` (डिफ़ॉल्ट) / `kv` / `cf_rest`
>   - शेष वैकल्पिक चरों के लिए **विस्तृत तैनाती मार्गदर्शिका** देखें: [Cloudflare](https://doc.oplist.org/guide/installation/worker#deploy-to-cloudflare-workers) · [EdgeOne](https://doc.oplist.org/guide/installation/worker#deploy-to-edgeone) · [ESA](https://doc.oplist.org/guide/installation/worker#deploy-to-alibaba-cloud-esa)


## विशेषताएँ

OpenList एक बहु-स्टोरेज एग्रीगेशन फ़ाइल सूची और प्रबंधन प्रणाली है जो एज कंप्यूटिंग प्लेटफ़ॉर्म पर चलती है। यह विभिन्न क्लाउड ड्राइव, ऑब्जेक्ट स्टोरेज और प्रोटोकॉल सेवाओं में बिखरी फ़ाइलों को एक ही इंटरफ़ेस में एकीकृत करती है, जिससे ब्राउज़िंग, पूर्वावलोकन, डाउनलोड और प्रबंधन संभव होता है।

OpenList-Worker आधिकारिक [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList) परियोजना का TypeScript + Serverless पोर्ट है। बैकएंड को Go से Workers पर चलने वाली TypeScript सेवा में फिर से लिखा गया है, जबकि फ्रंटएंड एक सुसंगत इंटरफ़ेस और इंटरैक्शन अनुभव बनाए रखता है।

### स्टोरेज एग्रीगेशन

अंतर्निहित **78 स्टोरेज ड्राइवर**, विभिन्न स्टोरेज बैकएंड को तुरंत माउंट करने के लिए तैयार:

- **घरेलू क्लाउड ड्राइव**: Aliyundrive（ओपन प्लेटफ़ॉर्म/शेयर）、Quark（ओपन प्लेटफ़ॉर्म/UC TV）、Baidu Netdisk（एल्बम）、115（ओपन प्लेटफ़ॉर्म/शेयर）、123 Pan（ओपन प्लेटफ़ॉर्म/शेयर）、Tianyi Cloud（189/PC/TV）、China Mobile Cloud（139/Hecaiyun）、Wopan、Thunder、Tencent Weiyun、Lanzou、PikPak（शेयर）、Doubao、Guangyapan、Chaoxing Group、Lenovo NAS शेयर、Teambition、WPS Cloud、Alibaba Docs、HalalCloud、MediaTrack आदि
- **अंतर्राष्ट्रीय क्लाउड ड्राइव**: Google Drive（एल्बम）、OneDrive（ऐप/शेयर लिंक）、Dropbox、MEGA、MediaFire、Proton Drive、Yandex Disk、Degoo、Bunny Storage、TeraBox आदि
- **ऑब्जेक्ट स्टोरेज**: S3-संगत（AWS/OSS/COS/MinIO आदि）、UpYun USS、Azure Blob、WebDAV、FTP、SFTP、SMB、IPFS आदि
- **कोड होस्टिंग**: GitHub、GitHub Releases、CNB Releases
- **क्लाउड ड्राइव प्रोग्राम**: OpenList（शेयर）、AList V3、Cloudreve V3/V4、Kodbox、Seafile、Teldrive、Febbox आदि
- **अन्य ड्राइवर**: Netease Music、Misskey、Emby、Cloudflare इमेज होस्टिंग आदि

उपरोक्त वास्तविक स्टोरेज के अलावा, स्थानीय माउंट, पता उपनाम, URL सूची, एन्क्रिप्टेड स्टोरेज और विभाजन जैसे परिदृश्यों के लिए `Local`、`Alias`、`UrlTree`、`AutoIndex`、`Strm`、`Crypt`、`Virtual`、`Chunk` जैसे वर्चुअल/कार्यात्मक ड्राइवर भी प्रदान किए गए हैं।

### मुख्य क्षमताएँ

- **फ़ाइल ब्राउज़िंग**: एकीकृत निर्देशिका ट्री ब्राउज़िंग, जिसमें छवियों, वीडियो, ऑडियो, दस्तावेज़ों, कोड, संग्रहों आदि का ऑनलाइन पूर्वावलोकन शामिल है।
- **अपलोड और डाउनलोड**: क्रॉस-स्टोरेज अपलोड, बैच डाउनलोड, स्ट्रीमिंग और डायरेक्ट-लिंक रीडायरेक्ट।
- **फ़ाइल साझाकरण**: समाप्ति, पासवर्ड और अनुमति नियंत्रण के साथ साझाकरण लिंक बनाना, अनाम पहुंच और निर्देशिका साझाकरण का समर्थन करता है।
- **पूर्ण-पाठ खोज**: अनुक्रमित स्टोरेज में फ़ाइलों की त्वरित खोज।
- **ऑफ़लाइन कार्य**: बैकग्राउंड कार्य कतार, बैच संचालन और अतुल्यकालिक प्रसंस्करण का समर्थन करती है।
- **बाहरी इंटरफ़ेस**: एग्रीगेटेड स्टोरेज को WebDAV या S3-संगत प्रोटोकॉल के माध्यम से उजागर करना, ताकि तृतीय-पक्ष टूल में माउंट किया जा सके।
- **MCP सेवा**: Model Context Protocol एंडपॉइंट प्रदान करता है, जिसे AI सहायक और अन्य क्लाइंट एकीकृत और कॉल कर सकते हैं।

### पहुंच प्रबंधन

- **अनुमतियाँ**: भूमिका-आधारित पहुंच नियंत्रण（RBAC）, उपयोगकर्ता समूहों, निर्देशिका-स्तरीय पढ़ने/लिखने की अनुमतियों और कोटा का समर्थन करता है।
- **प्रमाणीकरण**: अंतर्निहित खाता पासवर्ड, TOTP सत्यापन, WebAuthn/FIDO लॉगिन, SSO सिंगल साइन-ऑन और LDAP निर्देशिका प्रमाणीकरण का समर्थन करता है।
- **सुरक्षा सुदृढ़ीकरण**: JWT सत्र, CSRF सुरक्षा, क्लिकजैकिंग सुरक्षा（X-Frame-Options）, कंटेंट सिक्योरिटी पॉलिसी（CSP）.
- **स्वास्थ्य जाँच**: निगरानी और अलर्ट के लिए `/health` लाइवनेस प्रोब और `/healthz` रेडीनेस प्रोब प्रदान करता है।

### प्लेटफ़ॉर्म तैनाती

- **रनटाइम प्लेटफ़ॉर्म**: Cloudflare Workers、Tencent Cloud EdgeOne Makers、Vercel、Serverless और Node.js कंटेनर वातावरण।
- **डेटा स्टोरेज**: Cloudflare D1（SQLite）प्राथमिक, साथ ही MySQL、MariaDB、PostgreSQL、SQL Server का समर्थन करता है।
- **स्थायी कैश**: Cloudflare KV / EdgeOne Blob（वैकल्पिक）, कॉन्फ़िगरेशन स्थायित्व और कैशिंग के लिए।
- **एक-क्लिक तैनाती**: EdgeOne、Cloudflare Workers और अन्य प्लेटफ़ॉर्म पर एक-क्लिक तैनाती बटन + प्रारंभिकरण का समर्थन करता है।

---

## मैन्युअल तैनाती

### पूर्वापेक्षाएँ

- Node.js 18+（pnpm अनुशंसित）
- Cloudflare खाता（Workers पर तैनात करने के लिए）

### स्थानीय विकास

```bash
# 1. निर्भरताएँ स्थापित करें
pnpm install

# 2. wrangler.toml कॉन्फ़िगर करें（JWT_SECRET, KV/D1 बाइंडिंग भरें）

# 3. विकास सर्वर शुरू करें（आधिकारिक फ्रंटएंड को स्वचालित रूप से प्राप्त करता है और Worker चलाता है）
pnpm run dev:unified

# या केवल Worker चलाएँ（फ्रंटएंड प्राप्त किए बिना）
pnpm run dev:worker
```

### उत्पादन तैनाती

```bash
# एक-क्लिक तैनाती: सुनिश्चित करें कि KV namespace मौजूद है → आधिकारिक फ्रंटएंड प्राप्त करें → Cloudflare Workers पर तैनात करें
pnpm run deploy

# या Worker को सीधे तैनात करें（KV जाँच और फ्रंटएंड बिल्ड छोड़ें）
pnpm run deploy:worker
```

---

## तकनीकी संरचना

### बैकएंड

- **रनटाइम वातावरण**: Cloudflare Workers（Edge Computing）
- **वेब फ्रेमवर्क**: Hono.js
- **डेटाबेस**: Cloudflare D1（SQLite）/ MySQL、MariaDB、PostgreSQL、SQL Server का समर्थन करता है
- **कैश**: Cloudflare KV（वैकल्पिक）
- **भाषा**: TypeScript
- **बिल्ड टूल**: Wrangler、esbuild

### फ्रंटएंड

- **फ्रेमवर्क**: React 19 + TypeScript
- **UI लाइब्रेरी**: Ant Design / Material-UI
- **बिल्ड टूल**: Vite

---


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
