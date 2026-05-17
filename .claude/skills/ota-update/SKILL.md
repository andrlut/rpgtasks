---
name: ota-update
description: Publica hotfix JS-only no APK live do `rpgtasks` via `eas update --channel preview` — sem rebuild nativo. Confirma que mudança é JS/TS-only antes de pushar, roda o update, e reporta o update ID e tempo estimado de propagação. Use quando o user pedir "manda update", "hotfix", "atualiza APK", "joga update preview", "manda OTA", "publica sem build", ou explicitamente invocar `/ota-update`. NÃO use pra mudanças nativas (precisa `eas build`).
---

# /ota-update

Skill de deploy leve — atualiza JS/TS do APK live sem rebuild. ~30s vs 15min de `eas build`. Pré-condição forte: mudança DEVE ser JS-only.

## Quando invocar

- "Manda update", "hotfix preview", "OTA", "atualiza APK sem build"
- Bug fix JS pequeno + main acabou de mergear + Artur ou você quer testar imediatamente
- User invoca `/ota-update`

## Quando NÃO invocar

- Mudou `package.json` (dependência nova/atualizada) — exige rebuild
- Mudou `app/app.json` ou `app/app.config.js` (config nativa) — exige rebuild
- Mudou pasta `android/` ou `ios/` (não temos, mas se aparecer) — exige rebuild
- Adicionou módulo nativo novo — exige rebuild
- Bump da versão do Expo SDK — exige rebuild

## Configurações fixas

```
Working dir:    <repo-root>/app
EAS channel:    preview
EAS profile:    preview
Project ref:    Expo cloud project (definido em eas.json)
```

## Pré-requisitos

- `$env:EXPO_TOKEN` setado (auth não-interativa do EAS)
- Branch atual = main (não pushar updates de feature branch)
- `git status` limpo (sem mudanças não commitadas)
- `eas` CLI instalado (`eas --version`)

## Processo (4 passos)

### Passo 1 — Verificar segurança da mudança

Olhar os últimos commits e arquivos mudados:

```powershell
cd "C:/Users/André Luthold/Projetos/RPG"
$lastCommitFiles = git diff --name-only HEAD~5 HEAD
```

Procurar por flags que exigem rebuild:

- `package.json` ou `pnpm-lock.yaml` (deps novas)
- `app/app.json`, `app/app.config.js`, `app/app.config.ts` (config Expo)
- `app/eas.json` (config EAS)
- `android/`, `ios/` (código nativo)
- Pasta `node_modules/` referenciada em algum import novo

Se algum flag aparecer, **abortar** com mensagem:

```
❌ Detectado mudança que exige rebuild:
  - <arquivo>

Use `eas build --profile preview` em vez de OTA update.
```

### Passo 2 — Confirmar com user

Mesmo após auto-check passar, mostrar ao user o que vai ser pushado:

```
✅ Mudança parece JS/TS-only:
  - <N> arquivos JS/TS modificados nos últimos <M> commits

Vou rodar `eas update --channel preview` agora. Confirma?
```

Aguardar confirmação se modo interactive; pular se invocado explicitamente como `/ota-update --auto`.

### Passo 3 — Publicar update

```powershell
cd app
eas update --channel preview --message "<auto-derivado do último commit>" --non-interactive
```

Capturar output. Extrair `updateGroupId` (ou equivalente) e `updateUrl`.

### Passo 4 — Reporte

```
📡 OTA update publicado!

  Channel:        preview
  Update ID:      <id>
  Message:        <commit message>
  Tempo:          ~<X>s

📌 Usuários do APK preview vão ver na próxima abertura do app.
   Não há rebuild — APK não muda, só o JS bundle.

⚠️ Se algo quebrar no app, rollback é:
   `eas update --channel preview --republish --group <previous-group-id>`
```

## Notas importantes

- **OTA só funciona se o APK tem expo-updates configurado** — confirmado no CLAUDE.md, instalado e funcionando neste repo.
- **Não substituir rebuild quando há mudança nativa**: tentativa silenciosa de OTA com mudança nativa = update publica mas APK ignora (incompatibilidade SDK).
- **Channel `preview` é o testing channel** — produção real seria channel `production` (não setado ainda). Pra esse repo, todos os usuários estão em `preview`.
- **Rollback é via republish do grupo anterior**, não delete — Expo não suporta delete de update grupo.

## Quando algo der errado

| Sintoma | Causa provável | Ação |
|---|---|---|
| `eas: command not found` | EAS CLI não instalado | `npm i -g eas-cli` |
| Auth error | `EXPO_TOKEN` expirado | Renovar token em https://expo.dev/accounts/.../settings/access-tokens |
| Update publica mas APK não pega | App não tinha `expo-updates` no momento do build | Rebuilds com EAS são necessários |
| Update quebra app no startup | JS bundle incompatível | Rollback via republish do grupo anterior |
| `eas update` retorna erro de version | runtimeVersion mudou entre APK e update | Rebuild necessário |
