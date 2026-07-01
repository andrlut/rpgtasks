# Perceva V3 — Auditoria + Handoff de Ação (2026-06-30)

> **Para o Claude Code do André.** Doc auto-contido (traz o contexto que vive
> fora do repo) + achados da passada rápida do Artur + ações concretas.
>
> **Modo de operação pretendido: execução autônoma / madrugada.** O André quer
> deixar você rodando ininterrupto enquanto dorme. Então o fluxo é:
>
> 1. **No início da sessão**, apresente o **Batch de decisões up-front**
>    (abaixo) de uma vez só e colete as respostas do André em poucos minutos
>    (ou ele já cola as respostas pré-preenchidas). Cada decisão tem um
>    **default recomendado** — se ele disser "usa os defaults", siga com eles.
> 2. **Depois das decisões travadas, execute o backlog inteiro sem parar por
>    input.** Não peça confirmação de novo pra nada que já esteja coberto por
>    uma decisão ou marcado ✅. Trabalhe por PRs pequenos e verdes (tsc+lint).
> 3. **Único hard-stop mesmo autônomo:** operação destrutiva/irreversível em
>    dado vivo (ex: backfill/UPDATE em massa de XP/coins já creditados). Isso
>    NÃO roda sem aprovação explícita — gere o artefato/relatório e pare nesse
>    ponto específico, seguindo pro resto do backlog.

## Legenda de status
🔴 Bug confirmado · 🟡 Risco a verificar · ⚪ Não implementado · 🟢 OK · 🔵 Precisa aprofundar

## Legenda de ação
- **✅ Autônomo** — pode varrer e atuar direto (JS/TS, front-end, fix isolado, doc, rebuild). Não-breaking.
- **🟠 Decisão up-front** — depende de uma escolha (Artur **ou** André). Uma vez respondida no batch inicial, vira autônomo pelo resto da noite.
- **⛔ Hard-stop** — destrutivo/irreversível em dado vivo; não roda sem aprovação explícita mesmo com decisão.

---

# ⚡ Batch de decisões up-front (responder no início da sessão)

> Responder essas ~7 destrava a execução autônoma. Formato sugerido de
> resposta: `D1=A, D2=B, ...` ou "todos os defaults".

**D1 — Curva de nível (balance).** O threshold de nível (`(level-1)²×100`) não
foi recalibrado junto com a curva de XP nova (leveling ~3× mais lento hoje).
Recalibrar?
- **(A) [default] Sim, recalibrar** pra aproximar o ritmo antigo (ex: base 100→40), validando por simulação antes de aplicar. É client-only (`xp.ts`), sem migration, `total_xp` intacto → reversível por app update.
- (B) Não, o leveling lento é intencional — só documentar.
- (C) André define o número exato após rodar a simulação.

**D2 — Correção na RPC `complete_task` (se a investigação achar bug).** Se a
leitura confirmar bug de agregação de XP ou de aplicação do streak:
- **(A) [default] Escrever migration + abrir PR, sem push** — deixar o push pro review (Artur/André confirmam).
- (B) Pode escrever E pushar se passar dry-run limpo (via `/db-migration`) e não envolver backfill de dado existente.

**D3 — Subscription tiers backend (migration + RLS + RPC checks).**
- **(A) [default] Front-end agora (atrás de flag, tier mock) + escrever a migration/RLS/RPC e abrir PR sem push.** Não trava ninguém em produção.
- (B) Implementar tudo e pushar a migration nesta rodada (RLS só restringe INSERT acima do limite, nunca SELECT/UPDATE; testar com usuário free antes).
- (C) Só front-end agora; backend fica pra outra sessão.

**D4 — Pipeline de automação do Learn.**
- **(A) [default] Versionar + documentar** o processo (script em `scripts/` ou Edge Function + `docs/learning-pipeline.md`), **sem rodar ingestão em massa**.
- (B) Só um markdown documentando, sem código.

