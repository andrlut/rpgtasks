---
name: db-migration
description: Cria uma nova migration Supabase no padrão counter-style do repo, aplica direto na cloud (instância compartilhada `uneqnpyzevosznwkmvvo`) e commita o `.sql` no git imediatamente após sucesso — na ordem certa pra evitar history mismatch entre máquinas. Use quando o user pedir "criar migration", "mudar schema", "adicionar coluna", "nova RPC", "alterar tabela", "fazer migration de X", ou explicitamente invocar `/db-migration`. NÃO use pra outros projetos — config é específica do repo `rpgtasks`.
---

# /db-migration

Skill nível 3 (agressiva) — cria a migration, aplica na cloud Supabase compartilhada, e commita o arquivo no git, tudo no fluxo correto pra não quebrar o histórico do outro dev.

## Quando invocar

- "Criar migration pra X", "preciso mudar o schema", "adicionar coluna em Y"
- "Nova RPC pra Z", "alterar tabela"
- User invoca explicitamente `/db-migration`
- Depois de ajustar tipos em `app/lib/db/` e o user pedir pra refletir no schema

## Quando NÃO invocar

- Edição de migration já mergeada (write-once rule — abrir fix-up PR em vez de editar)
- User só perguntou se vale criar migration (modo exploratório)
- Existem worktrees stale com migrations pendentes (perigo de conflito)

## Configurações fixas

```
Supabase project ref: uneqnpyzevosznwkmvvo
Migrations dir:       supabase/migrations/
Naming pattern:       <YYYYMMDD>NNNNNN_<snake_case_name>.sql
Linked CLI dir:       C:/Users/André Luthold/Projetos/RPG  (main worktree)
```

## Pré-requisitos (validar e abortar com mensagem clara se faltar)

- `$env:SUPABASE_ACCESS_TOKEN` setado (verificar via `[Environment]::GetEnvironmentVariable("SUPABASE_ACCESS_TOKEN", "User")`)
- **Token VÁLIDO, não só presente.** O erro mais recorrente desse repo é PAT expirado/revogado: o CLI morre em `Initialising login role... 401 Unauthorized` no push, depois de já ter criado o arquivo. Testar a validade ANTES de tocar em qualquer migration:

  ```powershell
  try {
    Invoke-RestMethod -Uri 'https://api.supabase.com/v1/projects' `
      -Headers @{ Authorization = "Bearer $env:SUPABASE_ACCESS_TOKEN" } -ErrorAction Stop | Out-Null
    "token OK"
  } catch {
    "TOKEN INVÁLIDO ($($_.Exception.Response.StatusCode.value__)) — rotaciona em https://supabase.com/dashboard/account/tokens e atualiza: [Environment]::SetEnvironmentVariable('SUPABASE_ACCESS_TOKEN','<novo>','User')"
  }
  ```

  Se não retornar `token OK` → **abortar** com a URL de rotação. Não seguir pro Passo 1.
- Repo limpo no main worktree (`git status` sem `.sql` pendentes em `supabase/migrations/`)
- `gh auth status` ok (pra futuras operações)

## Processo (5 passos)

### Passo 1 — Sync forçado do main

Mexer no schema da cloud sem `git pull` é o erro mais perigoso desse repo (PR #148 saga). Sempre puxar primeiro:

```powershell
cd "C:/Users/André Luthold/Projetos/RPG"
git switch main
git pull --rebase
```

Se houver `.sql` em `supabase/migrations/` que não está no main remote, **abortar** — sinal de migration órfã (alguém pushou na cloud mas não commitou ainda).

### Passo 2 — Calcular nome counter-style

```powershell
$today = Get-Date -Format "yyyyMMdd"
$existing = Get-ChildItem "supabase/migrations/${today}*.sql" -ErrorAction SilentlyContinue
$next = if ($existing) { ($existing.Count + 1).ToString("D6") } else { "000001" }
$slug = "${today}${next}_<nome-sugerido>"
```

**Importante**: nunca usar timestamp-style (`YYYYMMDDHHMMSS`). Convenção do repo é counter-style. Cross-check com migrations dos últimos 30 dias se duvidar.

### Passo 3 — Criar e editar o arquivo

Cria `supabase/migrations/${slug}.sql` com header padrão:

```sql
-- migration: <slug>.sql
-- purpose: <descrição curta do que essa migration faz>
--
-- affected tables: <lista>
-- new rpcs:        <lista, ou "none">
-- breaking?       <yes/no — se yes, listar como código existente deve adaptar>
--
-- notes:
--   migrations são write-once; nunca editar depois de aplicar
--   <outras notas relevantes>

begin;

-- <SQL aqui>

commit;
```

Mostra ao user pra ele confirmar o conteúdo antes do push. Validar antes de pushar:
- `CREATE OR REPLACE FUNCTION` com return type diferente? → exige `DROP FUNCTION` antes
- `ALTER TABLE` com `NOT NULL` adicionado? → precisa de default ou backfill
- INSERT em catálogos? → ON CONFLICT (id) DO NOTHING (idempotente, padrão do repo)
- Coluna nova em `quest_template`/`task_template`/`reward_template`? → adicionar coluna `*_pt` (e opcionalmente `*_en`) pra bilíngue

### Passo 4 — Push pra cloud

```powershell
cd "C:/Users/André Luthold/Projetos/RPG"
"Y" | supabase db push --linked
```

Se der erro:
- `cannot change return type of existing function` → adicionar `drop function if exists` antes do `create or replace`
- `column X of relation Y does not exist` → coluna não foi criada por ALTER TABLE prévio na migration
- `null value in column "X" violates not-null constraint` → INSERT precisa fornecer essa coluna ou ALTER COLUMN DROP NOT NULL
- `history mismatch` → outro dev pushou migration que esta máquina não tem; pedir pra ele commitar/pushar o `.sql` dele primeiro

### Passo 5 — Commit imediato

**Crítico — não pular:**

```powershell
cd "C:/Users/André Luthold/Projetos/RPG"
git add "supabase/migrations/${slug}.sql"
git commit -m "feat(db): <descrição>" -m "Co-Authored-By: Claude <modelo> <noreply@anthropic.com>"
git push
```

Sem isso, o Artur não tem o `.sql` no git e a próxima vez que ele rodar `db push` da máquina dele vai dar history mismatch.

## Notas importantes

- **Nunca rodar `db push --linked` sem `git pull --rebase` antes.** É o golden rule do BD compartilhado.
- **Nunca usar `supabase migration repair --status reverted` sem o `.sql` em mãos.** Só remove o registro de histórico, o schema continua aplicado, próximo push do outro dev quebra.
- **Migrations write-once**: nunca editar depois de aplicada. Se precisar consertar, criar nova migration (ou fixup PR se ainda não aplicada).
- **Counter-style sequencial por dia**: `20260517000001` → `20260517000002` → `20260517000003`. Cross-check antes de criar.

## Quando algo der errado

| Sintoma | Causa provável | Ação |
|---|---|---|
| "Cannot find project ref" | CLI rodando fora do main worktree | `cd "C:/Users/André Luthold/Projetos/RPG"` antes |
| `history mismatch` no push | Outra máquina tem migration mais recente | `git pull --rebase` + repushar; se ainda falhar, investigar `supabase migration list --linked` |
| Push falhou no meio da migration | Transaction rolled back, schema intacto | Editar a migration localmente (se nunca aplicada) e re-pushar |
| Erro de permissão | Token expirado | Renovar PAT no dashboard Supabase |
