# Self-Assessment redesign + Sub Glossary — implementation plan v1

Status: **draft pra execução.** Tudo decidido, pronto pra implementar numa rodada só.

---

## 1. Por que mudar

A self-assessment atual tem 4 problemas que se acumulam:

1. **Tap-on-pip integer 0-5 é leve demais.** Mudar Sleep de 3 pra 4 é um toque sem peso — a UX não corresponde à seriedade do que se tá afirmando ("hoje eu durmo melhor do que durmo há 90 dias").
2. **Trendline em destaque vira tentação.** Ver a curva subindo encoraja mexer no slider pra "puxar" a linha em vez de refletir.
3. **Mismatch de precisão com a v2.** Quiz produz decimal `3.8`; self só consegue inteiro `3` ou `4`. O hex mistura precisões.
4. **Sub sem contexto narrativo.** "Sleep 3" não diz nada — comparado a quê? Sem âncora descritiva, a nota é vibe pura.

A redesign endereça todos os 4 e abre caminho pra unificar com o glossário (Fase 4 da roadmap).

---

## 2. UX da nova self-assessment

### 2.1 Estrutura por sub-card

Cada um dos 12 subs renderiza como um card em scroll:

```
┌─────────────────────────────────────────────────┐
│ 🌙  Sleep                                  3.5  │
│     Quantidade, consistência e qualidade…       │
│                                                  │
│  [────────●────────────]  0 ─── 5              │
│   pendente: 3.5 (era 3.0)                       │
│                                                  │
│  ▾ Ver detalhes                                 │
└─────────────────────────────────────────────────┘
```

- **Header**: ícone + nome + score atual (1 decimal, à direita)
- **Summary**: 1 linha sempre visível (campo `summary`)
- **Slider**: 0-5, snap **0.5** (11 níveis: 0, 0.5, 1, …, 5). Thumb arrastável.
- **Pendente vs salvo**: enquanto o slider mexe, mostra "pendente: X (era Y)" — diff sutil, só aparece se ≠ valor salvo.
- **"Ver detalhes" colapsado** (default fechado) — tap expande pra mostrar:
  - `definition` (parágrafo)
  - 3 mini-cards `low` / `mid` / `high` em fila vertical, cores discretas (red-tint / neutral / green-tint)
  - Link "Ver pillar →" leva pra `/sub/[id]`

### 2.2 Save button explícito

- Rodapé fixo (sticky) com "Salvar" + contador "X mudanças pendentes"
- Acende (cor sólida) quando ≥1 sub tem valor pendente ≠ valor salvo. Apagado (translúcido) quando tudo igual.
- Tap → escreve todas as mudanças via uma RPC só (`set_sub_scores_bulk` — ver §4).
- Haptic success + toast "Salvo" + reset do estado pendente.
- Sair sem salvar (back nativo, swipe) → Alert "Descartar mudanças?"

### 2.3 Trendline

- **Mantém**, mas em janela maior — sparkline dos últimos **90 dias** (era ~últimos 20 entries).
- Mexer hoje praticamente não move a curva → desincentiva "puxar a linha".
- Posicionada discreta no header do card (mini, ~56×16) ao lado do score.

### 2.4 Scale endpoints

- Hint do slider: "0 vazio · 5 pleno" (era "0 missing · 5 mastery", em EN — preciso traduzir)
- Sem números visíveis nos extremos do slider (zero e cinco) — só cor e label "0" / "5" minúsculos abaixo.

---

## 3. Glossário sub-level (`/sub/[id]`)

Tela permanente focada em um único sub. Reusa as mesmas 5 strings.

### 3.1 Layout

```
┌─ Header ────────────────────────────────────────┐
│ ←  💪  Strength                                 │
└─────────────────────────────────────────────────┘

  STRENGTH                                  4.2
  ──────                       self · quiz: 4.5

  Capacidade física pra carregar a vida.

  Quão forte e capaz seu corpo é no dia a dia —
  pra esforço, esporte, autonomia. Cobre frequên-
  cia de treino, qualidade do esforço…

  ─── Como parece ──────────────────────────────

  [card vermelho-tinto]
  Baixo (0-1)
  Atividade física é rara ou ausente. Subir alguns
  lances de escada cansa. Carregar sacolas pesadas
  dói no dia seguinte…

  [card neutro]
  Médio (2-3)
  Você treina 1-2x por semana, ou faz cardio…

  [card verde-tinto]
  Alto (4-5)
  Treino de força ou esporte intenso 3+ vezes…

  ─── Tasks recomendadas ───────────────────────

  • Treino de força 4x/sem
  • Cardio 30min 3x/sem
  • …

  Ver pillar completo (Body) →
```

### 3.2 Roteamento

Adicionar rota `/sub/[id]` em `app/_layout.tsx` como modal (igual `/dimension/[id]`).

Pontos de entrada:
- Tap no nome/ícone do sub em **HexChart legend cards** (cards sob o hex que mostram cada dim)
- Tap no **SubPanel header** dentro de `/dimension/[id]` (substitui o efeito de "expandir tasks" se houver)
- "ⓘ" ao lado de **sub pills** em TaskCard (componente `SubBadge`)
- Slider self-assessment: tap no nome do sub no card

