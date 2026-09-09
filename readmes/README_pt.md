<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>O OpenList é uma ferramenta de listagem de diretórios que suporta a montagem de várias unidades de nuvem, com dezenas de backends de armazenamento em nuvem, gerenciamento de arquivos, compartilhamento e muito mais.</em></p>

  <p>Este repositório é o porte oficial TypeScript + Serverless do projeto <a href="https://github.com/OpenListTeam/OpenList">OpenListTeam/OpenList</a>.</p>
  <p>Executa no Cloudflare Workers / EdgeOne Cloud Function.</p>

<a href="https://github.com/OpenListTeam/OpenList/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList" alt="License" /></a>
<a href="https://github.com/OpenListTeam/OpenList/actions?query=workflow%3ABuild"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList/build.yml?branch=main" alt="Build status" /></a>
<a href="https://github.com/OpenListTeam/OpenList/releases"><img src="https://img.shields.io/github/release/OpenListTeam/OpenList" alt="latest version" /></a>

<a href="https://github.com/OpenListTeam/OpenList/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList?color=%23ED8936" alt="discussions" /></a>
<a href="https://github.com/OpenListTeam/OpenList/releases"><img src="https://img.shields.io/github/downloads/OpenListTeam/OpenList/total?color=%239F7AEA&logo=github" alt="Downloads" /></a>

</div>

<div align="center">

[English](README_en.md) | [中文](../README.md) | [日本語](README_ja.md) | [한국어](README_ko.md) | [Français](README_fr.md) | [Deutsch](README_de.md) | [Español](README_es.md) | Português（este arquivo） | [Русский](README_ru.md) | [العربية](README_ar.md) | [Italiano](README_it.md)