**D5 — Limites free (10 tasks / 5 rewards / 3 skills / 3 quests).**
- **(A) [default] Manter como está na spec.**
- (B) Recalcular se o tamanho de `task_template`/`reward_template` mudou desde a spec (André confirma).

**D6 — Rebuild nativo pras notificações.** Causa provável do "não dispara" é o
módulo nativo não ter entrado por OTA.
- **(A) [default] Pode disparar `eas build --profile preview`** após confirmar o diagnóstico.
- (B) Só investigar/consertar código; rebuild o André dispara manual.

**D7 — Atualizar o `CLAUDE.md` desatualizado.**
- **(A) [default] Sim, atualizar** o roadmap V3 (Perceva, notificações, curva nova, rename Missões/Metas, tour, tiers) nesta rodada.
- (B) Deixar pro PR de fechamento da Phase 1.

---

## Backlog priorizado (executar após o batch)
| # | Item | Status | Ação | Gate |
|---|---|---|---|---|
| 1a | Threshold de nível vs curva nova | 🟡 | recalibrar `xp.ts` | 🟠 D1 |
| 1b | `complete_task`: agregação XP + streak | 🔵 | investigar (✅) → fix (🟠 D2) | ✅/🟠 |
| 1c | `confirmCompletion.ts` curva antiga | ✅feito | — | — |
| 3 | Notificações não disparam | 🔵 | investigar + corrigir + rebuild | ✅/🟠 D6 |
| 4 | Subscription tiers | ⚪ | front-end (✅) + backend | 🟠 D3/D5 |
| 2 | Pipeline Learn não versionado | ⚪ | versionar/documentar | 🟠 D4 |
| 5a | Skills CRUD polishing | 🔵 | varrer + polir | ✅ |
| 5b | Bugs de scroll/botão fixo | 🔵 | varrer call sites + corrigir | ✅ |
| 5c | CLAUDE.md desatualizado | 🟡 | atualizar | 🟠 D7 |

---

# Contexto embutido (não está no repo)

### C1 — Curva de XP/coins (rebalance já aplicado)
| Estrelas | XP/Coins (NOVA, atual) | XP/Coins (antiga) |
|---|---|---|
| 1★ | 10 | 5 |
| 2★ | 20 | 15 |
| 3★ | 35 | 40 |
| 4★ | 55 | 100 |
| 5★ | 80 | 250 |

`XP = Coins`. Consistente nos dois lados: cliente `app/lib/xp.ts`
(`REWARD_BY_DIFFICULTY`) + servidor `public.base_xp_for_stars` (migration
`20260528000001_xp_curve_rebalance.sql`). **Não mexer na curva por estrela.**

### C2 — Notificações (spec)
| Notificação | Horário | Condição |
|---|---|---|
| Daily Brief | configurável, padrão 8h | sempre dispara |
| Checkpoint | 12h30 fixo | só se o usuário NÃO abriu o app hoje |

`app/lib/notifications/` (`index/permissions/scheduler/session/constants` + `useNotificationsSetup`). Boot via `AppState` no `_layout.tsx`. Deps `expo-notifications` + `expo-device`.

### C3 — Subscription Tiers (spec FECHADA — não alterar as decisões)
| Decisão | Resolução |
|---|---|
| Onde mora o tier | coluna `profile.subscription_tier text not null default 'free'` + CHECK. Tabela `subscription` separada só quando entrar gateway real. |
| Limites free | 10 tasks ativas · 5 rewards ativas · 3 skills · 3 quests ativas (arquivado não conta) |
| Enforcement | híbrido: RLS de insert + checks inline nas RPCs `start_task_from_template`, `start_quest_from_template`, `start_custom_quest`, `create_custom_skill` |
| UX do bloqueio | tap-to-modal; badge contador a partir de ≥80%; sem bloqueio preemptivo |
| Como vira premium | manual via Supabase Studio durante o beta |

