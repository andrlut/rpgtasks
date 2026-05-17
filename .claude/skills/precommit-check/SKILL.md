---
name: precommit-check
description: Roda typecheck (`npx tsc --noEmit`) + lint (`npx expo lint`) no diretório `app/` do repo `rpgtasks` e reporta resultado consolidado. Use antes de qualquer commit/PR pra evitar CI vermelho. Use quando o user pedir "roda os checks", "verifica TS", "antes de PR", "pre-commit", "passa o lint", ou explicitamente invocar `/precommit-check`. NÃO use pra outros projetos — config é específica deste repo.
---

# /precommit-check

Skill leve — só roda as 2 validações que o CI roda (`Typecheck & Lint` workflow) e dá feedback agrupado.

## Quando invocar

- "Roda os checks", "verifica TS", "passa o lint"
- "Antes de abrir PR" (sub-step de `/pr-cycle`)
- User invoca explicitamente `/precommit-check`
- Depois de mudanças grandes em arquivos `.ts`/`.tsx`/`.json`

## Quando NÃO invocar

- Mudanças só em `.md`, `.sql`, ou config (CI vai pular pra eles? — não, mas o check passa instant)
- User está exploring/researching (não tá pra commitar)

## Configurações fixas

```
Working dir:       <repo-root>/app
TS command:        npx tsc --noEmit
Lint command:      npx expo lint
CI workflow:       .github/workflows/ci.yml — "Typecheck & Lint"
```

## Pré-requisitos

- `pnpm install` rodado pelo menos 1x (verificar `app/node_modules` existe)
- Branch atual qualquer (skill é read-only)

## Processo

### Passo 1 — Typecheck

```powershell
cd app
npx tsc --noEmit 2>&1
```

Capturar exit code. Se ≠ 0:
- Agrupar erros por arquivo (formato: `file.ts(line,col): error TSxxxx: message`)
- Reportar resumo + primeiras 3 ocorrências por arquivo

### Passo 2 — Lint

```powershell
npx expo lint 2>&1
```

Capturar exit code. Erros comuns deste repo:
- `react/no-unescaped-entities`: apóstrofo/aspa dentro de `<Text>` — escapar com `&apos;` `&quot;` ou reformular
- `react-hooks/exhaustive-deps`: deps faltando em useEffect — adicionar à array
- `@typescript-eslint/no-unused-vars`: var declarada e não usada — remover ou prefixar com `_`

### Passo 3 — Reporte consolidado

Se ambos passaram:

```
✅ Pre-commit OK
  - Typecheck: clean
  - Lint:      clean
Pronto pra commit/PR.
```

Se algum falhou:

```
❌ Pre-commit FALHOU

Typecheck: <n> erros em <m> arquivos
  app/components/X.tsx
    L42:5  error TS2322: Type 'string' is not assignable to type 'number'
    L58:12 error TS2304: Cannot find name 'foo'
  app/lib/api/y.ts
    ...

Lint: <n> erros em <m> arquivos
  app/app/(tabs)/home.tsx
    L93  react/no-unescaped-entities: ' must be escaped

Corrija e rode de novo.
```

## Notas importantes

- **TS roda no diretório `app/`** — `tsconfig.json` desse repo é dividido entre `app/` e `shared/`. CI roda em ambos; nesse skill cobrimos só `app/` (shared raramente quebra TS).
- **Lint só roda no `app/`** — `expo lint` é específico do projeto Expo.
- **`expo lint` aceita `--fix`** se o user quiser auto-correção de regras simples. Não roda fix por default — skill é informativo.
- **Erros do lint podem ser muitos**: limitar reporte a primeiros 10. Se tiver 50+ erros, sinalizar que provavelmente é problema sistemático (ex: regra nova ativada, lint config mudou).

## Quando algo der errado

| Sintoma | Causa provável | Ação |
|---|---|---|
| `npx: command not found` | Node não instalado | Instalar Node 20+ |
| `Cannot find module 'typescript'` | `pnpm install` não rodado | Rodar `pnpm install` na raiz |
| `tsc` retorna 5+ min depois | Cache TS corrompido | `rm -r app/.tsbuildinfo`; re-rodar |
| Lint passa local mas CI quebra | Versões diferentes (Node/eslint) | Conferir `package.json` engines + Node local |