### 3.3 Conteúdo das strings reusadas

A tela /sub/[id] consome:
- `summary` → subtítulo
- `definition` → parágrafo principal
- `low` → card vermelho-tinto
- `mid` → card neutro
- `high` → card verde-tinto

Mesmas strings que a self-assessment usa expandida. Nenhum texto novo — só layout diferente.

---

## 4. Mudanças no schema + RPC

### 4.1 Migration `20260507000006_decimal_self_score.sql`

Estende `set_sub_score` pra aceitar decimal:

```sql
create or replace function public.set_sub_score(
  p_source        text,
  p_sub_id        text,
  p_score         smallint,                    -- legacy integer (mantém)
  p_score_decimal numeric default null         -- novo opcional
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_int  smallint;
  v_dec  numeric;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if p_source not in ('self', 'questionnaire') then
    raise exception 'Invalid source: %', p_source;
  end if;

  -- Se passou decimal, usa ele como source-of-truth e deriva integer
  if p_score_decimal is not null then
    if p_score_decimal < 0 or p_score_decimal > 5 then
      raise exception 'score_decimal must be 0-5';
    end if;
    v_dec := round(p_score_decimal::numeric, 2);
    v_int := greatest(0, least(5, floor(v_dec)::int))::smallint;
  else
    if p_score < 0 or p_score > 5 then
      raise exception 'Score must be 0-5';
    end if;
    v_int := p_score;
    v_dec := null;
  end if;

  if not exists (select 1 from public.dimension_sub where id = p_sub_id) then
    raise exception 'Unknown sub_id: %', p_sub_id;
  end if;

  insert into public.character_sub_score
    (character_id, source, sub_id, score, score_decimal)
  values (auth.uid(), p_source, p_sub_id, v_int, v_dec)
  on conflict (character_id, source, sub_id)
  do update set
    score         = excluded.score,
    score_decimal = excluded.score_decimal,
    updated_at    = now();

  insert into public.assessment_log
    (character_id, source, sub_id, score)
  values (auth.uid(), p_source, p_sub_id, v_int);
end $$;
```

E uma RPC bulk pra o save button:

```sql
create or replace function public.set_sub_scores_bulk(
  p_source  text,
  p_entries jsonb        -- [{sub_id, score_decimal}]
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare e jsonb;
begin
  for e in select * from jsonb_array_elements(p_entries) loop
    perform public.set_sub_score(
      p_source,
      e->>'sub_id',
      null::smallint,
      (e->>'score_decimal')::numeric
    );
  end loop;
end $$;

grant execute on function public.set_sub_scores_bulk(text, jsonb) to authenticated;
```

### 4.2 (Opcional, considerar) `assessment_log.score_decimal`

Se quisermos histórico de decimal pra sparkline mais rica:

```sql
alter table public.assessment_log
  add column score_decimal numeric(5,2);
```

`set_sub_score` escreveria `score_decimal` junto. Sparkline da tela self-assessment lê decimal quando disponível, integer caso contrário.

**Decisão sugerida:** ship sem isso primeiro. Se sparkline visualmente parecer "step function" feio com integer, adiciona em segunda rodada.

---

## 5. Mudanças nos componentes

### 5.1 `HexChart.tsx` — barra contínua

Hoje (linhas 354-367) cada sub renderiza como 5 segmentos pip:

```tsx
{[1, 2, 3, 4, 5].map((p) => (
  <View style={[styles.segment, { backgroundColor: p <= score ? meta.color : `${meta.color}1A` }]} />
))}
```

Trocar por uma única barra com fill proporcional:

```tsx
<View style={styles.bar}>
  <View
    style={[
      styles.barFill,
      {
        width: `${Math.max(0, Math.min(100, (score / 5) * 100))}%`,
        backgroundColor: meta.color,
      },
    ]}
  />
</View>
```

Mantém a leitura visual rápida e respeita decimal.

### 5.2 `DimensionCrest.tsx` — `ScorePips` vira `ScoreBar`

Componente atual `ScorePips` (linhas 211-220) faz `Math.round(score)` e renderiza pips. Substituir por barra contínua proporcional, mesmo padrão acima.

### 5.3 `SubPanel.tsx` — collapse "Ver detalhes"

Hoje (linha 158): `<Text>{subMeta.description}</Text>`

Trocar por:

```tsx
<Text style={styles.summary}>{subMeta.summary}</Text>
<Pressable onPress={() => setExpanded(!expanded)}>
  <Text>{expanded ? '▴' : '▾'} Ver detalhes</Text>
</Pressable>
{expanded && (
  <>
    <Text style={styles.definition}>{subMeta.definition}</Text>
    <SubAnchorCard variant="low"  text={subMeta.low}  color={meta.color} />
    <SubAnchorCard variant="mid"  text={subMeta.mid}  color={meta.color} />
    <SubAnchorCard variant="high" text={subMeta.high} color={meta.color} />
  </>
)}
```