[Projeto upstream](https://github.com/OpenListTeam/OpenList) · [Guia de contribuição](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CONTRIBUTING.md) · [Código de conduta](https://github.com/OpenListTeam/OpenList-Worker/blob/main/CODE_OF_CONDUCT.md) · [Licença](../LICENSE)

[🌎 Demo global](https://new.oplist.org) 　|　 [🇨🇳 Demo China](https://new.oplist.org.cn)

</div>

---

## Implantação em um clique

Clique no botão abaixo para implantar este projeto na plataforma correspondente com um clique：

<div align="center">

| EdgeOne Makers · Internacional | EdgeOne Makers · China | Cloudflare Workers · Global |
| :---: | :---: | :---: |
| [![Implantar no EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Implantar no EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?project-name=openlist-tsworker&repository-url=https://github.com/OpenListTeam/OpenList-Worker&install-command=pnpm%20install%20--no-frozen-lockfile&build-command=pnpm%20run%20build&output-directory=dist&env=ENCRYPTION_SECRET,JWT_SECRET) | [![Implantar no Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OpenListTeam/OpenList-Worker) |

</div>

> [!IMPORTANT]
> Após a implantação, a primeira visita ao site iniciará automaticamente o **assistente de instalação**：
>
> Variáveis de ambiente / segredos opcionais：
> - `ENCRYPTION_SECRET`：chave de criptografia estática（recomendados ≥16 caracteres；usada para criptografar campos sensíveis）
> - `JWT_SECRET`：chave de assinatura JWT（recomendada；gerada automaticamente e persistida no KV se não configurada）
> - `CRON_SECRET`：chave de autenticação para tarefas de atualização agendadas（opcional，necessária apenas para tarefas agendadas do EdgeOne）

## Funcionalidades

O OpenList-Worker é um sistema de listagem e gerenciamento de arquivos multi-armazenamento que roda em plataformas de computação de borda，unificando arquivos dispersos em diferentes unidades de nuvem，armazenamento de objetos e serviços de protocolo em uma única interface para navegar，visualizar，baixar e gerenciar.

### Sobre o porte TS

O OpenList-Worker é o porte TypeScript do projeto oficial [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList).

O backend foi reescrito de Go para um serviço TypeScript executado no Workers，enquanto o frontend mantém uma interface e experiência de interação consistentes.

### Agregação de armazenamento

**Mais de 80 drivers de armazenamento** integrados，prontos para montar vários backends de armazenamento：

| Categoria | Backends suportados |
| :--- | :--- |
| Unidades de nuvem domésticas | Aliyundrive（Open/Share），Quark，Baidu Netdisk，115，123 Pan，Thunder，Tianyi Cloud（189），Tencent Weiyun，Lanzou，PikPak，UC Cloud，China Mobile Cloud，139 Cloud，Doubao，Wopan，Tianyi Family Cloud，LeTV Cloud，etc. |
| Unidades de nuvem internacionais | Google Drive，OneDrive（App/ShareLink），Dropbox，MEGA，MediaFire，Proton Drive，Yandex Disk，Degoo，Bunny Storage，TeraBox，etc. |
| Armazenamento de objetos | Compatível com S3（AWS/OSS/COS/MinIO，etc.），WebDAV，FTP，SFTP，SMB，IPFS，Azure Blob，etc. |
| Hospedagem de código | GitHub，GitHub Releases，CNB Releases |
| Programas de unidade de nuvem | OpenList / AList V3，Cloudreve V3/V4，Kodbox，Seafile，Teldrive，Febbox，etc. |
| Outros drivers | Netease Music，Misskey，Emby，compartilhamento 115，compartilhamento Aliyundrive，compartilhamento Quark，etc. |

Além dos armazenamentos reais acima，também são fornecidos drivers virtuais/funcionais como `Local`，`Alias`，`UrlTree`，`AutoIndex`，`Strm`，`Crypt`，`Virtual` e `Chunk` para montagens locais，alias de endereços，listas de URL，armazenamento criptografado e divisão em partes.

### Principais recursos

- **Navegação de arquivos**：navegação unificada na árvore de diretórios，com visualização online de imagens，vídeos，áudio，documentos，código，arquivos e muito mais.
- **Upload e download**：upload entre armazenamentos，download em lote，streaming e redirecionamento de link direto.
- **Compartilhamento de arquivos**：gerar links de compartilhamento com expiração，senha e controle de permissão，suportando acesso anônimo e compartilhamento de diretórios.
- **Busca em texto completo**：pesquisa rápida de arquivos em armazenamentos indexados.
- **Tarefas offline**：fila de tarefas em segundo plano com suporte a operações em lote e processamento assíncrono.
- **Interfaces externas**：expor o armazenamento agregado via protocolo WebDAV ou compatível com S3 para montagem em ferramentas de terceiros.
- **Serviço MCP**：fornecer um endpoint de Model Context Protocol que pode ser integrado e chamado por assistentes de IA e outros clientes.

### Gestão de acesso

- **Permissões**：controle de acesso baseado em funções（RBAC），com suporte a grupos de usuários，permissões de leitura/gravação em nível de diretório e cotas.
- **Autenticação**：senhas de conta integradas com verificação TOTP，login WebAuthn/FIDO，login único SSO e autenticação de diretório LDAP.
- **Endurecimento de segurança**：sessões JWT，proteção CSRF，proteção contra clickjacking（X-Frame-Options），Content Security Policy（CSP）.
- **Verificações de saúde**：fornecer uma sonda de vivacidade `/health` e uma sonda de prontidão `/healthz` para monitoramento e alertas.

### Implantação

- **Plataformas de execução**：Cloudflare Workers，Tencent Cloud EdgeOne Makers，Vercel，Serverless e ambientes de contêiner Node.js.
- **Armazenamento de dados**：Cloudflare D1（SQLite）como principal，também compatível com MySQL，MariaDB，PostgreSQL，SQL Server.
- **Cache persistente**：Cloudflare KV / EdgeOne Blob（opcional）para persistência de configuração e cache.
- **Implantação em um clique**：suporta botões de implantação em um clique + inicialização no EdgeOne，Cloudflare Workers e outras plataformas.

---

## Implantação manual

### Pré-requisitos

- Node.js 18+
- Uma conta Cloudflare（para implantar no Workers）

### Desenvolvimento local

```bash
# 1. Instalar dependências do backend
npm install

# 2. Instalar dependências do frontend
npm run install:page

# 3. Configurar o wrangler.jsonc（preencher JWT_SECRET，ligações KV/D1）

# 4. Iniciar o servidor de desenvolvimento do backend
npm run dev

# 5. Iniciar o servidor de desenvolvimento do frontend em outro terminal
npm run dev:page
```

### Implantação em produção

```bash
# Implantação em um clique（build do frontend + implantação do backend no Cloudflare Workers）
npm run deploy
```

---

## Stack tecnológico

### Backend

- **Ambiente de execução**：Cloudflare Workers（Edge Computing）
- **Framework web**：Hono.js
- **Banco de dados**：Cloudflare D1（SQLite）/ compatível com MySQL，MariaDB，PostgreSQL，SQL Server
- **Cache**：Cloudflare KV（opcional）
- **Linguagem**：TypeScript
- **Ferramentas de build**：Wrangler，esbuild

### Frontend

- **Framework**：React 19 + TypeScript
- **Bibliotecas UI**：Ant Design / Material-UI
- **Ferramenta de build**：Vite

---

## Documentação

- 📘 [Documentação oficial](https://doc.oplist.org)
- 🌏 [Espelho da China](https://doc.oplist.org.cn)
- ⚖️ [Termos de uso](https://doc.oplist.org/terms)
- 🔒 [Política de privacidade](https://doc.oplist.org/privacy)

## Suporte

Para perguntas gerais，visite o fórum de [_Discussions_](https://github.com/OpenListTeam/OpenList/discussions). **_Issues_ é apenas para relatórios de bugs e solicitações de recursos.**

## Licença

O `OpenList` é um software de código aberto sob a licença [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt).

## Contato

- [@GitHub](https://github.com/OpenListTeam)
- [Grupo no Telegram](https://t.me/OpenListTeam)
- [Canal no Telegram](https://t.me/OpenListOfficial)

## Colaboradores

Agradecemos sinceramente ao autor do projeto original [AlistGo/alist](https://github.com/AlistGo/alist)，[Xhofe](https://github.com/Xhofe)，e a todos os demais colaboradores.

Obrigado a estas pessoas incríveis：

[![Contributors](https://contrib.rocks/image?repo=OpenListTeam/OpenList-Worker)](https://github.com/OpenListTeam/OpenList-Worker/graphs/contributors)
