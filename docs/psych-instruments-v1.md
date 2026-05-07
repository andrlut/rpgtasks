# Psych Instruments — Design v1

Documento de design pra unificar a Avaliação (questionário 48) e os testes
de autoconhecimento (Big Five, Schwartz, Apego) sob um mesmo schema, com
cálculos explicitamente documentados pra facilitar revisão e implementação.

Status: **decisões fechadas, pronto pra implementação.** Última atualização
incorporou as respostas da §9 (agora §10 abaixo) e ajustes de schema da
§4. Nada aplicado no banco ainda.

---

## 1. Objetivo

Construir uma camada genérica de "instrumentos psicométricos" que sirva pra:

- O questionário Avaliação (já existe na v1, vai ser reescrito como v2 com
  pool rotativo de 96 itens).
- Big Five (IPIP-NEO 120) — MVP de autoconhecimento.
- Schwartz Values e Apego (ECR-R) — futuras fases.

**Princípio:** os testes não competem nem se misturam com o questionário
Avaliação. Eles respondem perguntas diferentes:

| | Pergunta | Janela |
|---|---|---|
| Avaliação | "Como eu tô agora?" | Estado, muda a cada ciclo (sugestão 90 dias) |
| Autoconhecimento | "Quem eu sou?" | Traço, muda devagar (anos) |

A interação entre eles acontece em três modos de uso:

1. **Perfil** — exibido como espelho, sem cálculo cruzado.
2. **Modificador de interpretação** — traço muda o texto de feedback da
   Avaliação, não a nota.
3. **Input de recomendação** — top forças/valores alimentam sugestões de
   tasks/quests/rewards.

---

## 2. Instrumentos previstos

| Slug | Nome | Itens | Categoria | Fase |
|---|---|---|---|---|
| `avaliacao_v1` | Avaliação 24 perguntas (existente) | 24 | wellbeing | já em produção |
| `avaliacao_v2` | Avaliação 96 (pool) / 48 (servidos) | 96 | wellbeing | Fase 1 |
| `big_five_120` | IPIP-NEO 120 (Big Five) | 120 | self_knowledge | Fase 4 (lançamento depende de licenciamento) |
| `schwartz_pvq` | PVQ-RR Valores | 57 | self_knowledge | Fase 5 (bloqueado em licenciamento) |
| `ecr_r` | Apego (ECR-R) | 36 | self_knowledge | Fase 6 (bloqueado em licença + idade + app store) |
| `via` | VIA Forças | — | self_knowledge | **fora do MVP** — apenas deep-link se realmente necessário |

---

## 3. Licenciamento e tradução

| Instrumento | Status | Tradução PT-BR | Pode hospedar itens no app? |
|---|---|---|---|
| Avaliação v1/v2 | autoria própria | original | sim |
| IPIP-NEO 120 | domínio público (Goldberg/Johnson) | existe versão validada (Hutz et al., e variações no IPIP oficial) | **sim**, verbatim |
| PVQ-RR (Schwartz) | livre pra não-comercial; comercial requer contato | existe | sim, com confirmação de termos |
| ECR-R | livre pra pesquisa/clínica | existe (Natividade et al.) | sim, com confirmação de termos |
| VIA Forças | ❌ copyright VIA Institute | — | **não** — usar deep-link pra viacharacter.org se for incluir |

**Regra:** itens de instrumentos validados não podem ser alterados sem
quebrar a validade psicométrica. Podemos ajustar instruções, escala visual,
ordem de apresentação. Nunca o conteúdo do item.

---

## 4. Schema proposto

### 4.1 Diagrama

```
psych_instrument (catalog)
       │
       ├─── psych_facet (catalog) ──── [self-ref: parent_facet_id]
       │       │
       └─── psych_item (catalog) ──┘
               │
               │
psych_session (per user × instrument × attempt)
       │
       ├─── psych_session_item (which items were served, in order)
       │
       ├─── psych_answer (raw responses)
       │
       └─── psych_score (computed per facet, with norm meta)
```

