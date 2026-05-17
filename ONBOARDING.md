# Onboarding — RPG Tasks (Claude Code)

Bem-vindo. Esse doc é o setup completo pra você começar a contribuir no RPG Tasks com o Claude Code. Lê tudo uma vez antes de rodar comandos — tem armadilha de BD compartilhado no final que é importante.

---

## 1. O que é esse projeto

App Android de hábitos + bem-estar com mecânicas de RPG (XP, moedas, skills, quests). Stack: React Native + Expo SDK 54 + TypeScript + Supabase (Postgres + Auth). Detalhes técnicos completos estão no [CLAUDE.md](CLAUDE.md) na raiz — o Claude Code lê esse arquivo automaticamente toda vez que você abre o repo, então não precisa decorar.

**V2 em produção, V3 em planejamento.** O roadmap dos 3 pilares (Identidade Percebida / Praticada / Desejada) está no CLAUDE.md também.

---

## 2. Pré-requisitos da máquina

Instala antes de tudo:

- **Node.js 20+** — recomendo via [Volta](https://volta.sh/) ou [fnm](https://github.com/Schniz/fnm)
- **pnpm 10+** — `npm i -g pnpm`
- **Git** e **GitHub CLI** (`gh`) — precisa estar logado: `gh auth login`
- **Claude Code** — você já tem
- **Expo Go** no celular (Play Store) — pra testar o app no seu Android
- **Supabase CLI** — no Windows é binário standalone:
  - Baixa em https://github.com/supabase/cli/releases
  - Coloca em `%LOCALAPPDATA%\supabase\supabase.exe`
  - Adiciona `%LOCALAPPDATA%\supabase` ao PATH (env var de usuário)
- **EAS CLI** — `npm i -g eas-cli` (pra builds de APK)

Docker **não é necessário** — não rodamos Supabase local, a gente usa direto a instância cloud compartilhada.

---

## 3. Clone e instalação

```powershell
git clone https://github.com/andrlut/rpgtasks.git
cd rpgtasks
pnpm install
```

Cria o `.env.local` do app:

```powershell
Copy-Item app\.env.example app\.env.local
```

Edita `app\.env.local` e preenche os dois valores. **Peça pro André** te mandar:

```
EXPO_PUBLIC_SUPABASE_URL=https://uneqnpyzevosznwkmvvo.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<ele te manda>
```

A publishable key é safe no client (RLS protege), só não comita ela no git (o `.env.local` já está no `.gitignore`).

---

## 4. Tokens de máquina (env vars persistentes)

Dois tokens vivem como **env vars de usuário no Windows** (não no `.env.local`, não no repo). Você cria eles uma vez e todo terminal novo enxerga:

### `SUPABASE_ACCESS_TOKEN`
Personal Access Token do Supabase, usado pelo `supabase` CLI.

1. Loga em https://supabase.com/dashboard/account/tokens
2. Cria um token novo com seu nome (ex: "felipe-machine")
3. Salva como user env var:
   ```powershell
   [Environment]::SetEnvironmentVariable("SUPABASE_ACCESS_TOKEN", "<seu-token>", "User")
   ```
4. Fecha e reabre o terminal — `echo $env:SUPABASE_ACCESS_TOKEN` deve mostrar o valor.

Linka o CLI ao projeto cloud:
```powershell
supabase link --project-ref uneqnpyzevosznwkmvvo
```

### `EXPO_TOKEN`
Pra rodar `eas build` e `eas update` sem login interativo.

1. Loga em https://expo.dev/accounts/[teu-user]/settings/access-tokens
2. Cria token
3. Salva:
   ```powershell
   [Environment]::SetEnvironmentVariable("EXPO_TOKEN", "<seu-token>", "User")
   ```

---

## 5. Rodar o app

```powershell
cd app
pnpm dev
```

Escaneia o QR com Expo Go. Mesma Wi-Fi que a máquina. Se não encontrar a rede: `pnpm dev --tunnel`.

Se rotas novas não aparecerem (tela "Unmatched Route"), reinicia com `pnpm dev --clear` pra limpar o cache do Metro.

---

## 6. Configurar o Claude Code

### Permissions recomendadas

Adiciona no `~/.claude/settings.json` (caminho real no Windows: `C:\Users\<seu-user>\.claude\settings.json`):

```json
{
  "permissions": {
    "allow": [
      "Bash(git:*)",
      "Bash(gh:*)",
      "Bash(pnpm:*)",
      "Bash(npm:*)",
      "Bash(npx:*)",
      "Bash(ls:*)",
      "Bash(mkdir:*)",
      "Bash(mv:*)",
      "Bash(rm:*)",
      "Bash(touch:*)",
      "Bash(chmod:*)",
      "Bash(supabase:*)",
      "Bash(eas:*)",
      "Bash(expo:*)",
      "Bash(curl:*)",
      "Write(*)",
      "Update(*)"
    ],
    "deny": []
  },
  "autoUpdatesChannel": "latest",
  "theme": "dark"
}
```

Isso evita ele te perguntar permissão pra todo comando comum. Mantém `deny` vazio — pra coisas perigosas (ex: `git push --force`, `rm -rf`), ele te pergunta de qualquer jeito.

### Memória pessoal

O Claude tem memória persistente em `~/.claude/projects/<slug>/memory/`. Não precisa fazer nada — conforme você conversa, ele vai aprendendo seu estilo. Se quiser ver o que ele lembrou: `cat ~/.claude/projects/*/memory/MEMORY.md`.

---

## 7. Workflow do repo

Convenções (também listadas no CLAUDE.md):

- **Branches**: `feat/<short>`, `fix/<short>`, `chore/<short>`, `docs/<short>`
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:`)
- **Co-author trailer**: todo commit feito com Claude termina com
  ```
  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```
  O Claude Code adiciona isso automaticamente.
- **PRs**: abre com `gh pr create`, merge com `gh pr merge <n> --squash --admin --delete-branch`
- **Após merge**: `git switch main && git pull --rebase`

### Pre-commit (sempre antes de abrir PR)

```powershell
cd app
npx tsc --noEmit
npx expo lint
```

Os dois precisam passar limpo. Lint pega `react/no-unescaped-entities` (apóstrofos/aspas dentro de `<Text>`) — escapa com entidade HTML ou reformula a string.

---

## 8. ⚠️ REGRA CRÍTICA — BD compartilhado

**Existe UMA única instância do Supabase** (`uneqnpyzevosznwkmvvo`), e nós dois apontamos pra ela. Mas as **migrations vivem como arquivos locais** em cada máquina até serem commitadas no git. Isso já causou problema uma vez.

### Fluxo correto pra mexer no schema

```powershell
# 1. SEMPRE comece sincronizado
git pull --rebase

# 2. Cria a migration nova
# Arquivo em supabase/migrations/<timestamp>_<nome>.sql
# Use timestamp real do momento, formato: YYYYMMDDHHMMSS

# 3. Aplica na cloud
cd "C:\caminho\pra\rpgtasks"
supabase db push --linked

# 4. IMEDIATAMENTE commita o arquivo .sql e empurra
git add supabase/migrations/<arquivo>.sql
git commit -m "feat(db): <descricao>"
git push
```

**Por que essa ordem importa**: se você roda `db push` sem ter commitado o arquivo no git, a cloud registra a migration mas o repo do outro dev não tem o `.sql`. Aí quando ele tenta fazer um push depois, o CLI vê "histórico divergente" e barra tudo.

**Se isso acontecer com você** (o outro tem migration que sua máquina não tem):
- **NÃO use** `supabase migration repair --status reverted` — isso só apaga o registro de histórico, o schema continua aplicado, e quando o outro pushar de novo, vai dar conflito.
- A resolução correta é pedir pra ele commitar e pushar o `.sql` dele, daí você dá `git pull` e o `db push` passa limpo.

**Regra de ouro**: nunca rode `db push` se você não tiver acabado de dar `git pull`. E commita o `.sql` na mesma hora.

### Migrations são write-once

Nunca edita uma migration já mergeada. Adiciona uma nova. As migrations existentes usam `IF EXISTS` / guards idempotentes onde possível, mas mesmo assim — não edita.

### Pra coordenar mudanças no mesmo dia

Se nós dois estivermos mexendo em schema no mesmo dia, comunica antes (WhatsApp, qualquer coisa) — quem vai pushar primeiro. Idealmente migrations potencialmente conflitantes (mexem na mesma tabela) saem em PRs serializados, não em paralelo.

---

## 9. Receitas comuns

| Quero | Como |
|---|---|
| Adicionar feature com schema | Nova migration → `supabase db push --linked` → commit |
| Adicionar tela nova | Arquivo em `app/app/`, registra em `app/app/_layout.tsx` `<Stack>` |
| Adicionar hook de API | Arquivo em `app/lib/api/<domain>.ts`, segue padrão dos vizinhos |
| Componente UI novo | Arquivo em `app/components/`, usa tokens de `app/theme` |
| Mudar cores/spacing/radii | `app/theme/tokens.ts` (single source of truth) |
| Buildar APK | `cd app && eas build --platform android --profile preview --non-interactive --no-wait` |
| Hotfix JS-only no APK live | `cd app && eas update --channel preview` (sem rebuild, ~30s vs 15min) |

**Prefira `eas update` sobre `eas build`** sempre que a mudança for só JS/TS — economiza ~15min por iteração. Só mudanças nativas (pacote novo, módulo nativo, version bump) exigem rebuild.

---

## 10. Estrutura mental do código

```
app/                 # Expo React Native app
├── app/             # Rotas (file-based via Expo Router)
│   ├── (tabs)/      # Tabs principais
│   ├── skill/[id]   # Telas dinâmicas
│   └── _layout.tsx  # AuthGate + Stack
├── components/      # Componentes reutilizáveis
├── lib/
│   ├── api/         # Hooks TanStack Query (um arquivo por domínio)
│   ├── auth/        # Session + deep-link
│   ├── db/          # Tipos TS do schema
│   ├── i18n/        # pt-BR (default) + en-US
│   └── supabase/    # Client
└── theme/           # tokens.ts, dimensions.ts

supabase/migrations/  # SQL migrations (write-once)
shared/               # Tipos cross-cutting (@rpgtasks/shared)
```

Bilingue: toda coluna user-facing em catálogo tem versão `_pt` (e às vezes `_en`). Cliente escolhe por `character.locale`.

---

## 11. Onde tirar dúvida

1. **CLAUDE.md** — contexto técnico completo, sempre carregado pelo Claude Code
2. **`git log --oneline`** — histórico canônico, marcos da V2 listados
3. **`docs/architecture.md`** — decisões arquiteturais
4. **André** — o que não estiver nos itens acima

---

## Checklist final

- [ ] Node, pnpm, git, gh, Supabase CLI, EAS CLI instalados
- [ ] `gh auth login` feito
- [ ] Repo clonado, `pnpm install` rodado
- [ ] `app/.env.local` preenchido (chaves vindas do André)
- [ ] `SUPABASE_ACCESS_TOKEN` salvo como env var de usuário
- [ ] `supabase link --project-ref uneqnpyzevosznwkmvvo` rodado
- [ ] `EXPO_TOKEN` salvo como env var de usuário
- [ ] `~/.claude/settings.json` com permissions recomendadas
- [ ] `pnpm dev` rodou e abriu no Expo Go
- [ ] Leu a regra crítica do BD compartilhado (seção 8) duas vezes

Boa, manda bala. 🚀