Novo componente `<SubAnchorCard>` em `app/components/` — card pequeno com label "Baixo (0-1)" / "Médio (2-3)" / "Alto (4-5)" e o texto da string.

### 5.4 `self-assessment.tsx` — refator total

Substituir todo o conteúdo do mapeamento de subs (linhas 119-220) pela nova estrutura de cards com slider + Save sticky no rodapé. Estado interno:

```tsx
const [drafts, setDrafts] = useState<Map<SubId, number>>(new Map());

// drafts contém apenas subs com valor pendente diferente do salvo.
const hasPending = drafts.size > 0;
const handleSlide = (subId, value) => { /* set into drafts if !== saved */ };
const handleSave = () => {
  const entries = Array.from(drafts.entries()).map(([sub_id, score_decimal]) => ({sub_id, score_decimal}));
  await supabase.rpc('set_sub_scores_bulk', { p_source: 'self', p_entries: entries });
  // invalidate queries; clear drafts; haptic + toast
};
```

Pacote de slider: usar `@react-native-community/slider` (já é dep do Expo SDK 54 default). Snap manual em 0.5 via `step={0.5}`.

### 5.5 `app/app/sub/[id].tsx` — nova tela

Tela permanente do glossário. Layout descrito em §3.1. Componente novo. Roteiro registrado em `_layout.tsx`.

---

## 6. Mudanças no i18n catalog

### 6.1 Estrutura nova de subs

Hoje (em `app/lib/i18n/locales/{pt,en}.ts` em algum lugar — verificar nome do path):

```ts
subs: {
  sleep: { label: 'Sono', description: 'Como você dorme...' },
  // ...
}
```

Depois:

```ts
subs: {
  sleep: {
    label: 'Sono',
    summary: 'Quantidade, consistência e qualidade do descanso.',
    definition: 'Como você dorme — quantidade, consistência…',
    low:  'Você dorme menos de 6h…',
    mid:  'Você dorme 6-7h por noite…',
    high: 'Você dorme 7-9h consistentemente…',
  },
  // ... 11 outros
}
```

Substituir o campo `description` direto — sem alias. Atualizar consumidores:

- `app/components/SubPanel.tsx:158` — usa `subMeta.description` → trocar por `summary` (sempre visível) + collapse com `definition` + 3 anchors
- `app/app/self-assessment.tsx:203` — vai ser refatorado completamente, não cita `subMeta.description` mais

### 6.2 Tipo `SubMeta` em `app/lib/i18n/meta.ts`

Atualizar a tipagem retornada por `metaLookup.sub(...)` pra incluir os 5 campos novos. Verificar `meta.ts` pra ver shape atual.

---

## 7. Conteúdo das 120 strings (PT + EN)

### 7.1 Subs (cada um: summary + definition + low + mid + high)

#### sleep — pt

```
summary: Quantidade, consistência e qualidade do descanso.

definition: Como você dorme — quantidade, consistência e qualidade
do descanso. É o pré-requisito biológico de tudo o resto: foco,
humor, capacidade física, controle de impulso. Cobre tanto
comportamento (horários, ambiente) quanto resultado (acordar
restaurado).

low: Você dorme menos de 6h na maioria das noites, ou em horários
muito irregulares. Acordar é luta. Cafeína sustenta o dia. Tarde é
queda; à noite, segundo fôlego falso. Apneia, ronco ou ansiedade
noturna fazem parte da paisagem.

mid: Você dorme 6-7h por noite, com algumas noites melhores.
Funciona, mas não floresce. Algumas manhãs descansado, outras não —
geralmente puxando do que você fez na véspera. Você nota quando a
noite foi ruim, mas nem sempre o que causou.

high: Você dorme 7-9h consistentemente, com horários estáveis
(variação <30 min). Acorda antes do despertador, restaurado. Sono é
negociado como prioridade — telas longe, horários firmes. Sustenta
foco e humor o dia inteiro sem precisar de muleta.
```

#### sleep — en

```
summary: Amount, consistency, and quality of rest.

definition: How you sleep — amount, consistency, and quality of
rest. The biological prerequisite for everything else: focus, mood,
physical capacity, impulse control. Covers both behavior (timing,
environment) and outcome (waking restored).

low: You sleep under 6h most nights, or on very irregular timing.
Waking is a struggle. Caffeine carries the day. Afternoons crash;
nights bring a false second wind. Apnea, snoring, or nighttime
anxiety are part of the landscape.

mid: You sleep 6-7h per night, with some better nights. It works,
but doesn't flourish. Some mornings rested, some not — usually
tracking what you did the night before. You notice when sleep was
bad, not always what caused it.

high: You sleep 7-9h consistently, with stable timing (under 30 min
variation). Wake before the alarm, restored. Sleep is negotiated as
a priority — screens away, firm timing. Sustains focus and mood
through the whole day without props.
```

#### nutrition — pt