### 4.2 Tabelas

```sql
create table public.psych_instrument (
  id              text primary key,        -- 'avaliacao_v2', 'big_five_120'
  name            text not null,
  description     text,
  category        text not null            -- 'wellbeing' | 'self_knowledge'
                  check (category in ('wellbeing', 'self_knowledge')),
  version         text not null,           -- 'v2.0', 'ipip-neo-120'
  item_count      integer not null,
  scale_min       smallint not null default 1,
  scale_max       smallint not null default 5,
  scoring_doc_url text,                    -- pointer pro doc desse arquivo
  is_active       boolean not null default true
);

create table public.psych_facet (
  id               text primary key,        -- 'avaliacao:sub:sleep',
                                            -- 'big_five:trait:openness',
                                            -- 'big_five:facet:openness:imagination'
  instrument_id    text not null references public.psych_instrument(id),
  parent_facet_id  text references public.psych_facet(id),
  slug             text not null,           -- 'sleep', 'openness', 'imagination'
  name             text not null,
  description      text,
  position         integer
);

create table public.psych_item (
  id              text primary key,         -- 'sleep_consistent', 'bf_o_im_1'
  instrument_id   text not null references public.psych_instrument(id),
  facet_id        text references public.psych_facet(id),
  position        integer not null,
  text_pt         text not null,
  text_en         text,                    -- bilingual; null falls back to text_pt
  reverse_scored  boolean not null default false,
  options_jsonb   jsonb not null            -- [{label, value, label_en?}, ...]
);

create table public.psych_session (
  id                  uuid primary key default gen_random_uuid(),
  character_id        uuid not null references public.character(id) on delete cascade,
  instrument_id       text not null references public.psych_instrument(id),
  instrument_version  text not null,                   -- snapshot do version do
                                                       -- catálogo no momento da
                                                       -- sessão (audit trail)
  status              text not null default 'started'
                      check (status in ('started', 'completed', 'abandoned')),
  started_at          timestamptz not null default now(),
  completed_at        timestamptz,
  taken_at            timestamptz not null default now(),
  duration_seconds    integer,
  -- legado pra compat com a v1 atual; novos consumers devem usar `status`
  is_complete         boolean generated always as (status = 'completed') stored
);

-- Quais itens foram servidos em cada sessão. Crítico pra Avaliação v2 onde
-- 48 itens são sorteados de uma pool de 96 — sem isso não dá pra retomar
-- sessão, auditar nem reproduzir o resultado.
create table public.psych_session_item (
  session_id  uuid not null references public.psych_session(id) on delete cascade,
  item_id     text not null references public.psych_item(id),
  position    integer not null,
  primary key (session_id, item_id),
  unique (session_id, position)
);

create table public.psych_answer (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.psych_session(id) on delete cascade,
  item_id      text not null references public.psych_item(id),
  raw_value    smallint not null
               check (raw_value between 1 and 7),     -- guard genérico; a
                                                      -- validação por escala
                                                      -- (1-5 vs 1-6 vs 1-7)
                                                      -- fica na RPC submit
  unique (session_id, item_id)                        -- 1 resposta por item
                                                      -- por sessão; o cliente
                                                      -- faz upsert
);

create table public.psych_score (
  session_id     uuid not null references public.psych_session(id) on delete cascade,
  facet_id       text not null references public.psych_facet(id),
  score_decimal  numeric(5, 2) not null,              -- escala depende do
                                                       -- instrumento
  percentile     smallint,                            -- 0..100, null se não
                                                       -- tem norma
  norm_set_id    text,                                -- e.g. 'ipip_intl_2024',
                                                       -- 'br_hutz_2018', etc.
                                                       -- null = score raw sem
                                                       -- normalização
  score_meta     jsonb not null default '{}'::jsonb,  -- centragem, raw sum,
                                                       -- z-score etc por
                                                       -- instrumento
  primary key (session_id, facet_id)
);
```

### 4.3 RLS

