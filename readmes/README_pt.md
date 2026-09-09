<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>O OpenList é uma ferramenta de listagem de diretórios rica em recursos que suporta a montagem de dezenas de unidades na nuvem com pré-visualização, download, compartilhamento de arquivos e muito mais</em></p>
  <p>Este repositório é o port oficial TypeScript + Serverless do projeto <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a></p>
  <p>Executa no Cloudflare Workers / EdgeOne Cloud Function / Alibaba Cloud ESA</p>

<a href="https://github.com/OpenListTeam/OpenList-Worker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList-Worker" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/actions/workflows/edgeone-artifact-guard.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList-Worker/edgeone-artifact-guard.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/releases"><img src="https://img.shields.io/github/release/OpenListTeam/OpenList-Worker" alt="latest version" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList-Worker?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList-Worker/releases"><img src="https://img.shields.io/github/downloads/OpenListTeam/OpenList-Worker/total?color=%239F7AEA&logo=github" alt="Downloads" /></a>

📘 [Documentação](https://doc.oplist.org) · 🌏 [Documentação (China continental)](https://doc.oplist.org.cn)  · ⚖️ [Termos de uso](https://doc.oplist.org/terms)  · 🔒 [Política de privacidade](https://doc.oplist.org/privacy)

</div>

<div align="center">

[English](README_en.md) | [简体中文](../README.md) | [繁體中文](README_zh-TW.md) | [日本語](README_ja.md) | [한국어](README_ko.md) | [Français](README_fr.md) | [Deutsch](README_de.md) 

Português | [Русский](README_ru.md) | [العربية](README_ar.md) | [Italiano](README_it.md) | [हिन्दी](README_hi.md) | [Español](README_es.md)

[Projeto upstream](https://github.com/OpenListTeam/OpenList) · [Guia de contribuição](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CONTRIBUTING.md) · [Código de conduta](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CODE_OF_CONDUCT.md) · [Licença](./LICENSE)

[🌎 Demo global](https://new.oplist.org) 　|　 [🇨🇳 Demo China](https://new.oplist.org.cn)

</div>

---

## Implantação em um clique

Clique no botão abaixo para implantar este projeto na plataforma correspondente com um clique:
<div align="center">


| EdgeOne Makers · Internacional | EdgeOne Makers · China | Cloudflare Workers · Global |
| :---: | :---: | :---: |
| [![Implantar no EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Implantar no EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) |

</div>

> [!IMPORTANT]
> - Se o Cloudflare exibir `não é possível obter o conteúdo do repositório`, [bifurque](https://github.com/OpenListTeam/OpenList-Worker/fork) este projeto primeiro e depois implante conectando-se ao repositório do Github
> - Após a implantação, configure as variáveis de ambiente: **EdgeOne**: [Console internacional](https://console.edgeone.ai/makers) · [Console China](https://console.cloud.tencent.com/edgeone/makers); **Cloudflare**: [Painel do Worker](https://dash.cloudflare.com/). Variáveis de ambiente:
>   - `DB_DRIVER`: modo de armazenamento de dados: `json` (padrão) / `d1` (Cloudflare) / `kv` / `mysql`
>   - `DB_JSON_BACKEND`: backend usado pelo formato `json`: `blob` (padrão) / `kv` / `cf_rest`
>   - Para outras variáveis opcionais, consulte o **guia de implantação detalhado**: [Cloudflare](https://doc.oplist.org/guide/installation/worker#deploy-to-cloudflare-workers) · [EdgeOne](https://doc.oplist.org/guide/installation/worker#deploy-to-edgeone) · [ESA](https://doc.oplist.org/guide/installation/worker#deploy-to-alibaba-cloud-esa)


## Funcionalidades

O OpenList é um sistema de listagem e gerenciamento de arquivos multi-armazenamento que roda em plataformas de computação de borda. Ele unifica arquivos dispersos em diferentes unidades na nuvem, armazenamento de objetos e serviços de protocolo em uma única interface para navegar, visualizar, baixar e gerenciar.

O OpenList-Worker é o port oficial TypeScript + Serverless do projeto [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList). O backend foi reescrito de Go para um serviço TypeScript executado no Workers, enquanto o frontend mantém uma interface e experiência de interação consistentes.

### Agregação de armazenamento

**78 drivers de armazenamento** integrados, prontos para montar vários backends de armazenamento:

- **Unidades de nuvem domésticas**: Aliyundrive (Open/Share), Quark (Open/UC TV), Baidu Netdisk (Álbum), 115 (Open/Share), 123 Pan (Open/Share), Tianyi Cloud (189/PC/TV), China Mobile Cloud (139/Hecaiyun), Wopan, Thunder, Tencent Weiyun, Lanzou, PikPak (Share), Doubao, Guangyapan, Chaoxing Group, Lenovo NAS Share, Teambition, WPS Cloud, Alibaba Docs, HalalCloud, MediaTrack, etc.
- **Unidades de nuvem internacionais**: Google Drive (Álbum), OneDrive (App/ShareLink), Dropbox, MEGA, MediaFire, Proton Drive, Yandex Disk, Degoo, Bunny Storage, TeraBox, etc.
- **Armazenamento de objetos**: Compatível com S3 (AWS/OSS/COS/MinIO, etc.), UpYun USS, Azure Blob, WebDAV, FTP, SFTP, SMB, IPFS, etc.
- **Hospedagem de código**: GitHub, GitHub Releases, CNB Releases
- **Programas de unidade de nuvem**: OpenList (Share), AList V3, Cloudreve V3/V4, Kodbox, Seafile, Teldrive, Febbox, etc.
- **Outros drivers**: Netease Music, Misskey, Emby, Cloudflare Image Hosting, etc.

Além dos armazenamentos reais acima, também são fornecidos drivers virtuais/funcionais como `Local`, `Alias`, `UrlTree`, `AutoIndex`, `Strm`, `Crypt`, `Virtual` e `Chunk` para montagens locais, alias de endereços, listas de URL, armazenamento criptografado e divisão em partes.

### Principais recursos

- **Navegação de arquivos**: navegação unificada na árvore de diretórios, com visualização online de imagens, vídeos, áudio, documentos, código, arquivos e muito mais.
- **Upload e download**: upload entre armazenamentos, download em lote, streaming e redirecionamento de link direto.
- **Compartilhamento de arquivos**: gerar links de compartilhamento com expiração, senha e controle de permissão, suportando acesso anônimo e compartilhamento de diretórios.
- **Busca em texto completo**: pesquisa rápida de arquivos em armazenamentos indexados.
- **Tarefas offline**: fila de tarefas em segundo plano com suporte a operações em lote e processamento assíncrono.
- **Interfaces externas**: expor o armazenamento agregado via protocolo WebDAV ou compatível com S3 para montagem em ferramentas de terceiros.
- **Serviço MCP**: fornecer um endpoint de Model Context Protocol que pode ser integrado e chamado por assistentes de IA e outros clientes.

### Gestão de acesso

- **Permissões**: controle de acesso baseado em funções (RBAC), com suporte a grupos de usuários, permissões de leitura/gravação em nível de diretório e cotas.
- **Autenticação**: senhas de conta integradas com verificação TOTP, login WebAuthn/FIDO, login único SSO e autenticação de diretório LDAP.
- **Endurecimento de segurança**: sessões JWT, proteção CSRF, proteção contra clickjacking (X-Frame-Options), Content Security Policy (CSP).
- **Verificações de saúde**: fornecer uma sonda de vivacidade `/health` e uma sonda de prontidão `/healthz` para monitoramento e alertas.

### Implantação em plataformas

- **Plataformas de execução**: Cloudflare Workers, Tencent Cloud EdgeOne Makers, Vercel, Serverless e ambientes de contêiner Node.js.
- **Armazenamento de dados**: Cloudflare D1 (SQLite) como principal, também compatível com MySQL, MariaDB, PostgreSQL, SQL Server.
- **Cache persistente**: Cloudflare KV / EdgeOne Blob (opcional) para persistência de configuração e cache.
- **Implantação em um clique**: suporta botões de implantação em um clique + inicialização no EdgeOne, Cloudflare Workers e outras plataformas.

---

## Implantação manual

### Pré-requisitos

- Node.js 18+ (pnpm recomendado)
- Uma conta Cloudflare (para implantar no Workers)

### Desenvolvimento local

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar o wrangler.toml (preencher JWT_SECRET, ligações KV/D1)

# 3. Iniciar o servidor de desenvolvimento (obtém automaticamente o frontend oficial e executa o Worker)
pnpm run dev:unified

# Ou executar apenas o Worker (sem obter o frontend)
pnpm run dev:worker
```

### Implantação em produção

```bash
# Implantação em um clique: garantir que o namespace KV exista → obter o frontend oficial → implantar no Cloudflare Workers
pnpm run deploy

# Ou implantar diretamente o Worker (pular a verificação de KV e a compilação do frontend)
pnpm run deploy:worker
```

---

## Stack tecnológico

### Backend

- **Ambiente de execução**: Cloudflare Workers (Edge Computing)
- **Framework web**: Hono.js
- **Banco de dados**: Cloudflare D1 (SQLite) / compatível com MySQL, MariaDB, PostgreSQL, SQL Server
- **Cache**: Cloudflare KV (opcional)
- **Linguagem**: TypeScript
- **Ferramentas de build**: Wrangler, esbuild

### Frontend

- **Framework**: React 19 + TypeScript
- **Bibliotecas UI**: Ant Design / Material-UI
- **Ferramenta de build**: Vite

---


## Suporte

Se você encontrar algum problema, há ajuda disponível através dos seguintes canais:

- 🐛 **Relatórios de bugs ou solicitações de recursos**: visite [_Issues_](https://github.com/OpenListTeam/OpenList-Worker/issues)
- 💬 **Perguntas gerais e discussão**: visite o fórum de [_Discussions_](https://github.com/OpenListTeam/OpenList/discussions)

## Licença

O `OpenList` é um software de código aberto sob a licença [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt).


## Contato

🌐 [@GitHub](https://github.com/OpenListTeam) · ✈️ [Grupo no Telegram](https://t.me/OpenListTeam) · ✈️ [Canal no Telegram](https://t.me/OpenListOfficial)

## Colaboradores

Obrigado aos seguintes projetos e seus colaboradores:

- O autor e todos os colaboradores de [Alist](https://github.com/AlistGo/alist)
- O autor e todos os colaboradores de [OpenList](https://github.com/OpenListTeam/OpenList) (versão Go)
- Todos os colaboradores deste projeto:

[![Contributors](https://contrib.rocks/image?repo=OpenListTeam/OpenList-Worker)](https://github.com/OpenListTeam/OpenList-Worker/graphs/contributors)