```
summary: Como você come e a relação com comida.

definition: O que você coloca no corpo, em que frequência, e a paz
que você tem em torno disso. Cobre densidade nutricional (proteína,
vegetais, hidratação), regularidade das refeições e a relação
psicológica — sem culpa, sem obsessão, sem compulsão.

low: Refeições são caóticas: pula, repõe com fast food, decide no
impulso. A maioria do que come é ultra-processado, açucarado ou
líquido. A relação com comida tem culpa, ansiedade ou compulsão.
Energia oscila com o estômago — pico-queda-pico.

mid: Você come razoavelmente bem na maioria dos dias, mas tem furos
— fim de semana, viagem, dia estressado. Sabe o que seria melhor,
nem sempre faz. Nem sempre se sente leve depois das refeições.
Hidratação é instável.

high: Refeições reais, regulares, com proteína de qualidade e
vegetais. Hidratação consistente. Ultra-processado é raro, não
vergonhoso. A relação com comida é leve — sem dieta agressiva, sem
culpa, sem compulsão. Come com prazer, fica satisfeito, segue o dia.
```

#### nutrition — en

```
summary: How you eat and your relationship with food.

definition: What you put in your body, how often, and the peace you
carry around it. Covers nutritional density (protein, vegetables,
hydration), meal regularity, and the psychological relationship —
without guilt, obsession, or compulsion.

low: Meals are chaotic: skipped, replaced with fast food, decided on
impulse. Most of what you eat is ultra-processed, sugary, or liquid.
Your relationship with food carries guilt, anxiety, or compulsion.
Energy swings with your stomach — peak-crash-peak.

mid: You eat reasonably well most days, but with gaps — weekends,
travel, stressful days. You know what would be better, don't always
do it. Don't always feel light after meals. Hydration is unstable.

high: Real, regular meals with quality protein and vegetables.
Consistent hydration. Ultra-processed is rare, not shameful. Your
relationship with food is light — no aggressive dieting, no guilt,
no compulsion. You eat with pleasure, get full, move on.
```

#### strength — pt

```
summary: Capacidade física pra carregar a vida.

definition: Quão forte e capaz seu corpo é no dia a dia — pra
esforço, esporte, autonomia. Cobre frequência de treino, qualidade
do esforço (sair da zona de conforto), capacidade funcional (subir
escada, carregar peso) e progresso visível ao longo do tempo.

low: Atividade física é rara ou ausente. Subir alguns lances de
escada cansa. Carregar sacolas pesadas dói no dia seguinte. Esportes,
brincadeiras com criança ou tarefas físicas exigem
desproporcionalmente de você. Não há rotina nem progresso.

mid: Você treina 1-2x por semana, ou faz cardio leve regularmente.
Suporta o dia a dia razoavelmente bem, mas não se sente forte.
Algumas semanas saem inteiras sem treino. Não tem progresso medível
em peso, reps ou volume.

high: Treino de força ou esporte intenso 3+ vezes por semana, com
forma boa e progressão. Corpo se sente capaz: você confia em
movimentos, não evita esforço, recupera rápido. Mais forte hoje do
que era 6 meses atrás — em peso, reps ou volume — e tem evidência
concreta disso.
```

#### strength — en

```
summary: Physical capacity to carry life.

definition: How strong and capable your body is day-to-day — for
effort, sport, autonomy. Covers training frequency, quality of
effort (leaving the comfort zone), functional capacity (climbing
stairs, carrying weight), and visible progress over time.

low: Physical activity is rare or absent. A few flights of stairs
tire you. Carrying heavy bags hurts the next day. Sports, kid-play,
or physical tasks demand disproportionately from you. There's no
routine, no progress.

mid: You train 1-2x per week, or do light cardio regularly. You
handle daily life reasonably well, but don't feel strong. Some weeks
pass entirely without training. No measurable progress in weight,
reps, or volume.

high: Strength training or intense sport 3+ times a week, with good
form and progression. Body feels capable: you trust your movements,
don't avoid effort, recover quickly. Stronger today than 6 months
ago — in weight, reps, or volume — with concrete evidence.
```

#### dexterity — pt

```
summary: Mobilidade, coordenação e equilíbrio.

definition: Como o corpo se move — amplitude, controle, equilíbrio.
Vai de mobilidade básica (alongar, postura) a habilidades motoras
(esporte de raquete, dança, escalada). É o que te mantém ágil e
fluído com o passar dos anos, ou rígido e travado.

low: Movimentos amplos doem ou são impossíveis. Postura é ruim,
costas ou pescoço cobram. Você tropeça em coisas e não recupera bem.
Evita esportes ou movimentos novos por medo de se machucar. Não
pratica nada que exija coordenação.

mid: Você se move sem dor na maioria dos dias, mas tem áreas
teimosas — quadril, ombro, cervical. Faz alongamento esporádico.
Equilíbrio é ok, não treinado. Não sente progresso de amplitude ou
controle ao longo dos meses.

high: Mobilidade trabalhada regularmente — yoga, alongamento,
mobility work. Movimento é fluido e sem dor. Equilíbrio e
coordenação são reais — você reage bem a tropeço, joga esporte,
dança. Sente que tá mais móvel hoje do que era 6 meses atrás.
```