- `psych_instrument`, `psych_facet`, `psych_item` → **public-read** pra
  authenticated (catálogo).
- `psych_session`, `psych_session_item`, `psych_answer`, `psych_score` →
  self-only.

A v1 do questionnaire usa `character_id = auth.uid()` direto — funciona
porque hoje `character.id` é o próprio `auth.uid()`. **Antes de aplicar
a migration, confirmar se essa identidade ainda vale.** Se em algum
momento `character` ganhar um `user_id` separado do `id`, as policies
precisam usar join:

```sql
create policy "psych_session_self" on public.psych_session
  for select to authenticated
  using (
    exists (
      select 1 from public.character c
      where c.id = psych_session.character_id
        and c.id = auth.uid()
    )
  );
```

Inserts via RPC com `security definer`. Reads diretos (TanStack Query) usam
as policies acima.

### 4.4.1 RPC `start_psych_session`

Pra Avaliação v2 com pool rotativo de 96 itens, o **servidor** decide
quais 48 servir. Cliente não escolhe.

```sql
create function public.start_psych_session(
  p_instrument_id text
) returns uuid
language plpgsql
security definer
as $$
declare
  v_session_id uuid;
  v_user uuid := auth.uid();
  v_version text;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select version into v_version
  from public.psych_instrument
  where id = p_instrument_id and is_active;

  if v_version is null then
    raise exception 'Instrument not found or inactive';
  end if;

  insert into public.psych_session (character_id, instrument_id, instrument_version)
  values (v_user, p_instrument_id, v_version)
  returning id into v_session_id;

  -- Por instrumento, regra diferente. Avaliação v2: 1 item de cada Q1-Q4
  -- por sub. Big Five: todos os 120. Schwartz: todos os 57. Etc.
  -- Implementação por instrumento dispatcher inline ou função auxiliar.
  perform public.psych_seed_session_items(v_session_id, p_instrument_id);

  return v_session_id;
end $$;
```

`psych_seed_session_items` é um dispatcher por `instrument_id`. Pra
Avaliação v2 ele faz o sorteio rotativo. Pra Big Five/Schwartz, devolve
todos os itens na ordem do catálogo (com possível embaralhamento entre
facetas pra reduzir efeito de ordem).

### 4.4.2 RPC `submit_psych_session`

Wrapper genérico que substitui `submit_questionnaire`. Recebe
`session_id` + `answers[]`, valida que todos os itens batem com
`psych_session_item`, escreve em `psych_answer`, dispatcha o cálculo de
score por instrumento, escreve `psych_score` e marca `status='completed'`.

Para Avaliação v1/v2 também escreve em `character_sub_score` e
`assessment_log` (compat com a UI atual).

### 4.5 Sessão em andamento (decisão: híbrido)

- **Servidor:** cria sessão e fixa os itens no `psych_session_item` no
  `start_psych_session`. Sessão tem `status='started'` enquanto o usuário
  responde.
- **Cliente:** guarda respostas parciais em AsyncStorage. **Não** faz
  upsert por resposta — só envia o batch no fim via `submit_psych_session`.
- Se usuário abandonar e voltar: cliente recupera respostas locais, ou
  começa nova sessão (`status='abandoned'` na anterior).

Vantagem: pool fixado no servidor (auditável + retomada possível); rede
só é usada uma vez no fim (latência mínima durante o teste).

### 4.6 Migration de transição

**Decisão:** transparente — usuário não percebe a troca de fundação.

A v1 atual vive em `questionnaire_session` + `questionnaire_answer`. A
migration de transição vai:

1. Criar as novas tabelas (`psych_*`).
2. Inserir `avaliacao_v1` no `psych_instrument` (apontando pros itens da
   v1 já em `app/lib/assessment/questions.ts`).
3. Migrar dados históricos (`questionnaire_session` → `psych_session` com
   `instrument_id = 'avaliacao_v1'`, `status = 'completed'`,
   `instrument_version = 'v1.0'`). Idem pros `psych_answer`.
