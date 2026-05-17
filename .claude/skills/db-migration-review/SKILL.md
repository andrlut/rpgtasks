---
name: db-migration-review
description: Revisa migration SQL de uma PR (especialmente de contributor sem acesso ao Supabase CLI) ANTES de aprovar — cross-referência colunas do INSERT com o schema real da cloud, valida NOT NULL columns, faz dry-run via `supabase db push --linked` em branch checkout. Use quando o user pedir "revisa migration do PR X", "checa SQL antes de aprovar", "tem .sql no PR", "valida migration do Artur", ou explicitamente invocar `/db-migration-review <PR#>`. Específica pra colaboração com Artur (`artlut-eng`), que não tem acesso direto à cloud.
---

# /db-migration-review

Skill especializada — pega uma PR com migrations e roda toda a validação que o autor não pôde rodar (porque não tem acesso ao Supabase CLI). Evita merger SQL quebrado.

## Quando invocar

- "Revisa migration do PR X"
- "Tem `.sql` no PR <N>, checa antes"
- "Artur abriu PR de schema, valida"
- User invoca `/db-migration-review <PR-number>`

## Quando NÃO invocar

- PR sem arquivos em `supabase/migrations/` (só revisar código TS/RN — usar `/review` normal)
- PR já mergeado (revisão é pre-merge; pós-merge é fixup)

## Configurações fixas

```
Supabase project ref: uneqnpyzevosznwkmvvo
Worktrees base dir:   C:/Users/André Luthold/Projetos/RPG/.claude/worktrees/
Reviewing as:         andrlut (account com cloud access)
```

## Pré-requisitos

- PR number conhecido (passa como argumento ou pergunta)
- `gh auth status` ok
- `$env:SUPABASE_ACCESS_TOKEN` setado
- Main worktree em `C:/Users/André Luthold/Projetos/RPG` no `main` atualizado

## Processo (5 passos)

### Passo 1 — Inspecionar a PR

```powershell
$pr = <N>
gh pr view $pr --json title,author,headRefName,baseRefName,files,mergeable
```

Filtrar arquivos:
- `supabase/migrations/*.sql` → arquivos a revisar (lista)
- Se vazio → abortar: "esta PR não tem migrations; use /review normal"

Capturar `headRefName` pra checkout.

### Passo 2 — Checkout em worktree isolado

```powershell
cd "C:/Users/André Luthold/Projetos/RPG"
git fetch origin $headRefName
$worktree = ".claude/worktrees/pr-review-$pr"
git worktree add $worktree $headRefName
```

### Passo 3 — Auditoria estática do SQL

Pra cada `.sql` no PR:

**Naming convention:**
- ✅ `<YYYYMMDDNNNNNN>_<snake>.sql` (counter-style do repo)
- ❌ `<YYYYMMDDHHMMSS>_*.sql` (timestamp-style — sinalizar pra rename)

**Padrões problemáticos a procurar:**

| Pattern no `.sql` | Risco | Resolução |
|---|---|---|
| `create or replace function X` com return type novo | `cannot change return type` | Adicionar `drop function if exists X` antes |
| `insert into Y (...) values ...` | Verificar todas colunas existem + NOT NULL satisfeitos | Cross-ref com schema |
| `alter table Y add column Z not null` (sem default) | Falha se tabela tem rows | Adicionar default ou backfill |
| `create table Y (...)` sem `if not exists` | Falha se já existe | Adicionar `if not exists` |
| `on conflict (slug) do nothing` em tabela sem coluna slug | Bug do PR #148 | Trocar pra `(id)` se PK é id |
| Falta `enable row level security` em tabela user-owned | RLS bypass | Adicionar |
| Falta `create policy` em tabela com RLS | Acesso 100% negado | Adicionar policies |

**Cross-ref de columns** (pra cada INSERT):
- Listar colunas que o INSERT usa
- Listar colunas que a tabela tem (somando migrations anteriores)
- Diferença = colunas inexistentes (erro) ou colunas omitidas NOT NULL (erro)

### Passo 4 — Dry-run via `db push`

Se Passo 3 não pegou problemas críticos, tentar aplicar:

```powershell
cd $worktree
"Y" | supabase db push --linked --debug 2>&1 | Select-Object -Last 30
```

⚠️ **Cuidado**: isso aplica de verdade na cloud. Se a PR for ruim, schema fica em estado parcial. Mas a transação roda atomicamente — falha = rollback completo. Em prática é seguro.

Se rodar limpo → migrations passam.

Se falhar:
- Pegar o erro Postgres exato
- Mapear pro padrão problemático do Passo 3 quando possível
- Reportar com hint de fix específico

### Passo 5 — Reporte

Formato pro user:

```
PR #<N> — Migration Review

Files:
  ✅ <arquivo1>.sql — passou audit + dry-run
  ❌ <arquivo2>.sql — falhou dry-run
     Error: <SQLSTATE> <mensagem>
     Fix sugerido: <hint>

Status: <APROVAR / SOLICITAR MUDANÇAS>

Próximos passos:
  - Se APROVAR: `gh pr review <N> --approve --body "<msg>"`
  - Se MUDANÇAS: comentar no PR com hints específicos
  - Cleanup do worktree de review: `git worktree remove <worktree-path>`
```

## Notas importantes

- **Artur não tem acesso ao Supabase CLI**: ele physically não pode ter rodado `db push` antes de abrir o PR. Toda migration dele chega sem dry-run. Esta skill é o substituto.
- **Schema audit é mais valioso que dry-run sozinho**: dry-run pega erros, mas o audit pega más práticas (naming, RLS faltando) que rodariam OK mas comprometem o design.
- **Worktree de review é descartável**: criar dedicated worktree pra cada revisão evita poluir worktrees ativos. Remover ao fim.
- **Não usar `--admin` aqui**: revisão é leitura/análise; o merge é decisão separada (via `/pr-cycle` ou manual).

## Quando algo der errado

| Sintoma | Causa provável | Ação |
|---|---|---|
| `git fetch` falha | Branch não existe no remote | Pedir pro autor `git push` da branch dele |
| Dry-run aplicou parcial (não rollou back) | DDL em transactions não-implícitas | Reverter manualmente via Management API; depois reportar |
| `supabase db push` retorna "history mismatch" | Cloud tem migrations que a branch não tem | Comparar `supabase migration list --linked` com `ls supabase/migrations/`; rebasear branch |
| Worktree add falha por path em uso | Worktree antigo existe | `git worktree remove --force <path>` antes |