#### dexterity — en

```
summary: Mobility, coordination, and balance.

definition: How your body moves — range, control, balance. From
basic mobility (stretching, posture) to motor skills (racquet sport,
dance, climbing). It's what keeps you agile and fluid as years pass,
or stiff and locked up.

low: Wide movements hurt or aren't possible. Posture is poor, your
back or neck pays for it. You stumble and don't recover well. You
avoid sports or new movements out of injury fear. You practice
nothing that requires coordination.

mid: You move without pain most days, but with stubborn areas —
hip, shoulder, neck. You stretch sporadically. Balance is okay, not
trained. You don't feel range or control progress over the months.

high: Mobility worked regularly — yoga, stretching, mobility work.
Movement is fluid and pain-free. Balance and coordination are real
— you react well to stumbles, play sport, dance. You feel more
mobile today than 6 months ago.
```

#### learn — pt

```
summary: Estudo intencional e profundidade do que você aprende.

definition: Quanto e quão fundo você estuda, lê, investiga. Não é
só consumo — é estudo intencional, aplicado, conectado. Cobre
frequência, qualidade do engajamento (ativo vs passivo) e se o que
você aprende encontra uso na sua vida ou trabalho.

low: Você raramente lê ou estudo intencionalmente. Começa coisas e
não termina. O que consome é principalmente passivo — vídeos
curtos, scroll, notícias. Distração toma o tempo que seria de
aprofundar. Não sabe mais nada novo de relevante hoje vs 6 meses
atrás.

mid: Você lê ou estuda em alguns dias da semana, mas inconsistente.
Termina algumas coisas, abandona outras na metade. O aprendizado é
mais consumo que aplicação — entra na cabeça, raramente sai pra um
uso. Sabe um pouco mais hoje, mas tem dificuldade de citar exemplos
concretos.

high: Estudo intencional na maioria dos dias da semana — leitura,
curso, ou aprofundamento técnico. Aplica, ensina ou conecta o que
aprende. Termina o que começa. Pode apontar coisas concretas que
sabe hoje e não sabia 6 meses atrás. Curiosidade tem foco e
disciplina.
```

#### learn — en

```
summary: Intentional study and depth of what you learn.

definition: How much and how deeply you study, read, investigate.
Not just consumption — intentional study, applied, connected.
Covers frequency, engagement quality (active vs passive), and
whether what you learn finds use in your life or work.

low: You rarely read or study intentionally. You start things and
don't finish. What you consume is mostly passive — short videos,
scrolling, news. Distraction takes time that should be for going
deep. You don't know anything relevant today that you didn't know
6 months ago.

mid: You read or study some days a week, but inconsistently. You
finish some things, abandon others halfway. Learning is more
consumption than application — it enters the head, rarely leaves
for use. You know a little more today, but struggle to cite
concrete examples.

high: Intentional study most days a week — reading, course, or
technical depth. You apply, teach, or connect what you learn. You
finish what you start. You can point to concrete things you know
today that you didn't 6 months ago. Curiosity has focus and
discipline.
```

#### contemplate — pt

```
summary: Pausa, reflexão e capacidade de se ancorar.

definition: O lado interno: meditação, journaling, pausa
consciente, capacidade de ficar com o que aparece. Cobre prática
regular, profundidade da prática e o resultado funcional — clareza
emocional, capacidade de se ancorar no estresse, autoconhecimento.

low: Você raramente para. Cabeça acelerada o dia inteiro. Estresse
te derruba; ansiedade ou ruminação tomam por períodos longos sem
você conseguir sair. Não sabe nomear bem o que sente. Sempre tem
uma 'coisa mais importante' do que parar e olhar pra dentro.

mid: Você medita ou para algumas vezes por semana. Funciona quando
faz. Em momentos de calma você se conhece bem; em momentos de
estresse, perde o eixo com facilidade. Sabe que precisa praticar
mais, não consegue manter consistência.

high: Prática contemplativa quase diária — meditação, journaling,
pausa intencional. Em estresse, consegue se ancorar — observa em
vez de reagir. Tem clareza sobre o que sente e o que importa, mesmo
na vida acelerada. Profundidade da prática cresceu nos últimos 6
meses.
```

#### contemplate — en

```
summary: Pause, reflection, and the capacity to anchor.

definition: The internal side: meditation, journaling, conscious
pause, the ability to stay with what arises. Covers regular
practice, depth of practice, and the functional outcome —
emotional clarity, capacity to anchor in stress, self-knowledge.

low: You rarely stop. Head racing all day. Stress knocks you down;
anxiety or rumination take over for long stretches without you
finding a way out. You can't name well what you feel. There's
always something 'more important' than stopping and looking inward.

mid: You meditate or pause a few times a week. It works when you
do it. In calm moments you know yourself well; in stressful moments
you lose your center easily. You know you should practice more,
can't keep consistency.

high: Near-daily contemplative practice — meditation, journaling,
intentional pause. In stress, you anchor — you observe instead of
react. You have clarity about what you feel and what matters, even
in accelerated life. Practice depth grew over the last 6 months.
```