4. Manter `submit_questionnaire` como **wrapper** que delega pra nova RPC
   genérica `submit_psych_session(instrument_id, answers, duration)`. UI
   v1 continua funcionando sem mudanças.
5. **Não** deletar `questionnaire_session` / `questionnaire_answer` na
   primeira migration. Deprecar e remover numa segunda migration depois
   que a UI nova for promovida e estiver estável em produção.

---

## 5. Scoring por instrumento

Cada instrumento tem regra própria. Esta seção documenta cada uma com
exatidão pra que a implementação no SQL/TS seja só transcrição.

### 5.1 Avaliação v2

**Estrutura:**
- 12 subs × 4 facetas (Q1 Comportamento, Q2 Qualidade, Q3 Resultado,
  Q4 Atrito) = 48 itens servidos por session.
- Pool de 96 itens (2 por faceta) — em cada session, sorteia-se 1 item por
  faceta por sub (= 48 itens da session).
- Escala 1–5. Itens de atrito têm opções já invertidas (5 = sempre melhor),
  então `reverse_scored = false` no banco.

**Cálculo:**

```
Por item:
  normalized = (raw_value - 1) / 4    →  [0, 1]

Por sub (4 itens):
  score_sub_decimal = mean(normalized_4) × 5    →  [0, 5]

Por dimensão (2 subs):
  score_dim_decimal = score_sub_a + score_sub_b    →  [0, 10]
```

**Persistência:**
- `psych_score` com `facet_id = 'avaliacao:sub:<slug>'` recebe o decimal.
- `character_sub_score(source='questionnaire', sub_id, score)` continua
  recebendo o `round(score_sub_decimal)` pra compat com a UI atual.
- Dimensão é computada on-read (soma de 2 subs); não persistida.

**UI exibe:**
- Subs e dims com 1 casa decimal: `Sleep 3.8 / 5`, `Health 7.4 / 10`.

### 5.2 IPIP-NEO 120 (Big Five)

**Estrutura:**
- 5 traços: Openness (O), Conscientiousness (C), Extraversion (E),
  Agreeableness (A), Neuroticism (N).
- 6 facetas por traço = 30 facetas. Exemplo de O:
  Imagination, Artistic Interests, Emotionality, Adventurousness,
  Intellect, Liberalism.
- 4 itens por faceta = 120 itens.
- Escala Likert 5 pontos: Discordo totalmente (1) → Concordo totalmente (5).
- ~40% dos itens são reverse-scored (declarações negativas).

**Cálculo:**

```
Por item:
  adjusted = raw_value             se reverse_scored = false
           = (6 - raw_value)       se reverse_scored = true

Por faceta (4 itens):
  facet_raw = sum(adjusted_4)      →  [4, 20]

Por traço (6 facetas):
  trait_raw = sum(facet_raw_6)     →  [24, 120]

Percentil:
  facet_percentile = lookup(facet_raw, norms_table[facet_id])
  trait_percentile = lookup(trait_raw, norms_table[trait_id])
```

**Tabelas normativas:** o IPIP oficial publica normas baseadas em milhares
de respondentes (separadas por gênero/idade quando aplicável). Pra MVP,
usar normas internacionais combinadas; refinar com normas brasileiras
depois (o Hutz et al. tem normas locais).

**Persistência:**
- `psych_score` com `facet_id`:
  - 30 rows com `facet_id = 'big_five:facet:<trait>:<facet>'`,
    `score_decimal = facet_raw`, `percentile = facet_percentile`.
  - 5 rows com `facet_id = 'big_five:trait:<trait>'`,
    `score_decimal = trait_raw`, `percentile = trait_percentile`.

**UI exibe:** percentil ("Conscienciosidade — 78º percentil") como número
principal; raw como secundário.

### 5.3 Schwartz PVQ-RR (Fase 5, futuro)

**Estrutura:**
- 19 valores básicos (ex: autonomia de pensamento, estimulação,
  hedonismo, conquista, segurança pessoal, conformidade interpessoal,
  benevolência cuidado, universalismo natureza, etc).
