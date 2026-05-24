# System vs Personal · Modelo de conteúdo + dinâmica de subscription

> Documento extraído da conversa sobre como o app separa conteúdo do sistema
> (catálogo curado) de conteúdo do usuário, e a próxima frente proposta:
> tiers de subscription (free vs premium) com limites diferentes de criação.

---

## 1. Estado atual — System vs Personal

### 1.1 Padrão de tabelas

| Entidade | System (catálogo) | Personal (usuário) | Vínculo |
|---|---|---|---|
| Tasks | `task_template` (38 linhas) | `task` (com `character_id`) | `task.template_id` opcional aponta pro template adotado |
| Rewards | `reward_template` (23) | `reward` | `reward.template_id` opcional |
| Skills | `skill` com `character_id IS NULL` | `skill` com `character_id = uuid` | Mesma tabela, duas modalidades |
| Quests | `quest_template` | `quest` | `quest.template_id` opcional |
| Dimensions/Subs | `dimension`, `dimension_sub` (fixos: 6 dims, 12 subs) | — | Sem personalização do usuário |
| Psych instruments | `psych_instrument` + `psych_facet` + `psych_item` | `psych_session` + `psych_answer` + `psych_score` | Instrumento é catálogo, sessões são pessoais |
| Learning materials | (system) | — | Sem variante pessoal |

### 1.2 Regras já vivas (via RLS)

- **Catálogo system**: `public-read` pra qualquer authenticated. **Sem policy de
  INSERT/UPDATE/DELETE** pra users — só admin via SQL/migration consegue
  mexer.
- **Personal**: self-only por `auth.uid()`. Insert/update/delete só do dono.
- **Resultado**: usuário já **não consegue editar coisas do system hoje**.
  Esse comportamento está implementado por RLS desde as migrations iniciais.

### 1.3 Funcionalidades de "system content drops"

Migração `20260513000001_template_released_at` adicionou:

- Colunas `released_at` em `task_template`, `reward_template`, `quest_template`
- Default `NOW()` em novos inserts (drop futuro fica marcado)
- Existentes backfilled pra `2026-05-01` (nada aparece como "novo")
- Suporta filtro "novos do mês" no Learning (já usa)

### 1.4 Estratégia CRUD escolhida (opção B)

- **Admin manage via migration SQL + Supabase Studio**, sem UI in-app
- Toda mudança em catálogo passa por git (audit trail completo)
- **Reabrir essa decisão se**:
  - Aparecer curador não-dev (não-código)
  - Cadência de 2+ drops/semana virar rotina
  - Feature "user vota, top vira system" entrar em pauta

### 1.5 Complete sem adoção (PR #158)

- `task_completion.task_id` virou nullable
- Nova coluna `task_completion.template_id` (FK pra `task_template`)
- Check constraint: exatamente um dos dois preenchido
- Nova RPC `complete_template` — usuário toca template do sistema sem criar
  task pessoal, ainda ganha XP/coins/Momentum normalmente