#### money — pt

```
summary: Saúde financeira e tranquilidade com dinheiro.

definition: Como o dinheiro entra, sai e fica. Cobre comportamento
(poupar, gastar com intenção), conhecimento (saber pra onde vai),
resultado (colchão financeiro, ativos crescendo) e atrito (dívida
cara, postergação por aversão ao tema).

low: Você não sabe pra onde vai seu dinheiro. Não sobra ao fim do
mês, ou sobra por sorte. Tem dívida cara (cartão, cheque especial)
que não sai. Postergações financeiras pesam: imposto, abrir conta
investidor, renegociar. Dinheiro é fonte constante de ansiedade.

mid: Você fecha o mês no positivo na maioria das vezes, mas sem
clareza fina. Tem alguma reserva, não suficiente. Sabe que deveria
investir mais, não age sempre. Compras por impulso acontecem mas
não dominam. Dinheiro pesa às vezes, não constantemente.

high: Você sabe pra onde vai cada faixa do dinheiro. Poupa 10%+
todo mês, sem sufoco. Ativos líquidos cresceram nos últimos 12
meses. Sem dívida cara. Decisões de gasto são intencionais.
Dinheiro deixou de ser ansiedade — vira ferramenta.
```

#### money — en

```
summary: Financial health and peace with money.

definition: How money comes in, goes out, and stays. Covers
behavior (saving, spending intentionally), knowledge (knowing where
it goes), outcome (financial cushion, growing assets), and friction
(expensive debt, postponement out of aversion).

low: You don't know where your money goes. Nothing left at
month-end, or only by luck. You carry expensive debt (credit card,
overdraft) that doesn't go away. Financial postponements weigh:
taxes, opening an investment account, renegotiating. Money is a
constant source of anxiety.

mid: You close the month positive most of the time, but without
fine clarity. You have some savings, not enough. You know you
should invest more, don't always act. Impulse buys happen but don't
dominate. Money weighs sometimes, not constantly.

high: You know where every slice of your money goes. You save 10%+
every month, without strain. Liquid assets grew over the last 12
months. No expensive debt. Spending decisions are intentional.
Money stopped being anxiety — became a tool.
```

#### career — pt

```
summary: Trabalho profundo, entrega e trajetória.

definition: Como você trabalha e pra onde vai. Cobre frequência de
deep work, qualidade do engajamento, sustentabilidade energética
(sobra pra vida fora do trabalho), entrega concreta e sensação de
trajetória — meu trabalho tá indo pra algum lugar?

low: Dia é tomado por reuniões inúteis, mensagens, interrupções.
Quase não consegue blocos de deep work. Trabalha no automático ou
só preenche expediente. Chega em casa zerado. Confronto necessário
com chefe/cliente fica engavetado. Sente que tá rodando no lugar.

mid: Você consegue alguns blocos de foco por semana, e entrega
coisas concretas — mas não em todos os dias. Energia sobra em
alguns dias, em outros não. A trajetória faz algum sentido, mas tem
momentos de 'pra onde tô indo?'. Confronto difícil é adiado às
vezes.

high: Deep work na maioria dos dias da semana, em algo que importa.
Toma decisões difíceis com clareza. Energia sobra pra vida fora do
trabalho. Sua trajetória faz sentido — você consegue articular pra
onde vai e por quê. Entrega concreta e regular.
```

#### career — en

```
summary: Deep work, output, and trajectory.

definition: How you work and where you're going. Covers deep-work
frequency, engagement quality, energy sustainability (enough left
for life outside work), concrete output, and the sense of
trajectory — is my work going somewhere?

low: Day is taken by useless meetings, messages, interruptions. You
almost can't get blocks of deep work. You work on autopilot or just
fill the day. You arrive home empty. Necessary confrontation with
boss/client gets shelved. You feel you're spinning in place.

mid: You get some focus blocks per week, and ship concrete things
— but not on every day. Energy is left over on some days, not
others. The trajectory makes some sense, but with moments of 'where
am I going?'. Hard confrontation gets postponed sometimes.

high: Deep work most days a week, on something that matters. You
make hard decisions with clarity. Energy is left over for life
outside work. Your trajectory makes sense — you can articulate
where you're going and why. Concrete, regular shipping.
```

#### circle — pt

```
summary: Proximidade real com família e amigos.

definition: Quão conectado você tá com as pessoas importantes — não
no plano abstrato, mas no concreto. Cobre frequência de conversas
significativas, iniciativa de buscar (não só esperar), presença real
(sem celular, sem ensaiar resposta) e a sensação de que alguém te
conhece de verdade.

low: Você se sente sozinho mesmo cercado de gente. Conversas são
logística. Não toma iniciativa — espera convite. Quando tá com
alguém querido, tá meio fora — celular, distração, mente em outro
lugar. Conflitos não resolvidos pesam por dias.

mid: Você tem 1-2 pessoas próximas que conhece bem. Conversas
significativas acontecem, mas raramente. Toma iniciativa às vezes.
Presença é parcial — tá ali, não 100%. Algumas semanas vão sem
contato real com alguém querido.

high: Conversas significativas semanais com família ou amigos. Você
toma iniciativa de marcar e buscar. Presença real quando tá com
alguém — sem celular, ouvindo de verdade. Você compartilha o que
vive, não filtra. Tem gente que ligaria se você sumisse — e
vice-versa.
```