- 3 itens por valor = 57 itens.
- Escala 1–6: "não se parece nada comigo" → "muito parecido comigo".
- 19 valores agrupam em 4 valores de ordem superior:
  - Self-Transcendence (Universalismo, Benevolência)
  - Self-Enhancement (Conquista, Poder)
  - Openness to Change (Autonomia, Estimulação, Hedonismo)
  - Conservation (Tradição, Conformidade, Segurança)

**Cálculo:**

```
Por item:
  raw_value (sem reverse — não tem itens reversos no PVQ)

Por valor (3 itens):
  value_mean = mean(raw_3)         →  [1, 6]

Centragem (CRÍTICO em Schwartz):
  pessoa_mean = mean(todos os 57 itens)
  value_centered = value_mean - pessoa_mean

  Esse passo controla viés de aquiescência (pessoas que tendem a marcar
  alto em tudo). Sem centragem, o ranking de valores fica enviesado.

Por valor de ordem superior:
  meta_value = mean(value_centered dos valores filhos)
```

**Persistência:**
- Pra cada valor: `psych_score(facet_id='schwartz:value:<slug>',
  score_decimal=value_centered)`.
- Pra cada meta-valor: `psych_score(facet_id='schwartz:meta:<slug>',
  score_decimal=meta_value)`.

**UI exibe:** ranking dos 19 valores por `value_centered` (não pelo raw),
top 5 destacados.

### 5.4 ECR-R (Fase 6, futuro)

**Estrutura:**
- 36 itens, 2 escalas: Anxiety (18 itens) e Avoidance (18 itens).
- Escala Likert 7 pontos.
- Vários itens reversos.

**Cálculo:**

```
Por item:
  adjusted = raw                   se reverse = false
           = (8 - raw)             se reverse = true

Por escala (18 itens cada):
  anxiety_score   = mean(adjusted_18_anxiety)        →  [1, 7]
  avoidance_score = mean(adjusted_18_avoidance)      →  [1, 7]

Estilo categórico:
  if anxiety < 4 and avoidance < 4: 'secure'
  if anxiety >= 4 and avoidance < 4: 'anxious'
  if anxiety < 4 and avoidance >= 4: 'avoidant'
  if anxiety >= 4 and avoidance >= 4: 'fearful'
```

**Persistência:**
- `psych_score(facet_id='ecr_r:scale:anxiety', score_decimal=...)`
- `psych_score(facet_id='ecr_r:scale:avoidance', score_decimal=...)`
- Categoria computada na UI (não persistida — é função pura dos dois
  decimais).

---

## 6. UX

### 6.1 Espelho — entrada via Character tab

```
Character tab
  ├── stats (já existe)
  ├── pesos (já existe)
  └── 🆕 Perfil ▸  (entrada do espelho)
        │
        ├── Avaliação atual    [Sleep 3.8 · Movement 4.2 · ...]
        ├── Big Five           [O 72 · C 85 · E 41 · A 68 · N 58]
        ├── Valores            [vazio - "fazer teste"]
        └── Apego              [vazio - "fazer teste"]
```

### 6.2 Tomada do teste

Padrão único pra todos:

- Tela de intro: explicação do teste + tempo estimado + "começar".
- Card por item, scroll por gesto ou tap no botão de resposta avança
  automaticamente.
- Progress bar discreta no topo.
- Possibilidade de pausar (session com `is_complete=false`) e retomar.
- Submit chama RPC `submit_psych_session`.

### 6.3 Tela de resultado

Por instrumento, mas com componentes em comum:

- Cards de "primeiro nível" (subs / traços / valores) clicáveis.
- Tap em card → tela de detalhe do construto (ver 6.4).
- Histórico (sparkline) se a pessoa já tomou o teste antes.
- "fazer de novo" CTA.

### 6.4 Glossário sempre acessível

Cada faceta/traço/valor tem uma tela de detalhe permanente:

- O que é esse construto.
- O que sua nota significa (alta vs baixa).
- Como aparece no dia a dia.
- (Big Five) implicação pro app: ex. "alta conscienciosidade aceita
  targets mais altos".

Acesso:
- Direto via Perfil → tap no card.
- Via "ⓘ" em qualquer outra tela que cite o construto.
- (Stretch) command palette tipo "o que é Conscienciosidade?".

### 6.5 Modo 2 (modificador de interpretação)

Quando user abre o resultado da Avaliação:

- Sub Romance baixo + Apego ansioso → bloco contextual: "padrão pode estar
  refletindo apego, não só comportamento."
- Sub Mind/Contemplate baixo + Neuroticismo alto → "prática especialmente
  importante pra você."

Esses blocos vêm de uma tabela de regras estática (TS), não computados
no banco.

---

## 7. Conteúdo estático

Bundle no app, não no BD:

```
app/lib/psych/content/
  ├── big-five.ts          (5 traços × {summary, high, low, dayToDay})
  │                         (30 facetas × {summary})
  ├── schwartz.ts          (19 valores × {summary, dayToDay})
  ├── ecr-r.ts             (4 estilos × {summary, dayToDay, growth})
  ├── interpretations.ts   (regras Modo 2: trigger → texto)
  └── index.ts             (façade)
```

Critério: conteúdo que muda devagar e versiona com o app fica em TS.
Conteúdo dinâmico (notas do usuário, série temporal) fica no BD.

---

## 8. Plano de fases

Reordenado pra separar **entrega segura** (instrumentos próprios, infra)
de **entrega dependente de licenciamento** (instrumentos externos).

| Fase | Entrega | Esforço | Status |
|---|---|---|---|
| **0 — Foundation** | Migration genérica (psych_*, psych_session_item), RPCs `start_psych_session` + `submit_psych_session`, RLS, seed `avaliacao_v1`, wrapper `submit_questionnaire` | ~3h | ✅ pode fazer agora |
| **1 — Avaliação v2** | Pool de 96 itens (48 novos a redigir), rotação no servidor, scoring decimal, UI atualizada | ~6h coding + ~2h conteúdo | ✅ pode fazer agora |
| **2 — Perfil/Espelho** | Tab Perfil no Character, cards clicáveis (Avaliação primeiro; outros como placeholder), histórico | ~4h | ✅ pode fazer agora |
| **3 — Glossário da Avaliação** | Telas de detalhe permanentes pros 12 subs e 6 dims, acesso via ⓘ. Glossário de instrumentos externos como estrutura vazia. | ~3h coding + ~4h conteúdo | ✅ pode fazer agora |
| **4 — Big Five (IPIP-NEO 120)** | Seed itens PT-BR + facetas + traços + norma MVP, scoring, telas de resultado, modo 2 (interpretação) | ~6h coding + 1 manhã seeding | ⚠ preparar técnico, **não lançar** sem fechar tradução + norma + copy |
| **5 — Schwartz PVQ-RR** | Estrutura, telas, scoring com centragem | ~3h coding + ~2h conteúdo | ⛔ **bloqueado** em permissão de uso comercial + tradução |
| **6 — ECR-R** | Estrutura, telas, scoring + categoria | ~2h coding + ~1h conteúdo | ⛔ **bloqueado** em licença + tradução + idade + revisão app store |

**MVP seguro (0–3) = ~30h focado.** Liberação 4–6 depende de licenciamento.

A única mudança estrutural indispensável antes da migration é incluir
`psych_session_item`. Sem isso o pool rotativo da Avaliação v2 fica
incompleto.

---

## 9. Decisões fechadas

Resolvidas. Implementação prossegue com base nelas.

1. **Pool da Avaliação v2 — servidor.** Sorteio via `start_psych_session`,
   48 servidos por sessão. Auditoria, rotação balanceada, retomada futura.
2. **Persistência de dimensão — só sub/facet.** Dim é soma de 2 subs,
   computada on-read. Não persistir `score_dim`.