- Surface: aba **Geral** no Tasks/Home (PR #158)

---

## 2. Frente proposta — Subscription tiers

**Camada nova** sobre o modelo: além de system vs personal, **personal tem
tiers** (free vs premium) com limites diferentes de criação.

> A parte "não pode alterar system" **já funciona via RLS**. Não precisa de
> nenhuma mudança nesse eixo. O que falta é só adicionar limites pra
> *criação* no lado personal, baseado no tier.

### 2.1 Decisões pra fechar antes de implementar

#### Q1 — Onde mora o tier do usuário?

| Opção | Prós | Contras |
|---|---|---|
| **(a)** Coluna `profile.subscription_tier text` (`'free'\|'premium'`) | Simples, query rápido | Sem histórico (passou pra premium e voltou pra free? perdeu) |
| **(b)** Tabela `subscription` separada (start, end, plan_id, status) | Histórico completo, suporta múltiplos planos | Mais complexo, JOIN em toda policy de RLS |
| **(c)** Coluna `tier` + auxiliares (`tier_since`, `tier_until`) | Meio-termo | Não escala pra múltiplos planos |

**Sugestão (André + Claude)**: começar com **(a)** — simples e suficiente pra
V3 inicial. Migrar pra **(b)** quando aparecer:
- Múltiplos planos (annual / lifetime / etc)
- Tracking de quando o user upgradeou
- Integração com gateway de pagamento

#### Q2 — Limites por entidade pro tier free

Proposta inicial (ajustável após observar uso real):

| Entidade | Free | Premium |
|---|---|---|
| `task` customizada (ativa) | 10 | ilimitado |
| `reward` customizada (ativa) | 5 | ilimitado |
| `skill` customizada | 3 | ilimitado |
| `quest` customizada (ativa) | 3 | ilimitado |

Definição de "ativa": `is_archived = false`. Arquivado **não conta** no limite —
incentiva o usuário a curadoria do que tá vivo.

#### Q3 — Como enforçar?

| Opção | Como funciona | Trade-off |
|---|---|---|
| **(a)** RLS policy com subquery | `for insert` checa `count(*) where character_id = auth.uid() and is_archived = false < limite` | Cada insert faz subquery; performance OK pra limites baixos |
| **(b)** Trigger `BEFORE INSERT` | Lê tier + conta, raise exception | Lógica fica no BD; mais difícil de testar |
| **(c)** RPC obrigatória | Cliente chama `create_custom_task(payload)`, RPC valida | Mais cirúrgico, retorna erro amigável; quebra padrão atual (hoje o app insere direto) |

**Sugestão**: **(a)** RLS — mantém o padrão atual (user insere direto, RLS
bloqueia se exceder). Sem nova RPC. Erro vem como denial de RLS que o
front-end traduz pra mensagem amigável.

#### Q4 — UX de bloqueio

Opções (não-exclusivas):

- Botão "Add" continua visível, tap → modal "Limite atingido — arquive uma ou
  faça upgrade pra premium"
- Badge contador discreto no botão tipo `8/10`
- Bloqueio só quando tenta criar (não pré-emptive)
- Empty-state com hint do limite quando lista está lotada

#### Q5 — Como user vira premium?

Fora do escopo da primeira fase, mas precisa direção:

| Caminho | Quando |
|---|---|
| Toggle manual via Supabase Studio | Beta / early adopters (setar `tier='premium'` na mão) |
| Integração com gateway (Stripe / RevenueCat) | Quando tiver beta testers pagantes |

**Sugestão**: começar **100% manual via Studio**. Quando aparecer demanda real
de pagantes, integrar gateway depois.

---

## 3. Roadmap de implementação (proposto)

Se topar a Frente 3 nessa direção, as PRs seriam aproximadamente:

| PR | Escopo | Tamanho |
|---|---|---|
| **3A** | Migration: `profile.subscription_tier` + default `'free'`. RLS policies pra `task`/`reward`/`skill`/`quest` insert com limite. Limites como constants na migration | Médio |
| **3B** | Front-end: capturar denial de RLS no insert → mensagem amigável + modal de upgrade. Talvez badge contador `N/limit` nos botões de Add | Médio |
| **3C** (depois) | Integração com gateway de pagamento. Webhook → atualiza `profile.subscription_tier`. Tabela `subscription` separada se a granularidade pedir | Grande |

---

## 4. O que **não** muda

- Modelo system vs personal continua igual
- RLS de catálogo system continua bloqueando edição por user
- `released_at` em templates continua suportando drops periódicos
- RPCs existentes (`start_task_from_template`, `complete_template`, etc) não
  precisam mudar — limites são checados antes do insert

---

## 5. O que ainda precisa de decisão sua

1. Q1 — Onde mora o tier? Opção (a), (b), ou (c)?
2. Q2 — Limites estão razoáveis ou ajusta?
3. Q3 — RLS, trigger, ou RPC?
4. Q4 — Qual padrão de UX de bloqueio?
5. Q5 — Confirma manual via Studio na primeira fase?

Manda quais decisões você concorda / discorda. As que ficarem nas sugestões
eu sigo quando começarmos a Frente 3.

---

*Doc gerado em conjunto na sessão de planejamento da Frente 3 V3, após
fechamento das Frentes 1 (Eu / Hero polish) e 2 (Tasks refactor).*