### C4 — V3 em uma frase
3 pilares de identidade: **Percebida** (como se vê), **Praticada** (Dedicação/XP
+ Momentum), **Desejada** (Skills + Metas). Tour pós-login (M0–M6 + wrap) em
produção. Rename de UI: Quests→**Missões**, Goals→**Metas**.

---

# 1. XP / Dedicação

## 1a — 🟡 Threshold de nível não recalibrado *(causa provável do "nível geral errado")* — 🟠 D1
**Evidência:** `app/lib/xp.ts` (fonte única). `xpForLevel(level) = (level-1)² × 100`; inverso `level = floor(sqrt(xp/100)) + 1` (nível 1=0, 2=100, 3=400, 4=900, 5=1600 XP). A migration de rebalance só trocou `base_xp_for_stars` — a curva de nível ficou calibrada pras recompensas ~3× maiores da curva antiga.

**Diagnóstico:** XP por sub e total acumulam certo; o nível é computado certo *matematicamente*, mas sobe ~3× mais devagar. Sintoma = calibração, não bug de cálculo.

**Ação se D1=A/C (autônomo, sem migration):** ajustar a curva em `xp.ts` (é client-only, deriva de `character.total_xp` — reversível por app update, não mexe em dado gravado). Rodar uma **simulação** (quantas tasks de cada estrela pra chegar aos níveis 2/5/10 com a curva nova) e comparar com o ritmo da curva antiga antes de fixar o número. Entregar num PR com a tabela de simulação no corpo.
**Critério de aceite:** ritmo de leveling documentado + próximo do da curva antiga (se D1=A). Se D1=B, só registrar a análise.

## 1b — 🔵 `complete_task`: agregação de XP + streak — investigar ✅ / fix 🟠 D2
**Ação (investigar ✅):** ler `complete_task` (`20260514000002_complete_task_momentum_bonus.sql`, `20260517000002_task_completion_template.sql`) e confirmar: (1) agregação do XP total a partir dos `base_xp_for_stars` por sub; (2) `streak_multiplier` consistente entre total e subs; (3) `character_dimension` vs `character_sub_score`/`assessment_log` nas telas `profile-mirror.tsx`, `dimension/[id]`, `sub/[id]` (não misturar prática com percebido).
**Se achar bug:** correção só em tela = ✅; correção na RPC = migration → seguir **D2**. Não fazer backfill de dado existente (⛔).

## 1c — ✅ FEITO — `confirmCompletion.ts`
Curva antiga `250/100` → `80/55`. Obs: `maybeConfirmHardCompletion` é **dead code** e a string é **inglês hardcoded** (gap i18n). Se mexer, i18n-ificar ou remover.

---

# 2. Automação dos artigos do Learn — ⚪/🔵 — 🟠 D4
**Evidência:** conteúdo versionado em ≥10 migrations `*_learning_*` (incl. `learning_publisher_infra`). **Não existe** `supabase/functions/` nem script de extração/ingestão versionado. O pipeline que gera os seeds (extração/upload que o André roda via Claude) **não é repetível pelo time** hoje.
**Ação (D4=A):** versionar o pipeline (script em `scripts/` ou Edge Function em `supabase/functions/`) + `docs/learning-pipeline.md`. **Não rodar ingestão em massa** — só tornar repetível.
**Critério de aceite:** um comando/doc que qualquer um roda pra gerar a próxima leva de artigos.

---