3. **Migração da v1 — transparente.** `submit_questionnaire` vira wrapper
   da nova RPC genérica. Tabelas antigas não deletadas na primeira
   migration.
4. **Normas Big Five — MVP com normas internacionais ou raw/percentil
   com aviso.** Não bloquear o MVP por norma BR. Guardar `norm_set_id`
   no `psych_score` e comunicar na UI que a referência inicial não é
   norma brasileira.
5. **Sessão em andamento — híbrido.** Sessão e itens fixados no servidor;
   respostas parciais em AsyncStorage; submissão no fim.
6. **VIA Forças — fora do MVP.** No máximo deep-link externo no futuro.
   Se algo similar, fazer inventário autoral.

---

## 10. Licenciamento e risco de publicação

### Pode lançar sem confirmação adicional

- Foundation `psych_*`
- Avaliação v1 migrada
- Avaliação v2 (pool 96/48, scoring decimal)
- Perfil/Espelho (estrutura)
- Glossário da Avaliação
- Regras autorais de interpretação baseadas só na Avaliação

### Pode preparar tecnicamente, **não lançar ainda**

**Big Five / IPIP-NEO 120** — instrumento externo mais seguro pro MVP,
mas antes de produção precisa fechar:
- versão exata dos itens;
- tradução PT-BR usada (recomendado: IPIP-NEO oficial PT-BR ou Hutz et al.);
- fonte normativa (`norm_set_id`);
- copy deixando claro se a norma é internacional.

**Schwartz / PVQ-RR** — não lançar até confirmar:
- uso comercial autorizado;
- direito de hospedagem dos itens;
- tradução PT-BR;
- citação/termos obrigatórios.

**ECR-R** — não lançar no MVP. Além de licença/tradução, traz risco extra
de classificação etária e revisão em app stores (apego adulto /
relacionamentos). Se entrar no futuro, recomendado:
- age gate 18+ ou política explícita;
- resultado dimensional, não diagnóstico;
- linguagem de reflexão, não clínica;
- não usar pra ads / targeting;
- não posicionar como terapia.

**VIA** — manter fora. Apenas deep-link, se realmente necessário.

### Registro de status (recomendado em código)

```ts
// app/lib/psych/instrumentStatus.ts
export const instrumentStatus = {
  avaliacao_v2: {
    implementation: 'ready',
    licensing: 'owned',
    canLaunch: true,
  },
  big_five_120: {
    implementation: 'prepare_after_foundation',
    licensing: 'low_risk_but_confirm_translation_and_norms',
    canLaunch: false,
  },
  schwartz_pvq: {
    implementation: 'prepare_only',
    licensing: 'requires_permission_for_commercial_use',
    canLaunch: false,
  },
  ecr_r: {
    implementation: 'prepare_only',
    licensing: 'requires_translation_permission_and_age_policy',
    appStoreRisk: 'medium',
    canLaunch: false,
  },
  via: {
    implementation: 'skip',
    licensing: 'do_not_host',
    canLaunch: false,
  },
} as const;
```

A UI deve esconder a CTA de `start_psych_session` para qualquer instrumento
com `canLaunch: false` em produção (pode mostrar em dev / preview).

---

## 11. Próximos passos imediatos

1. Escrever a migration `20260507000001_psych_foundation.sql` baseada
   em §4.2 (incluindo `psych_session_item`, `status` enum,
   `norm_set_id`, `score_meta`).
2. Escrever os RPCs `start_psych_session` + `submit_psych_session` +
   `psych_seed_session_items` (dispatcher por instrumento).
3. Migrar `avaliacao_v1` para o novo schema; manter
   `submit_questionnaire` como wrapper.
4. Redigir os 48 itens novos da Avaliação v2 (Q2 Qualidade + Q4 Atrito
   das 12 subs).
5. Implementar UI da Avaliação v2 (sessão híbrida com AsyncStorage,
   submit final).
6. Implementar Perfil/Espelho e Glossário da Avaliação.
7. **Antes** de Big Five entrar em produção: fechar §10 (tradução,
   norma, copy).
