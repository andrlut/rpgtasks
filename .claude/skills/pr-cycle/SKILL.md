---
name: pr-cycle
description: Roda o ciclo completo de PR no repo `rpgtasks` — pre-commit check (typecheck + lint), push da branch, abre PR via gh, espera CI passar, mergeia com `--squash --admin --delete-branch` e dá cleanup local. Use quando o user pedir "abre PR", "manda PR", "deixa mergeado", "push e PR", "fecha isso num PR", ou explicitamente invocar `/pr-cycle`. Nível 3 — mergeia automaticamente sem perguntar. Se o user quer revisar antes do merge, use `/pr-open` (nivel 2 — só abre PR sem mergear).
---

# /pr-cycle

Skill nível 3 (agressiva) — abre PR e mergeia automaticamente assim que CI passar. Pra sandbox de 1-2 devs com admin merge habilitado. Para versão conservadora, parar no Passo 3.

## Quando invocar

- "Abre PR e mergeia", "manda no main", "ja deixa publicado"
- Trabalho concluído numa branch feature/fix/chore/docs
- User invoca explicitamente `/pr-cycle`

## Quando NÃO invocar

- Branch já está em `main` (não tem PR pra abrir)
- Working tree dirty com mudanças não commitadas (rodar `/commit` antes)
- User pediu pra parar antes do merge (modo revisão) — use `/pr-open` em vez

## Configurações fixas

```
Default base branch:  main
Merge strategy:       squash
Branch protection:    bypass via --admin (sandbox)
Cleanup:              --delete-branch + git branch -d local
```

## Pré-requisitos

- `gh auth status` ok
- Branch atual ≠ main
- `git log <base>..HEAD` retorna pelo menos 1 commit
- Working tree limpo (`git status --porcelain` vazio)

## Processo (6 passos)

### Passo 1 — Identificar contexto

```powershell
$branch = git branch --show-current
$base   = "main"
$commits = git log "origin/${base}..HEAD" --oneline
```

Se `$commits` vazio → abortar: "nada novo pra PR; branch igual a $base".

### Passo 2 — Pre-commit check

Roda obrigatoriamente antes de pushar. CI vai rodar isso de novo, mas se quebrar aqui evita 10 min de ciclo:

```powershell
cd app
npx tsc --noEmit
npx expo lint
cd ..
```

Se qualquer um falhar → reportar erros agrupados e **abortar**. Não pushar com check vermelho.

### Passo 3 — Push + criar PR

```powershell
git push -u origin $branch
```

Derivar título e body do PR a partir dos commits da branch:

- Título: primeira linha do commit mais recente (ou do único, se 1 commit)
- Body:
  - Section `## Summary` com bullets resumindo o que mudou (1 bullet por commit principal)
  - Section `## Test plan` com checklist herdado do CLAUDE.md

```powershell
gh pr create --base $base --title "$title" --body "$body"
```

Mostra o link do PR ao user.

### Passo 4 — Aguardar CI

```powershell
$prNum = gh pr view --json number --jq '.number'
gh pr checks $prNum --watch
```

Timeout de 10 min. Se CI falhar:
- `Typecheck & Lint` vermelho → buscar logs com `gh run view <run-id> --log-failed`
- Reportar erro e abortar (não mergear com CI vermelho)

### Passo 5 — Merge admin

```powershell
gh pr merge $prNum --squash --admin --delete-branch
```

⚠️ Se der `failed to delete local branch` por causa de worktree, ignorar — o merge no GitHub funcionou. Verificar:

```powershell
gh pr view $prNum --json state | ConvertFrom-Json
```

Se `state == "MERGED"` → seguir pra Passo 6.

### Passo 6 — Cleanup local

```powershell
git switch main
git pull --rebase
git branch -D $branch  # OK porque branch foi squash-merged
```

Se houver outros worktrees em branches relacionadas, mencionar mas **não** mexer (cada worktree pode ter sessão Claude ativa).

## Notas importantes

- **Pre-commit é não-negociável**: se não rodar typecheck+lint local, CI vermelho desperdiça 10 min.
- **`--admin` bypass é OK aqui**: sandbox de 2 devs, branch protection existe pra quando time crescer. Não generalizar pra outros repos.
- **Co-author trailer**: incluído automaticamente nos commits, não no PR body — Claude Code adiciona o nome do modelo que está rodando.
- **Conflitos com main**: se `git push` retornar non-fast-forward, fazer `git pull --rebase origin main` antes. Se rebase falhar, **parar e pedir intervenção** — não force-push.

## Quando algo der errado

| Sintoma | Causa provável | Ação |
|---|---|---|
| `gh pr create` falha "PR already exists" | Branch já tem PR aberto | Capturar número, seguir pro passo 4 |
| `gh pr checks --watch` timeout | CI lento ou travado | Reportar URL do run, perguntar se aguarda mais ou aborta |
| `gh pr merge` falha "not mergeable" | Conflito com main | Voltar ao Passo 3, rebase, force-push, repetir |
| `gh pr merge` falha "review required" | --admin não tem efeito (perm?) | Verificar role no repo; se restritivo, pedir review humano |
