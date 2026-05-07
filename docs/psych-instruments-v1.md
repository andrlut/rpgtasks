# Psych Instruments — Design v1

Documento de design pra unificar a Avaliação (questionário 48) e os testes
de autoconhecimento (Big Five, Schwartz, Apego) sob um mesmo schema, com
cálculos explicitamente documentados pra facilitar revisão e implementação.

Status: **draft pra revisão**, nada aplicado ainda.

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
| `big_five_120` | IPIP-NEO 120 (Big Five) | 120 | self_knowledge | Fase 2 |
| `schwartz_pvq` | PVQ-RR Valores | 57 | self_knowledge | Fase 5 |
| `ecr_r` | Apego (ECR-R) | 36 | self_knowledge | Fase 6 |

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
       ├─── psych_answer (raw responses)
       │
       └─── psych_score (computed per facet)
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
  reverse_scored  boolean not null default false,
  options_jsonb   jsonb not null            -- [{label, value}, ...]
);

create table public.psych_session (
  id                uuid primary key default gen_random_uuid(),
  character_id      uuid not null references public.character(id) on delete cascade,
  instrument_id     text not null references public.psych_instrument(id),
  taken_at          timestamptz not null default now(),
  duration_seconds  integer,
  is_complete       boolean not null default false
);

create table public.psych_answer (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.psych_session(id) on delete cascade,
  item_id      text not null references public.psych_item(id),
  raw_value    smallint not null
);

create table public.psych_score (
  session_id     uuid not null references public.psych_session(id) on delete cascade,
  facet_id       text not null references public.psych_facet(id),
  score_decimal  numeric(5, 2) not null,    -- escala depende do instrumento
  percentile     smallint,                  -- 0..100, null se não tem norma
  primary key (session_id, facet_id)
);
```

### 4.3 RLS

- `psych_instrument`, `psych_facet`, `psych_item` → **public-read** pra
  authenticated (catálogo).
- `psych_session`, `psych_answer`, `psych_score` → self-only via
  `character_id = auth.uid()` (igual hoje).
- Inserts via RPC com `security definer`.

### 4.4 Migration de transição

A v1 atual vive em `questionnaire_session` + `questionnaire_answer`. A
migration de transição vai:

1. Criar as novas tabelas.
2. Inserir `avaliacao_v1` no `psych_instrument`.
3. Migrar dados históricos (`questionnaire_session` → `psych_session` com
   `instrument_id = 'avaliacao_v1'`).
4. Manter `submit_questionnaire` funcionando como wrapper que delega pra
   nova RPC genérica `submit_psych_session(instrument_id, answers, duration)`.
5. **Não** deletar tabelas antigas no primeiro passo — deprecar e remover
   numa segunda migration depois que a UI nova for promovida.

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

| Fase | Entrega | Esforço | PRs |
|---|---|---|---|
| **0 — Foundation** | Migration genérica (psych_*), RPC, RLS, seed `avaliacao_v1` | ~3h | 1 |
| **1 — Avaliação v2** | 96 itens (48 novos), rotação no servidor, scoring decimal, UI atualizada | ~6h coding + ~2h conteúdo | 1 |
| **2 — IPIP-NEO 120** | Seed itens PT-BR + facetas + traços + tabela normativa, scoring, telas de resultado | ~6h coding + 1 manhã seeding | 1-2 |
| **3 — Perfil/Espelho** | Tab Perfil no Character, cards clicáveis, histórico | ~4h | 1 |
| **4 — Glossário** | Telas de detalhe permanentes pra todos os construtos, acesso via ⓘ | ~3h coding + ~4h conteúdo | 1 |
| **5 — Schwartz** | Mesmo padrão (infra pronta) | ~3h coding + ~2h conteúdo | 1 |
| **6 — ECR-R** | Mesmo padrão (infra pronta) | ~2h coding + ~1h conteúdo | 1 |

**MVP até Fase 4: ~30h focado.**

---

## 9. Decisões abertas (pra fechar antes de migrar)

1. **Pool de Avaliação v2 servido por banco ou cliente?**
   Recomendação: servidor sorteia 48 itens da pool de 96 e devolve no
   start da session (RPC `start_psych_session`). Reduz adulteração e
   permite balanceamento futuro (ex: priorizar items menos vistos).

2. **Persistir score_dim ou só score_sub?**
   Recomendação: só `score_sub` no `psych_score`. Dim é soma de 2 subs,
   computada on-read.

3. **Migração de dados v1 → novo schema:** transparente (mesma RPC,
   mesma UI) ou criar nova tela e deprecar a antiga em fases?
   Recomendação: transparente. Usuário não percebe que mudamos a fundação.

4. **Tabela normativa Big Five:** seedar com normas internacionais (mais
   simples, menos preciso) ou normas brasileiras (Hutz et al.; mais
   trabalho, mais preciso)?
   Recomendação MVP: internacionais. Refinar depois.

5. **Estado "session em andamento":** persistir respostas parciais no
   banco (custoso) ou só em AsyncStorage local (perde se trocar de
   device)?
   Recomendação: AsyncStorage. Sessions inacabadas ficam locais; só
   submetem no fim. `is_complete` do schema é defensivo.

6. **VIA Forças:** incluir via deep-link agora (V4) ou pular?
   Recomendação: pular o VIA. Se quiser função similar, escrever
   inventário próprio (mais trabalho, mas controle total).

---

## 10. Próximos passos imediatos

1. Revisar este doc.
2. Cravar respostas das pendências da seção 9.
3. Escrever a migration `20260506000001_psych_instruments.sql` baseada em
   §4.2.
4. Escrever os 48 novos itens da Avaliação v2 (Q2, Q4 das 12 subs).
5. Decidir ordem de Fase 1 (Avaliação v2) vs Fase 2 (Big Five) — ambas
   dependem só da Foundation.
