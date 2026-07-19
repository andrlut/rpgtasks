---
name: worktree-cleanup
description: Limpa worktrees velhos/abandonados/prunable do repo `rpgtasks` com confirmação — executa as remoções que `/sync-all` só sugere. Lista todos os worktrees ativos, categoriza por estado (active, merged, stale, prunable), e propõe um plano de remoção pra cada um. Aplica seletivamente após confirmação do user. Use quando o user pedir "limpa os worktrees", "faxina nos worktrees", "remove os antigos", "tira os abandonados", "tem muito worktree velho", ou explicitamente invocar `/worktree-cleanup`.
---

# /worktree-cleanup

Skill de manutenção — executa a faxina de worktrees que o `/sync-all` identifica. Não é destrutiva por padrão: lista, categoriza, propõe, aguarda confirmação.

> **Nota nuvem**: o sandbox da nuvem é um checkout único e efêmero — não tem worktrees. Esta skill só faz sentido na máquina local. Na nuvem, informar que não há o que limpar e parar.

## Quando invocar

- "Limpa os worktrees", "tira os antigos", "faxina"
- Acumulou 8+ worktrees e a maioria parece abandonada
- Antes de iniciar trabalho grande pra começar limpo
- User invoca `/worktree-cleanup`

## Quando NÃO invocar

- Worktrees todos ativos (nada a limpar — informar e parar)
- User está no meio de trabalho em um worktree (esperar)
- Rodando no sandbox da nuvem (sem worktrees)

## Configurações fixas

```
Worktrees dir:  <repo-root>/.claude/worktrees/
Sandbox style:  agressivo na sugestão, conservador na execução (confirma antes)
Repo root:      detectado dinâmico — não hardcodar path
```

**Portabilidade**: rode tudo via a Bash tool. Root em runtime:

```bash
MAIN=$(git worktree list --porcelain | awk '/^worktree /{print $2; exit}')
cd "$MAIN"
```

## Pré-requisitos

- Estar em qualquer worktree do repo
- `git fetch origin` recente (idealmente os 5 últimos minutos)

## Processo (5 passos)

### Passo 1 — Inventário

```bash
MAIN=$(git worktree list --porcelain | awk '/^worktree /{print $2; exit}')
cd "$MAIN"
git fetch origin
mainSha=$(git rev-parse origin/main)
git worktree list --porcelain
```

Pra cada worktree (exceto o main):

```bash
cd "$path"
status=$(git status --porcelain)
head=$(git rev-parse HEAD)
ahead=$(git rev-list --count "$mainSha..HEAD" 2>/dev/null)
behind=$(git rev-list --count "HEAD..$mainSha" 2>/dev/null)
mergedToMain=$(git branch --merged origin/main | grep -qE "^[* ]+$branch$" && echo yes || echo no)
remoteExists=$(git ls-remote --heads origin "$branch" | grep -q "$branch" && echo yes || echo no)
```

### Passo 2 — Categorização

Pra cada worktree, aplicar a árvore de decisão:

| Estado | Critério | Sugestão default |
|---|---|---|
| **prunable** | `worktree list` lista como prunable (path inexistente) | ✅ REMOVE (auto-aprovado, é só registro órfão) |
| **merged-clean** | branch já mergeada na main + working tree limpo | ✅ REMOVE (squash mesclou; manter localmente é ruído) |
| **stale** | behind > 10 commits + clean + sem commits ahead | ⚠️ PROPOR REMOVE (provavelmente esquecido) |
| **active-clean** | tem commits ahead + clean | 🟢 MANTER (trabalho commitado em progresso) |
| **active-dirty** | tem mudanças não commitadas | 🔴 MANTER (trabalho não salvo — perigo!) |
| **detached** | branch diferente das normais (sem PR aberta correspondente) | ⚠️ PERGUNTAR (raro) |

### Passo 3 — Plano

Mostrar tabela com plano de ação:

```
🧹 Worktree cleanup plan

📂 .claude/worktrees/
  ✅ <name>  [branch]              prunable          → remove auto
  ✅ <name>  [branch]              merged-clean      → remove (squashed merged)
  ⚠️ <name>  [branch] behind +N    stale             → REMOVE? [y/N]
  🟢 <name>  [branch] ahead +N     active-clean      → KEEP
  🔴 <name>  [branch] dirty <N>    active-dirty      → KEEP (uncommitted)

Resumo: remove <X>, manter <Y>.
```

Aguardar confirmação. Pra `stale`, pedir y/N individual.

### Passo 4 — Execução

**Sempre nessa ordem:**

```bash
# 1. prunable primeiro (zero risco)
git worktree prune -v

# 2. merged-clean e stale aprovados — pra cada worktree aprovado:
#    garantir que o main worktree não está nessa branch antes de remover
currentInMain=$(cd "$MAIN" && git branch --show-current)
if [ "$currentInMain" = "$wtBranch" ]; then
  ( cd "$MAIN" && git switch main )
fi

git worktree remove "$wtPath"
git branch -D "$wtBranch" 2>/dev/null || true   # squash-merged precisa -D
```

**Importante**: nunca usar `--force` no `worktree remove`. Se der erro de uncommitted changes, abortar essa entrada — significa que a categorização foi errada (deveria ser active-dirty).

### Passo 5 — Reporte

```
✅ Cleanup completo

  Removidos: <X> worktrees
    - <name1>
    - <name2>
  Mantidos:  <Y> worktrees
    - <name3> (active-clean, ahead +N)
    - <name4> (active-dirty, N mudanças)

📌 Próximos passos sugeridos:
  - Branches locais órfãs: <lista de branches sem worktree e sem PR aberta>
    Pra deletar: `git branch -d <nome>` (ou -D se não-mergeada)
```

## Notas importantes

- **Nunca remover worktree com mudanças não commitadas**: categoria `active-dirty` é intocável. Se user pedir explicitamente "force remove", responder que isso é um caso de `git stash` antes — não fazer sozinho.
- **Branches locais ficam mesmo após remove**: `git worktree remove` só desliga o worktree, branch local persiste. Deletar manualmente com `git branch -d/-D` se quiser limpeza completa.
- **Branches remoto-only**: depois de remove + delete local, se a branch ainda existir no remote, pode ser PR aberta (não tocar) ou abandonada. `/pr-cycle` lida com fechamento de PRs; esse skill é só local.
- **Skill é idempotente**: rodar 2x seguidas na mesma máquina é seguro — segunda execução não tem o que limpar.

## Quando algo der errado

| Sintoma | Causa provável | Ação |
|---|---|---|
| `worktree remove` falha "contains modified files" | Categorização errou; era active-dirty | Mudar pra MANTER; reportar ao user |
| `branch -D` falha "branch not found" | Já deletado em iteração anterior | Ignorar (idempotente) |
| `worktree prune` lista entradas mas não remove | Permissões de filesystem | Conferir permissões do diretório (NTFS no Windows / `chmod` no Linux) |
| Worktree em outro drive/mount | Path absoluto fora do padrão | Ajustar pré-requisitos pra cobrir |