# 3. Notificações — 🔵 — investigar ✅ / rebuild 🟠 D6
**🟢 Código presente e correto** (a hipótese de "nunca commitado" é falsa): `app/lib/notifications/` completo (6 arquivos, `useNotificationsSetup` chamado no `RootLayout`); `scheduler.ts` usa `SchedulableTriggerInputTypes.DAILY`/`.DATE` (sintaxe SDK 51+); deps + plugin no `app.json` OK.
**Ação (✅ + D6):**
1. Confirmar se o APK atual saiu de um `eas build` **posterior** à entrada do `expo-notifications`. Se não, o módulo nativo não está ativo (OTA não ativa nativo) → **rebuild** (D6=A).
2. Runtime: `getAllScheduledNotificationsAsync()` + logs num device; permissão concedida?
3. Ordem no boot (`session.ts`/`useNotificationsSetup.ts`): open do dia → agenda Checkpoint → cancela Checkpoint. Garantir que o Checkpoint não é cancelado antes de agendar (fix = JS, ✅).
4. Doze/bateria — teste manual.
**Critério de aceite:** Daily Brief no horário; Checkpoint 12h30 só quando o app não foi aberto no dia.

---

# 4. Subscription Tiers — ⚪ — 🟠 D3/D5
**Evidência:** `subscription_tier`/`subscriptionTier` = **0 ocorrências** no repo. Spec inteira (C3) por implementar.
**Ação por parte:**
- **Front-end (✅ autônomo, mesmo com D3=A/C):** hook lendo tier + contando ativos por entidade; modal tap-to-modal; badge ≥80% nas 4 telas (tasks, rewards, skills, quests). Contra tier mock atrás de flag enquanto a coluna não existe.
- **Backend (D3):** migration `profile.subscription_tier ... default 'free'` + CHECK; RLS de insert + 4 checks inline nas RPCs (`start_task_from_template`, `start_quest_from_template`, `start_custom_quest`, `create_custom_skill`). ⚠️ RLS de insert mal calibrada tranca usuário fora → só restringir INSERT acima do limite, nunca SELECT/UPDATE; testar com usuário free antes de qualquer push.
- **Limites (D5):** manter 10/5/3/3 salvo D5=B.
- **Não alterar as 5 decisões da C3.**

---

# 5. Polish (Phase 1)
| # | Item | Status | Ação |
|---|---|---|---|
| 2 | `released_at`/`version` em templates | 🟢 saiu | — |
| 3 | Nav Profile→Settings, tab Learning, History em Tasks | 🟢 saiu | — |
| 4 | Auditoria PT/EN + glossário | 🟢 feito (#251/#252, 969 chaves) | — |
| 5 | Skills CRUD polishing | 🔵 | ✅ varrer `skills.tsx`/`skill-form.tsx`/`skill/[id]` e polir (UI) |
| 6 | Rewards visual polish | 🟢 saiu | — |
| 7 | Bugs scroll/botão fixo | 🔵 | ✅ varrer call sites de `useBottomNavClearance`/`useBottomSafeClearance` e corrigir sobreposições |

Rebrand Perceva: 🟢 saiu.

---

# Gaps de contexto / notas
1. **Muita coisa que parecia pendente JÁ ESTÁ feita:** notificações, curva de XP (cliente+servidor), Quests→Missões/Goals→Metas, tour pós-login completo, rebrand Perceva. Não re-investigar do zero.
2. **CLAUDE.md desatualizado (🟠 D7):** roadmap ainda lista só os 7 itens originais e diz "App name: stays RPG Tasks" (já é Perceva). Não cita notificações/curva/rename/tour/tiers.
3. **Bug do tour em cold boot — JÁ CORRIGIDO** (PR #253 + OTA): `useTourReady` reportava "ready" defasado no boot → AuthGate jogava no tour todo cold start. Resolvido derivando o ready direto do store. Não re-investigar.
4. **Dívida de i18n residual (baixa):** `confirmCompletion.ts` (dead code) + `QuestChip.tsx`/`modal.tsx` (dead code) têm strings inglês hardcoded.

# Fixes aplicados na passada rápida do Artur
- `app/lib/util/confirmCompletion.ts`: curva antiga `250/100` → `80/55`.

Sem migration, sem balance, sem tocar nas decisões fechadas.