#### circle — en

```
summary: Real closeness with family and friends.

definition: How connected you are to the important people — not
abstractly, but concretely. Covers frequency of meaningful
conversations, initiative to seek (not just wait), real presence
(no phone, no rehearsing answers), and the feeling that someone
truly knows you.

low: You feel alone even surrounded by people. Conversations are
logistics. You don't take initiative — you wait for invitations.
When you're with someone you love, you're half-out — phone,
distraction, mind elsewhere. Unresolved conflicts weigh for days.

mid: You have 1-2 close people you know well. Meaningful
conversations happen, but rarely. You take initiative sometimes.
Presence is partial — you're there, not 100%. Some weeks pass
without real contact with someone you love.

high: Weekly meaningful conversations with family or friends. You
take initiative to schedule and seek. Real presence when you're
with someone — no phone, actually listening. You share what you
live, don't filter. There are people who'd call if you disappeared
— and vice versa.
```

#### romance — pt

```
summary: Conexão romântica — parceria, intimidade, presença.

definition: O lado romântico da vida — em parceria ou sozinho com
intenção. Cobre frequência de momentos reais (parceria, encontros,
intimidade), qualidade da presença, expressão honesta de desejo e
necessidade, e satisfação geral com como esse domínio está hoje.

low: Vida romântica seca — sem parceria ativa, sem encontros, sem
iniciativa de buscar. Em relação, conexão real é rara: distância,
briga não resolvida, silêncio pra evitar conflito. Não expressa o
que quer. Sente que algo importante tá ausente, não age.

mid: Você tem alguma vida romântica funcionando, mas tem áreas
estagnadas. Em parceria: confortável, não vibrante. Solo: às vezes
busca, às vezes desiste. Presença é parcial. Conflitos atrasam por
dias. Satisfeito-mas-sem-energia descreve bem.

high: Vida romântica em um lugar bom — em parceria ou solteiro com
intenção. Conexão real, regular, expressiva. Você expressa o que
quer, ouve, presente. Carinho, desejo e segurança coexistem.
Conflito é resolvido em horas, não dias.
```

#### romance — en

```
summary: Romantic connection — partnership, intimacy, presence.

definition: The romantic side of life — in partnership or solo
with intent. Covers frequency of real moments (partnership, dates,
intimacy), quality of presence, honest expression of desire and
need, and overall satisfaction with where this domain stands today.

low: Romantic life is dry — no active partnership, no dates, no
initiative to seek. In a relationship, real connection is rare:
distance, unresolved fights, silence to avoid conflict. You don't
express what you want. You feel something important is missing, you
don't act.

mid: You have some romantic life working, but with stagnant areas.
In partnership: comfortable, not vibrant. Solo: sometimes seek,
sometimes give up. Presence is partial. Conflicts drag for days.
Satisfied-but-low-energy describes it well.

high: Romantic life is in a good place — in partnership or single
with intent. Real, regular, expressive connection. You express what
you want, listen, present. Care, desire, and safety coexist.
Conflict resolves in hours, not days.
```

#### play — pt

```
summary: Lazer real — recarrega, não consome.

definition: Brincar, jogar, hobby — sem objetivo de produção.
Cobre frequência de momentos de lazer real, presença durante (não
checando rede social), permissão pra ser ruim em algo, e o efeito:
termina mais leve ou mais cansado? Diferencia lazer ativo de consumo
passivo.

low: Não sabe quando foi a última vez que brincou de verdade. Lazer
virou rolar feed, séries de fundo, TV pra desligar. Termina mais
cansado, não mais leve. Sente culpa por descansar quando 'tem coisa
pra fazer'. Não experimenta nada novo.

mid: Você tem 1-2 hobbies, mas pratica esporadicamente. Lazer
mistura ativo com passivo — algumas horas presentes, algumas
escapando. Termina às vezes recarregado, às vezes só cansado. Culpa
de descansar aparece de vez em quando.

high: Você tem hobby ativo na maioria das semanas. Presente quando
faz — sem celular, sem fundo de trabalho. Permite-se ser ruim em
algo só pelo gosto. Termina mais leve, recarregado. Alegria, leveza
e curiosidade aparecem regularmente na rotina.
```

#### play — en

