# Questionário de Avaliação — v1 (24 perguntas)

Documento de trabalho para revisão. Reflete o catálogo atual em
`app/lib/assessment/questions.ts`. Próxima iteração vai pra 48 perguntas e
revisa a fórmula de cálculo (notas no fim).

---

## Para que serve

É a **âncora objetiva** do pilar Avaliação. Periódico (sugestão: 90 dias).
Roda em paralelo com o self-assessment (gut-check tappable, atualizável a
qualquer momento). A diferença entre os dois é o sinal valioso — alinhamento
= calibrado, divergência = sinal de alerta ou de subestimação.

Cada pergunta vira uma nota 1-5. Os 12 subs (2 por dim, 6 dims) recebem cada
um uma nota 0-5 derivada das respostas. Cada dim recebe uma nota 0-10
(soma dos 2 subs).

## Princípio das duplas

Cada sub tem **2 perguntas pareadas**:

- **Q1 — Comportamento** — frequência ancorada em janela natural (semana /
  mês) com critério mínimo concreto (ex: "20+ min de movement", "30+ min de
  build"). Mede input.
- **Q2 — Resultado funcional** — outcome com referente observável no dia
  a dia. Mede se o input está rendendo.

A Q2 é o **teto natural contra overdo**: quem treina 7x/sem e se machucou
3x no ano não consegue maxar a Q2 ("corpo se sente forte e capaz") e por
isso não maxa a média do sub. Mesma lógica para workaholism, exercise
dependency, saver-anxiety, side-project graveyard, etc.

---

## As 24 perguntas

> Os números entre parênteses (1)–(5) são o valor interno da opção. Eles
> ficam **invisíveis pro user** na tela do app (reduz viés de marcar 3 que
> é o meio). Estão visíveis aqui só pra facilitar revisão e resposta em
> texto.

### HEALTH

#### Sleep

**1. `sleep_consistent`** — *Comportamento · custom*
> Em uma semana típica, em quantas noites você dorme 7 horas ou mais?

- Nenhuma ou quase nenhuma *(1)*
- 1-2 noites *(2)*
- 3-4 noites *(3)*
- 5-6 noites *(4)*
- Quase toda noite *(5)*

**2. `sleep_rested`** — *Resultado funcional · WHO-5*
> Acordo descansado e sustento minha energia ao longo do dia, sem precisar
> de cafeína pra funcionar.

- Quase nunca *(1)*
- Raramente *(2)*
- Mais ou menos *(3)*
- Maioria dos dias *(4)*
- Quase todo dia *(5)*

#### Nutrition

**3. `nutrition_real_meals`** — *Comportamento · custom*
> Em uma semana típica, em quantos dias você faz refeições reais (sem fast
> food, sem pular refeição)?

- 0-1 dias *(1)*
- 2 dias *(2)*
- 3-4 dias *(3)*
- 5-6 dias *(4)*
- Praticamente todos *(5)*

**4. `nutrition_relationship`** — *Resultado funcional · custom*
> Minha relação com comida é tranquila — sem culpa, sem obsessão, sem
> compulsão.

- Discordo totalmente *(1)*
- Discordo *(2)*
- Mais ou menos *(3)*
- Concordo *(4)*
- Concordo totalmente *(5)*

---

### STRENGTH

#### Movement

**5. `movement_frequency`** — *Comportamento · custom*
> Em uma semana típica, em quantos dias você faz atividade física que tira
> do sedentarismo (treino de força, cardio, esporte) por 20+ minutos?

- Nunca ou quase nunca *(1)*
- 1 dia *(2)*
- 2 dias *(3)*
- 3-4 dias *(4)*
- 5+ dias *(5)*

**6. `movement_capable`** — *Resultado funcional · custom*
> Meu corpo se sente forte e capaz no dia a dia — subo escada, carrego
> peso, jogo um esporte sem travar.

- Nem um pouco *(1)*
- Pouco *(2)*
- Mais ou menos *(3)*
- Bastante *(4)*
- Totalmente *(5)*

#### Dexterity

**7. `dexterity_practice`** — *Comportamento · custom*
> Em uma semana típica, em quantos dias você dedica 10+ minutos a
> mobilidade, alongamento ou postura consciente?

- Nunca *(1)*
- 1 dia *(2)*
- 2 dias *(3)*
- 3-4 dias *(4)*
- 5+ dias *(5)*

**8. `dexterity_painfree`** — *Resultado funcional · custom*
> Me movo sem dor, com boa amplitude e coordenação — não trinco, não
> travo, não compenso.

- Nem um pouco *(1)*
- Pouco *(2)*
- Mais ou menos *(3)*
- Bastante *(4)*
- Totalmente *(5)*

---

### MIND

#### Learn

**9. `learn_frequency`** — *Comportamento · custom*
> Em uma semana típica, em quantos dias você dedica 20+ minutos a leitura
> ou estudo intencional?

- Nunca *(1)*
- 1 dia *(2)*
- 2-3 dias *(3)*
- 4-5 dias *(4)*
- Quase todo dia *(5)*

**10. `learn_applied`** — *Resultado funcional · custom*
> O que aprendo encontra uso — aplico, ensino ou conecto com algo que faço.

- Quase nunca *(1)*
- Raramente *(2)*
- Às vezes *(3)*
- Frequentemente *(4)*
- Quase sempre *(5)*

#### Contemplate

**11. `contemplate_practice`** — *Comportamento · custom*
> Em uma semana típica, em quantos dias você faz pausa consciente,
> meditação ou journaling por 5+ minutos?

- Nunca *(1)*
- 1 dia *(2)*
- 2-3 dias *(3)*
- 4-5 dias *(4)*
- Quase todo dia *(5)*

**12. `contemplate_anchored`** — *Resultado funcional · PERMA*
> Em momentos de estresse, consigo me ancorar — não saio do eixo facilmente.

- Quase nunca *(1)*
- Raramente *(2)*
- Mais ou menos *(3)*
- Maioria das vezes *(4)*
- Quase sempre *(5)*

---

### WEALTH

#### Money

**13. `money_savings_months`** — *Comportamento · custom*
> Nos últimos 12 meses, em quantos meses sobrou dinheiro pra você poupar
> ou investir?

- Nenhum *(1)*
- 1-3 meses *(2)*
- 4-6 meses *(3)*
- 7-9 meses *(4)*
- 10+ meses *(5)*

**14. `money_no_anxiety`** — *Resultado funcional · custom*
> Dinheiro não é fonte constante de ansiedade — tenho colchão e respiro
> com tranquilidade.

- Discordo totalmente *(1)*
- Discordo *(2)*
- Neutro *(3)*
- Concordo *(4)*
- Concordo totalmente *(5)*

#### Career

**15. `career_deep_work`** — *Comportamento · Gallup*
> Em uma semana típica, em quantos dias você consegue blocos de 60+
> minutos de deep work em algo que importa pra sua carreira?

- Nenhum *(1)*
- 1 dia *(2)*
- 2 dias *(3)*
- 3-4 dias *(4)*
- 5+ dias *(5)*

**16. `career_energy_left`** — *Resultado funcional · custom*
> Sobra energia minha pra vida fora do trabalho — não chego em casa zerado.

- Quase nunca *(1)*
- Raramente *(2)*
- Mais ou menos *(3)*
- Maioria dos dias *(4)*
- Quase todo dia *(5)*

---

### BONDS

#### Circle (família e amigos)

**17. `circle_meaningful_convos`** — *Comportamento · custom*
> Em uma semana típica, quantas vezes você tem uma conversa significativa
> (não só logística) com família ou amigos?

- Nenhuma *(1)*
- 1 vez *(2)*
- 2-3 vezes *(3)*
- 4-5 vezes *(4)*
- Praticamente todo dia *(5)*

**18. `circle_close`** — *Resultado funcional · PERMA*
> Me sinto genuinamente próximo das pessoas importantes pra mim — alguém
> me conhece de verdade.

- Discordo totalmente *(1)*
- Discordo *(2)*
- Mais ou menos *(3)*
- Concordo *(4)*
- Concordo totalmente *(5)*

#### Romance

> Nota: o par foi escrito pra acomodar quem está solteiro por escolha
> também. Quem está em paz solteiro pode marcar Q2 alto e Q1 baixo, e o
> sub fica em 2-3 — refletindo "investimento baixo nessa dimensão", o que
> é honesto e não bug.

**19. `romance_frequency`** — *Comportamento · custom*
> Em um mês típico, com que frequência você tem momentos reais de conexão
> romântica (parceria, encontros, intimidade, presença)?

- Nenhuma vez *(1)*
- 1 vez *(2)*
- 2-3 vezes *(3)*
- 4-7 vezes *(4)*
- Mais que isso *(5)*

**20. `romance_satisfied`** — *Resultado funcional · PERMA*
> Minha vida romântica está em um lugar bom — me sinto satisfeito com como
> está hoje.

- Discordo totalmente *(1)*
- Discordo *(2)*
- Neutro *(3)*
- Concordo *(4)*
- Concordo totalmente *(5)*

---

### CRAFT

#### Play (hobby/jogo, sem objetivo)

**21. `play_frequency`** — *Comportamento · custom*
> Em uma semana típica, quantas vezes você tem momentos só pra curtir um
> hobby/jogo/criativo, sem objetivo, sem produzir nada?

- Nenhuma *(1)*
- 1 vez *(2)*
- 2-3 vezes *(3)*
- 4-5 vezes *(4)*
- Quase todo dia *(5)*

**22. `play_recharges`** — *Resultado funcional · PERMA*
> Curtir hobby ou brincar me recarrega de verdade — termino mais leve, não
> mais cansado.

- Discordo totalmente *(1)*
- Discordo *(2)*
- Neutro *(3)*
- Concordo *(4)*
- Concordo totalmente *(5)*

#### Build (projetos pessoais)

**23. `build_frequency`** — *Comportamento · custom*
> Em uma semana típica, em quantos dias você dedica 30+ minutos a um
> projeto pessoal (criativo, técnico, manual)?

- Nenhum *(1)*
- 1 dia *(2)*
- 2 dias *(3)*
- 3-4 dias *(4)*
- 5+ dias *(5)*

**24. `build_ships`** — *Resultado funcional · custom*
> Termino e compartilho coisas que começo — não acumulo só projetos
> abandonados.

- Quase nunca *(1)*
- Raramente *(2)*
- Às vezes *(3)*
- Frequentemente *(4)*
- Quase sempre *(5)*

---

## Template de resposta

Copie o bloco abaixo e preencha com o valor (1–5) que você marcou em cada
pergunta. Mantenha os ids como estão — eles são chave estável e batem com
os do app.

```yaml
# Questionário Avaliação — v1 (24 perguntas)
# Quem respondeu: ____
# Data: ____
# Tempo levado (min): ____

answers:
  # HEALTH
  sleep_consistent:        # 1-5
  sleep_rested:            # 1-5
  nutrition_real_meals:    # 1-5
  nutrition_relationship:  # 1-5

  # STRENGTH
  movement_frequency:      # 1-5
  movement_capable:        # 1-5
  dexterity_practice:      # 1-5
  dexterity_painfree:      # 1-5

  # MIND
  learn_frequency:         # 1-5
  learn_applied:           # 1-5
  contemplate_practice:    # 1-5
  contemplate_anchored:    # 1-5

  # WEALTH
  money_savings_months:    # 1-5
  money_no_anxiety:        # 1-5
  career_deep_work:        # 1-5
  career_energy_left:      # 1-5

  # BONDS
  circle_meaningful_convos: # 1-5
  circle_close:             # 1-5
  romance_frequency:        # 1-5
  romance_satisfied:        # 1-5

  # CRAFT
  play_frequency:          # 1-5
  play_recharges:          # 1-5
  build_frequency:         # 1-5
  build_ships:             # 1-5

# Comentários soltos / o que ficou estranho:
notes: |
  ____
```

Alternativa enxuta em CSV (uma resposta por linha):

```csv
question_id,raw_value
sleep_consistent,
sleep_rested,
nutrition_real_meals,
nutrition_relationship,
movement_frequency,
movement_capable,
dexterity_practice,
dexterity_painfree,
learn_frequency,
learn_applied,
contemplate_practice,
contemplate_anchored,
money_savings_months,
money_no_anxiety,
career_deep_work,
career_energy_left,
circle_meaningful_convos,
circle_close,
romance_frequency,
romance_satisfied,
play_frequency,
play_recharges,
build_frequency,
build_ships,
```

---

## Cálculo atual da nota (v1)

Implementado em `app/lib/assessment/derive.ts` e na RPC `submit_questionnaire`
(`supabase/migrations/20260503000006_questionnaire.sql`).

```
Para cada resposta:
  raw       = valor escolhido (1..5)
  ajustado  = (6 - raw) se a pergunta for reverse, senão raw
  normaliz. = (ajustado - 1) / 4         → [0, 1]

Para cada sub (12 subs):
  média      = média simples dos 2 normalizados do sub
  nota_sub   = floor(média × 5)          → [0, 5]   (ex: 3.5 → 3)

Para cada dim (6 dims):
  nota_dim   = nota_sub_a + nota_sub_b   → [0, 10]
```

Comparação ao final entre `nota_dim` do questionário e do self-assessment
gera 1 dos 5 buckets de feedback (Δ ≤ -3 / -2..-1 / 0 / 1..2 / ≥ 3).

---

## O que muda na v2

Plano atual (sujeito a revisão na próxima rodada):

1. **48 perguntas** — 4 por sub em vez de 2. Reduz variância e dá espaço
   pra cobrir nuances que ficaram de fora (ex: separar qualidade de
   alimentação de regularidade; separar profundidade de relacionamento de
   frequência).
2. **Revisar a fórmula** — média simples talvez não seja o melhor com 4
   perguntas. Candidatos:
   - Continuar média simples (mais previsível, menos elegante)
   - Pesos diferentes pra Q-comportamento vs Q-outcome (outcome pesando mais
     reforça o "cap natural contra overdo")
   - Mediana em vez de média (menos sensível a uma resposta extrema)
   - Multi-sub: uma pergunta pode contribuir pra 2 subs com peso (ex: "como
     está sua energia geral?" peso 0.5 sleep + 0.5 nutrition)
3. **Casamento com as skills** — quando o catálogo de 36 skills (3/sub) com
   dados populacionais sair, alinhar os critérios mínimos da Q1 com o tier
   inicial de cada skill (ex: "20+ min" pode virar "tier bronze" da skill).

Pontos abertos pra discussão antes de fechar v2:
- Mantém 1-pra-1 (1 pergunta = 1 sub) ou abre pra multi-sub com pesos?
- Outcome pesa mais que comportamento, ou pesos iguais?
- Mediana faz sentido com 4 perguntas?
- Algum sub precisa ter mais perguntas (ex: career mais granular: skill,
  remuneração, alinhamento de propósito)?
