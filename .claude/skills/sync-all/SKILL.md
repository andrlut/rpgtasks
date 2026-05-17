---
name: sync-all
description: Sincroniza o repo `rpgtasks` num passo só — pull rebase do main, inventário de worktrees ativos (behind/ahead/dirty), confirma alignment entre git e Supabase cloud migrations, e reporta tudo que precisa atenção. Use quando o user pedir "sincroniza tudo", "atualiza tudo", "começa o dia", "vamos começar a trabalhar", "verifica o estado", ou explicitamente invocar `/sync-all`.
---

# /sync-all

Skill de status — não muda nada além de `git pull` no main. Foco é diagnóstico: o que está atrasado, o que está sujo, o que precisa de cleanup, o que está alinhado.

## Quando invocar

- Início do dia: "sincroniza tudo", "atualiza tudo", "começar"
- Depois de pausa longa (>4h sem interação no repo)
- Antes de começar feature nova
- User invoca `/sync-all`

## Quando NÃO invocar

- No meio de um trabalho em andamento (vai distrair)
- Recém-cloned o repo (não há nada pra sincronizar ainda)

## Configurações fixas

```
Main dir:        C:/Users/André Luthold/Projetos/RPG
Worktrees dir:   <main>/.claude/worktrees/
Supabase ref:    uneqnpyzevosznwkmvvo
```

## Pré-requisitos

- `gh auth status` ok (pra checks remotos)
- `$env:SUPABASE_ACCESS_TOKEN` setado (pra migration list)

## Processo (5 passos)

### Passo 1 — Fetch + main pull

```powershell
cd "C:/Users/André Luthold/Projetos/RPG"
git fetch origin
git switch main
git pull --rebase
$mainHead = git rev-parse HEAD
```

Se `git pull` retornar conflito com arquivos untracked (típico em main por specs HTML duplicados), reportar e parar — usuário precisa decidir o que fazer.

### Passo 2 — Status do main worktree

```powershell
$mainStatus = git status --porcelain
$mainCommitsAhead = git rev-list --count "origin/main..HEAD"
```

Reportar:
- Untracked files (provavelmente specs locais)
- Modified files (provavelmente trabalho em progresso)
- Commits ahead/behind

### Passo 3 — Inventário de worktrees

```powershell
git worktree list --porcelain
```

Pra cada worktree (exceto main):

```powershell
cd <path>
$branch  = git branch --show-current
$status  = git status --porcelain
$ahead   = git rev-list --count "$mainHead..HEAD"
$behind  = git rev-list --count "HEAD..$mainHead"
$dirty   = if ($status) { "dirty" } else { "clean" }
```

Categorizar:
- **Active**: branch ≠ main, ahead > 0, possibly dirty — trabalho em progresso
- **Stale**: branch ≠ main, behind > 5, clean — esqueceu, considerar remoção
- **Merged**: branch é o nome de PR já mergeada (ex: matches `aa0dcc1`) — pode remover
- **Prunable**: gitdir aponta pra path inexistente — auto-prune

### Passo 4 — Alignment com Supabase cloud

```powershell
cd "C:/Users/André Luthold/Projetos/RPG"
supabase migration list --linked 2>&1 | Select-Object -Last 30
```

Comparar local↔remote:
- ✅ Ambos preenchidos e iguais = alinhado
- ⚠️ Remote-only (sem local) = main desatualizada OU outra máquina pushou sem commitar
- ⚠️ Local-only (sem remote) = migration nova pendente de `db push --linked`

### Passo 5 — Reporte consolidado

Formato:

```
🔄 Sync report — <timestamp>

📍 Main worktree
  Branch:  main @ <short-sha>
  Status:  <commits ahead> ahead / <commits behind> behind origin
  Dirty:   <files>

🌳 Worktrees ativos (<N>)
  ✅ <name> [<branch>]  ahead <X>, clean         ← active feature work
  ⚠️ <name> [<branch>]  ahead <X>, dirty <files> ← uncommitted, attention
  💤 <name> [<branch>]  behind <Y>, clean         ← stale, consider removal
  ❌ <name>             prunable                  ← can auto-remove

🗄️ Supabase cloud
  ✅ Local↔Remote alinhado em <N> migrations
  ⚠️ Mismatch detectado: <detalhes>

🎯 Sugestões
  - `git worktree prune` pra limpar <N> prunable
  - `git worktree remove <name>` pra stale worktree(s)
  - `supabase db push --linked` pra <N> migrations locais
  - Pull no worktree X (atrás de main por Y commits)
```

## Notas importantes

- **Read-only por padrão**: única ação destrutiva é `git pull --rebase` no main (que é seguro se main está limpo). Não remove worktrees automaticamente — só sugere.
- **Worktree cleanup é decisão do user**: skill propõe, user aprova.
- **Pull pode falhar por untracked conflict**: pode acontecer se main local tem arquivos que origin/main adicionou via PR (caso `xp-momentum-spec.html` etc). Sinalizar pro user, não tentar resolver sozinha.
- **Custo**: ~30s no típico. `supabase migration list` é o passo mais lento.

## Quando algo der errado

| Sintoma | Causa provável | Ação |
|---|---|---|
| `git pull` "would overwrite untracked" | Specs ou .html locais idênticos ao remote | Comparar hashes; se iguais, deletar local |
| `supabase migration list` retorna "Cannot find project ref" | CLI rodando fora do main | `cd "C:/Users/André Luthold/Projetos/RPG"` |
| `git worktree list` lista paths inexistentes | Worktrees movidos manualmente | `git worktree prune -v` (idempotente) |
| Várias migrations remote-only | Outro dev pushou sem commitar | Investigar via Management API ou pedir pro outro pushar `.sql` |