```
summary: Real leisure — recharges, doesn't drain.

definition: Play, games, hobby — without production goals. Covers
frequency of real leisure moments, presence during them (not
checking social media), permission to be bad at something, and the
effect: do you finish lighter or more tired? Distinguishes active
leisure from passive consumption.

low: You don't know when you last truly played. Leisure became
scrolling feeds, background series, TV to switch off. You finish
more tired, not lighter. You feel guilty resting when 'there's
stuff to do'. You don't try anything new.

mid: You have 1-2 hobbies, but practice sporadically. Leisure mixes
active with passive — some hours present, some escaping. You
finish sometimes recharged, sometimes just tired. Guilt over
resting shows up now and then.

high: You have an active hobby most weeks. Present when you do it
— no phone, no work in the background. You let yourself be bad at
something just for the love of it. You finish lighter, recharged.
Joy, lightness, and curiosity show up regularly in your routine.
```

#### build — pt

```
summary: Projeto pessoal — terminar e mostrar.

definition: Sua vida de criador. Cobre tempo dedicado a projetos
pessoais (criativo, técnico, manual), profundidade do trabalho
(flow vs distração), capacidade de iterar com feedback e — o teste
honesto — terminar e compartilhar, ou só acumular abandonados.

low: Você tem 5 projetos começados, nenhum terminado. Distração ou
indecisão tira do que tava fazendo. Perfeccionismo trava na metade.
Quando trabalha, não entra em flow — checa rede a cada 5 minutos.
Não compartilha o que faz, ou faz raríssimas vezes.

mid: Você dedica algumas horas por semana a projetos pessoais.
Termina alguns, abandona outros. Compartilha de vez em quando —
quando o resultado fica bom o suficiente. Itera às vezes,
defende-se outras. Tem coisas no portfólio, não tantas quanto
gostaria.

high: Você dedica tempo regular a projetos. Flow é frequente,
distração é controlada. Termina o que começa e compartilha. Itera
sem ego — escuta feedback e melhora. Tem coisas concretas que
existem por sua causa — pode apontar e mostrar.
```

#### build — en

```
summary: Personal projects — finishing and showing.

definition: Your maker life. Covers time dedicated to personal
projects (creative, technical, manual), depth of work (flow vs
distraction), capacity to iterate with feedback, and — the honest
test — finishing and sharing, or just stacking abandoned ones.

low: You have 5 started projects, none finished. Distraction or
indecision pulls you off what you were doing. Perfectionism halts
you halfway. When you work, you don't enter flow — you check feeds
every 5 minutes. You don't share what you do, or do it very rarely.

mid: You dedicate some hours a week to personal projects. You
finish some, abandon others. You share occasionally — when the
result is good enough. You iterate sometimes, defend yourself other
times. You have things in the portfolio, not as many as you'd like.

high: You dedicate regular time to projects. Flow is frequent,
distraction is controlled. You finish what you start and share. You
iterate without ego — listening to feedback and improving. You have
concrete things that exist because of you — you can point to them
and show.
```

---

## 8. Ordem de implementação

Sugestão pra fazer numa rodada coesa, sem quebrar UI no meio:

1. **i18n primeiro** — adicionar os 5 campos novos por sub em PT e EN. Manter `description` como alias do `definition` por essa rodada (back-compat).
2. **Migration** `20260507000006_decimal_self_score.sql` — estende `set_sub_score` + adiciona `set_sub_scores_bulk`.
3. **HexChart** + **DimensionCrest** trocando 5-segments por barra — visual change isolado, fácil de validar.
4. **SubPanel** com collapse "Ver detalhes" — substitui `description` por `summary` + expand.
5. **Self-assessment** refator — slider + Save sticky. Aqui é onde mais coisa muda.
6. **`/sub/[id]`** nova tela + roteamento.
7. **Wiring de entrada** pro `/sub/[id]` — TaskCard, HexChart legend, SubPanel header, slider card.
8. **Remover alias `description`** depois que tudo migrou.

---

## 9. Test plan

- [ ] `npx tsc --noEmit` clean
- [ ] `npx expo lint` clean
- [ ] On device: self-assessment slider snap-em-0.5, Save acende com pendente, salva tudo numa RPC, haptic + toast
- [ ] On device: HexChart cards mostram barra contínua (não 5 segmentos)
- [ ] On device: `/dimension/body` SubPanel mostra summary + collapse, expand revela definition + 3 anchors
- [ ] On device: `/sub/sleep` abre tela permanente com tudo expandido
- [ ] On device: tap em SubBadge numa task abre `/sub/<id>`
- [ ] Score decimal salvo em `character_sub_score.score_decimal` + integer floor em `score`

---

## 10. Decisões abertas (já fechadas neste doc)

- ✅ Slider snap **0.5** (não 0.1, não 0.25)
- ✅ Save **explícito** (não debounced)
- ✅ 5 strings por sub (summary + definition + low + mid + high), reusadas em 3 surfaces
- ✅ `summary` é uma linha curta; `definition` é o parágrafo completo
- ✅ `low`/`mid`/`high` ficam atrás de collapse no SubPanel + slider card; expandidos por default no `/sub/[id]`
- ✅ Trendline mantém na self-assessment, janela 90 dias (era ~20 entries)
- ✅ Bar contínua substitui 5-segments em HexChart e DimensionCrest
- ✅ `assessment_log.score_decimal` adiado pra outra rodada (avaliar se sparkline fica feia primeiro)
