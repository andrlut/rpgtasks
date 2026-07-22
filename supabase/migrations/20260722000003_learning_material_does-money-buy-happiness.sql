-- Learning material: does-money-buy-happiness (explainer) — money and happiness
-- Autonomous Learning publisher run (commit-direct mode).
-- Planner: wealth/money gap-fill. Researcher: 8 PNAS-cited facts.
-- Reviewer: PASSED with 2 warnings (both applied). Idempotent upsert by slug.

insert into public.learning_material (
  slug,
  type,
  dimension_id,
  topic,
  reading_minutes,
  title_pt,
  title_en,
  summary_pt,
  summary_en,
  body_pt,
  body_en,
  takeaways_pt,
  takeaways_en,
  signs_pt,
  signs_en,
  tracking_pt,
  tracking_en,
  source_url,
  source_label_pt,
  source_label_en,
  reasoning_log
) values (
  'does-money-buy-happiness',
  'explainer',
  'wealth',
  'money and happiness',
  6,
  'Dinheiro compra felicidade? O acordo de 2023',
  'Does Money Buy Happiness? Settled in 2023',
  'Dois estudos se contradiziam sobre o teto da felicidade; em 2023 os rivais se juntaram e descobriram que os dois estavam certos — sobre pessoas diferentes.',
  'Two studies clashed over whether happiness has a price ceiling; in 2023 the rivals teamed up and found both were right — about different people.',
  'Você já ouviu essa no jantar: dinheiro compra felicidade, mas só até uns 75 mil dólares por ano. Depois disso, o efeito acaba. Virou meme, manchete, legenda de vídeo motivacional.

O número é real. Saiu de um estudo sério, de dois pesquisadores premiados, com quase meio milhão de respostas. O problema é que quase todo mundo que repete a frase entendeu ao contrário. Em 2023, os autores originais se sentaram com o rival que os tinha contestado pra resolver a briga.

A reviravolta: os dois lados estavam certos. E o que eles acharam deveria mudar como você pensa sobre o próprio salário.

:::stat
Não existe um número mágico. A felicidade sobe com a renda pra maioria das pessoas — e só empaca pra quem carrega dores que dinheiro não cura.
:::

## 1. O número de 75 mil nunca disse o que você acha

Em 2010, Daniel Kahneman — o psicólogo que ganhou o Nobel de Economia — e Angus Deaton analisaram as respostas de quase 450 mil americanos. Eles separaram duas coisas que a gente costuma misturar.

A primeira é a **felicidade do dia a dia**: como você se sente no momento, se o dia teve mais alegria do que estresse, raiva ou tristeza. Os pesquisadores chamam isso de bem-estar experienciado — é o seu humor enquanto a vida acontece.

A segunda é a **satisfação com a vida como um todo**: quando você para e avalia se sua vida está indo bem, numa escala de 0 a 10. Isso é o bem-estar avaliativo — não é o que você sente agora, é o veredito que você dá quando faz o balanço.

E aqui está o detalhe que sumiu de todas as versões de jantar: só a felicidade do dia a dia parava de crescer nos 75 mil. A satisfação com a vida continuou subindo sem teto — quanto mais renda, mais alta, sem freio à vista. O famoso platô nunca foi sobre a sua vida inteira. Era só sobre o seu humor de terça de manhã.

## 2. A colaboração entre rivais

Onze anos depois, Matthew Killingsworth resolveu testar de novo, com uma ferramenta mais afiada. Em vez de perguntar uma vez, ele criou um app, o Track Your Happiness, que cutucava as pessoas em momentos aleatórios do dia pra perguntar como elas estavam ali, naquele instante. Juntou 1,7 milhão desses flagras de humor, de mais de 33 mil pessoas.

O resultado dele bateu de frente com o de Kahneman: não tinha platô nenhum. A felicidade do dia a dia continuava subindo com a renda muito além dos 75 mil, na mesma inclinação.

Dois estudos sérios, mesma pergunta, respostas opostas. O que a maioria dos cientistas faz nessa hora é escrever um artigo dizendo por que o outro errou. Kahneman e Killingsworth fizeram o contrário: uma **colaboração adversarial** — dois pesquisadores que discordam juntam os dados e desenham, juntos, um teste que qualquer um dos dois aceitaria como veredito. Chamaram uma terceira pesquisadora, Barbara Mellers, pra ser árbitra neutra.

Em 2023 eles publicaram a resposta, e ela é mais interessante do que qualquer um dos lados sozinho. Os dois estavam certos — sobre pessoas diferentes.

Pra grande maioria, algo como 80% das pessoas, a felicidade continua subindo com a renda, sem teto à vista (Killingsworth, Kahneman & Mellers, 2023). Killingsworth estava certo pra elas. Mas existe uma minoria infeliz, os 15 a 20% que já pontuam mais baixo em felicidade desde o começo. Pra esse grupo, a felicidade sobe com a renda até uns 100 mil (o equivalente corrigido dos 75 mil de 2010) e aí realmente empaca. Kahneman estava certo pra eles. O platô existe — só que ele mora numa faixa específica de gente, não numa faixa de salário.

Por que esse grupo trava? Porque o que puxa a felicidade dele pra baixo não é dinheiro. O próprio artigo nomeia os culpados: luto, coração partido, depressão clínica. Ganhar mais não traz de volta quem morreu nem cura uma depressão. Acima de um certo ponto, mais renda deixa de mexer no ponteiro porque o problema nunca foi financeiro.

> "Luto, coração partido e depressão clínica podem ser exemplos dessas misérias" que a renda não resolve. — Killingsworth, Kahneman & Mellers, 2023

E tem um detalhe que surpreende: entre os 30% mais felizes, a renda não só levanta a felicidade como levanta cada vez mais rápido depois dos 100 mil. Pra quem já está bem, dinheiro parece acelerar, não desacelerar — com ganhos ainda detectáveis lá pelos 500 mil por ano.

## 3. O que isso muda pra você

Antes de você pedir aumento em nome da ciência, tem uma letra miúda que muda tudo: nada disso funciona em reais lineares. Funciona em **renda logarítmica** — o que importa não é quantos reais a mais, é quantas vezes a sua renda multiplica.

Traduzindo: dobrar de 3 pra 6 mil por mês te dá mais ou menos o mesmo salto de felicidade que dobrar de 30 pra 60 mil. Só que o segundo salto custa dez vezes mais dinheiro. Cada degrau de felicidade fica exponencialmente mais caro. Não existe teto de felicidade nos dados, mas o seu bolso encontra um teto muito antes disso.

E vale ser honesto sobre o que esses estudos não provam. Todos são americanos, todos são correlações — ninguém sorteou salários pra ver o efeito. E os ganhos lá no topo só foram medidos até uns 500 mil por ano; acima disso, ninguém sabe. Quem ganha mais tende a ser mais feliz, mas parte disso pode correr no sentido contrário: quem já é mais estável e saudável tende a ganhar mais. Some a isso o paradoxo de Easterlin: dentro de um país os mais ricos são mais felizes, mas décadas de crescimento econômico não deixaram países inteiros mais felizes na média. Renda importa, mas ela corre numa esteira ao lado de comparação social e expectativa que sobe junto.

Então o que fazer com tudo isso na prática:

:::list-icon
- Quando a sua renda é baixa, priorize aumentá-la: o salto de felicidade é maior lá embaixo e fica mais caro depois.
- Se um ganho recente não mexeu no seu humor, o problema provavelmente não é dinheiro — olhe pra luto, relações ou saúde mental.
- Gaste onde o dia a dia dói: menos estresse, mais tempo livre, menos deslocamento — não só em status.
- Trate renda como meio, não como placar: cada degrau custa exponencialmente mais, então defina o "pra quê" antes do "quanto".
:::

A frase de jantar estava meio certa e muito incompleta. Dinheiro compra felicidade, sim — pra maioria das pessoas, e sem teto claro à vista. Mas ele compra em degraus cada vez mais caros, não conserta o que não é financeiro, e corre lado a lado com coisas que nenhum salário resolve. O número mágico nunca foi 75 mil. A pergunta certa não é "quanto", é "pra quê".

:::source[Killingsworth, Kahneman & Mellers, 2023 · PNAS 120(10) · n=33.391](https://www.pnas.org/doi/10.1073/pnas.2208661120)',
  'You''ve heard it at a dinner table: money buys happiness, but only up to about $75,000 a year. After that, the effect flatlines. It''s become a meme, a headline, the caption on a motivational reel.

The number is real. It came from a serious study, two award-winning researchers, nearly half a million responses. The trouble is that almost everyone who repeats the line got it backwards. In 2023 the original authors sat down with the rival who had challenged them to settle it.

The twist: both sides were right. And what they found should change how you think about your own paycheck.

:::stat
There is no magic number. Happiness rises with income for most people — and only stalls for those carrying pain money can''t cure.
:::

## 1. The $75k number never meant what you think

In 2010, Daniel Kahneman — the psychologist who won the Nobel in economics — and Angus Deaton went through the answers of nearly 450,000 Americans. They pulled apart two things we tend to blur together.

The first is **day-to-day happiness**: how you feel in the moment, whether the day held more joy than stress, anger, or sadness. Researchers call this experienced well-being — your mood while life is actually happening.

The second is **satisfaction with life as a whole**: when you step back and rate how your life is going, say on a 0-to-10 ladder. That''s evaluative well-being — not what you feel right now, but the verdict you reach when you tally it all up.

Here''s the detail that fell out of every dinner-table version: only day-to-day happiness stopped climbing at $75,000. Life satisfaction kept rising with no ceiling — more income, higher score, no brakes in sight. The famous plateau was never about your whole life. It was about your mood on a Tuesday morning.

## 2. A collaboration between rivals

Eleven years later, Matthew Killingsworth decided to test it again, with a sharper tool. Instead of asking once, he built an app, Track Your Happiness, that pinged people at random moments to ask how they felt right then, in that instant. He gathered 1.7 million of those mood snapshots from more than 33,000 people.

His result crashed straight into Kahneman''s: no plateau at all. Day-to-day happiness kept rising with income well past $75,000, at the same steady slope.

Two serious studies, same question, opposite answers. What most scientists do here is write a paper explaining why the other one is wrong. Kahneman and Killingsworth did the opposite: an **adversarial collaboration** — two researchers who disagree pooling their data and designing, together, a test either side would accept as the verdict. They brought in a third researcher, Barbara Mellers, as a neutral referee.

In 2023 they published the answer, and it''s better than either side alone. Both were right — about different people.

For the vast majority, roughly 80% of people, happiness keeps climbing with income, no ceiling in view (Killingsworth, Kahneman & Mellers, 2023). Killingsworth was right about them. But there''s an unhappy minority, the 15-20% who already score lower on happiness to begin with. For that group, happiness rises with income up to about $100,000 (the inflation-adjusted version of the old $75k) and then genuinely stalls. Kahneman was right about them. The plateau is real — it just lives in a specific kind of person, not a specific salary.

Why does that group stall? Because what''s dragging their happiness down isn''t money. The paper names the culprits outright: grief, heartbreak, clinical depression. A raise doesn''t bring back someone who died or cure a depression. Past a certain point, more income stops moving the needle because the problem was never financial.

> "Heartbreak, bereavement, and clinical depression may be examples of such miseries" that income can''t fix. — Killingsworth, Kahneman & Mellers, 2023

And there''s a detail that catches people off guard: among the happiest 30%, income doesn''t just lift happiness — it lifts it faster and faster past $100,000. For people who are already doing well, money seems to accelerate rather than taper, with gains still showing up around $500,000 a year.

## 3. What it changes for you

Before you demand a raise in the name of science, there''s fine print that changes everything: none of this runs on linear dollars. It runs on **log income** — what matters isn''t how many more dollars, it''s how many times your income multiplies.

In plain terms: doubling from $30k to $60k buys about the same jump in happiness as doubling from $300k to $600k. Except the second jump costs ten times as many dollars. Each step of happiness gets exponentially more expensive. There''s no happiness ceiling in the data, but your wallet hits one long before that.

It''s only fair to say what these studies don''t prove. All three are American, all three are correlations — nobody handed out random salaries to watch the effect. And the gains up top were only measured to about $500k a year; past that, nobody knows. Higher earners tend to be happier, but some of that runs the other way: people who are already stable and healthy tend to earn more. Add the Easterlin paradox: within a country the rich are happier, yet decades of economic growth haven''t made whole nations happier on average. Income matters, but it runs on a treadmill alongside social comparison and expectations that climb right along with it.

So here''s what to do with all of it:

:::list-icon
- When your income is low, prioritize raising it — the happiness jump is biggest at the bottom and gets pricier above.
- If a recent raise didn''t lift your mood, money probably isn''t the problem — look at grief, relationships, or mental health.
- Spend where daily life hurts: less stress, more free time, a shorter commute — not just on status.
- Treat income as a means, not a scoreboard: each step costs exponentially more, so decide the "what for" before the "how much."
:::

The dinner-table line was half right and badly incomplete. Money does buy happiness — for most people, with no clear ceiling. But it buys it in steps that keep getting pricier, it can''t fix what isn''t financial, and it runs alongside things no salary resolves. The magic number was never $75,000. The real question isn''t how much — it''s what for.

:::source[Killingsworth, Kahneman & Mellers, 2023 · PNAS 120(10) · n=33,391](https://www.pnas.org/doi/10.1073/pnas.2208661120)',
  array['O platô dos "75 mil" era só sobre o humor do dia a dia — a satisfação com a vida sempre subiu com a renda, sem teto.', 'A colaboração de 2023 revelou: pra ~80% das pessoas a felicidade não tem teto; só uma minoria infeliz empaca, presa em problemas que dinheiro não resolve.', 'Tudo funciona em renda logarítmica: dobrar a renda dá ganho parecido embaixo e em cima, mas cada degrau custa exponencialmente mais dinheiro.'],
  array['The "$75k" plateau was only ever about day-to-day mood — life satisfaction kept rising with income, no ceiling.', 'The 2023 collaboration showed: for ~80% of people happiness has no ceiling; only an unhappy minority stalls, stuck with problems money can''t fix.', 'It all runs on log income: doubling your income buys a similar jump at the bottom and the top, but each step costs exponentially more dollars.'],
  array['Você repete "dinheiro só compra felicidade até certo ponto" sem saber que isso valia só pro humor diário, não pra vida toda.', 'Um aumento recente não mudou nada no seu humor — sinal de que o que te trava talvez não seja financeiro.', 'Você compara aumentos em reais absolutos ("é só uns 500 a mais") e descarta um salto que, na sua faixa de renda, pesa mais do que parece.'],
  array['You repeat "money only buys happiness up to a point" without knowing that only ever applied to daily mood, not life as a whole.', 'A recent raise changed nothing in how you feel day to day — a sign that what''s holding you back may not be financial.', 'You size up raises in absolute dollars ("it''s only about $500 more") and wave off a bump that, at your income level, matters more than it looks.'],
  'No Perceva, a sub Dinheiro não mede quanto você ganha, e sim o que você treina em volta dela: gasto consciente, revisão de finanças, decisões que reduzem o estresse do dia a dia. Use as tarefas dessa sub pra atacar o bem-estar experienciado — o seu humor de terça de manhã — em vez de perseguir só um número que fica exponencialmente mais caro.',
  'In Perceva, the Money sub doesn''t measure how much you earn — it tracks what you train around it: mindful spending, financial reviews, decisions that cut daily stress. Use that sub''s tasks to target experienced well-being — your Tuesday-morning mood — instead of chasing a number that only gets exponentially more expensive.',
  'https://www.pnas.org/doi/10.1073/pnas.2208661120',
  'Killingsworth, Kahneman & Mellers, 2023 · PNAS 120(10) · n=33.391',
  'Killingsworth, Kahneman & Mellers, 2023 · PNAS 120(10) · n=33,391',
  '{"template_type": "explainer", "template_version": 2, "reviewer_fixes_applied": ["Added a 3rd behavioral sign to signs_pt/signs_en (catalog standard is exactly 3; draft had 2) — new sign ties to the log-income relative-vs-absolute-dollars point.", "Folded an inline attribution (Killingsworth, Kahneman & Mellers, 2023) into Section 2 at the first appearance of the resolution figures, so the 80%/15-20%/$100k/$500k numbers no longer rely solely on the closing source block.", "Note: reviewer''s academic_outline FAIL and bilingual_drift WARN were false positives caused by an abbreviated review input; the actual body is full parallel PT/EN prose using a plain ''>'' blockquote (not a :::quote card), so only 2 directive cards (stat + list-icon)."], "voice_principles_applied": ["Three ideas, not seven (the $75k number decoded / the rivals'' resolution / what it changes for you)", "Prose-led — 2 body cards (stat thesis + list-icon recipe) plus closing source; one light markdown blockquote for the iconic quote", "Native PT and native EN written in parallel, not translated", "Defined jargon on first mention (experienced vs evaluative well-being, adversarial collaboration, log income)", "Concrete anchors over abstract lists ($30k->$60k vs $300k->$600k doubling; grief/heartbreak/depression named)", "Flagged the simplified/contested science (correlational, US-only, Easterlin, post-hoc minority, ~$500k data bound)"], "steps": [{"id": "hook", "answer_en": "The dinner-table line ''money only buys happiness up to $75k'' is real, came from a serious study — and almost everyone got it backwards. In 2023 the original authors sat down with the rival to settle it."}, {"id": "thesis", "answer_en": "There is no magic number: happiness rises with income for most, with no clear ceiling, and only stalls for a minority carrying pain money can''t cure."}, {"id": "real_definition", "answer_en": "The 2010 plateau applied only to experienced well-being (day-to-day mood), never to evaluative (satisfaction with life as a whole), which always kept rising. The popular belief fuses the two."}, {"id": "stakes", "answer_en": "Kahneman & Deaton (2010, PNAS, n~450,000): life satisfaction rises with log(income) with no ceiling; daily mood flattened at ~$75k. That distinction is what nearly every popular retelling drops."}, {"id": "mechanism", "answer_en": "Killingsworth (2021) used experience sampling (app, 1.7M reports, n=33,391) and found no plateau. The 2023 adversarial collaboration (Mellers as referee) showed both patterns coexist: no ceiling for ~80%, a plateau around $100k only for the least-happy 15-20%. Among the happiest 30% gains accelerate up to ~$500k/yr."}, {"id": "myth_busts", "answer_en": "Myth 1: ''happiness caps at $75k'' — only daily mood capped, and only for a minority. Myth 2: ''one study was wrong'' — both were right, about different groups. Myth 3: ''more money always helps'' — for those carrying grief/depression, income doesn''t move the needle; and ''no ceiling'' is bounded by data (~$500k) and is correlational, US-only, not causal."}, {"id": "recipe", "answer_en": "Prioritize raising income when it''s low (bigger jump); if a raise didn''t move your mood, check grief/relationships/mental health; spend where daily life hurts (stress, time, commute); treat income as a means and decide the ''what for'' before the ''how much.''"}], "main_points": [{"id": "1_the_75k_number_decoded", "what_en": "The 2010 ''$75k ceiling'' was only about experienced well-being; evaluative well-being always kept rising.", "why_en": "The popular retelling fuses daily mood with life satisfaction and invents a ceiling that never existed for life as a whole.", "how_to_know_en": "If you think happiness ''stops'' at some salary, you''re confusing one day''s mood with the verdict on your whole life."}, {"id": "2_the_rivals_resolution", "what_en": "The 2023 adversarial collaboration showed Kahneman and Killingsworth were each right about different people.", "why_en": "It explains a decade-long standoff: no ceiling for the majority, a plateau only for an unhappy minority stuck in grief, heartbreak, or depression.", "how_to_know_en": "If your happiness doesn''t rise with a raise, the brake is probably not financial."}, {"id": "3_what_it_changes_for_you", "what_en": "It all runs on log income: each step of happiness costs exponentially more.", "why_en": "No ceiling in the data doesn''t mean unlimited — it''s correlational, US-only, bounded near $500k, and competes with social comparison (Easterlin).", "how_to_know_en": "Doubling income helps similarly at the bottom and top, but the dollar cost of the second jump is 10x larger."}]}'::jsonb
)
on conflict (slug) do update set
  type = excluded.type,
  dimension_id = excluded.dimension_id,
  topic = excluded.topic,
  reading_minutes = excluded.reading_minutes,
  title_pt = excluded.title_pt,
  title_en = excluded.title_en,
  summary_pt = excluded.summary_pt,
  summary_en = excluded.summary_en,
  body_pt = excluded.body_pt,
  body_en = excluded.body_en,
  takeaways_pt = excluded.takeaways_pt,
  takeaways_en = excluded.takeaways_en,
  signs_pt = excluded.signs_pt,
  signs_en = excluded.signs_en,
  tracking_pt = excluded.tracking_pt,
  tracking_en = excluded.tracking_en,
  source_url = excluded.source_url,
  source_label_pt = excluded.source_label_pt,
  source_label_en = excluded.source_label_en,
  reasoning_log = excluded.reasoning_log;

-- Sub associations (idempotent)
delete from public.learning_material_sub
where material_id = (select id from public.learning_material where slug = 'does-money-buy-happiness');

insert into public.learning_material_sub (material_id, sub_id) values
  ((select id from public.learning_material where slug = 'does-money-buy-happiness'), 'money');
