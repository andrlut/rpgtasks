-- migration: 20260722000006_learning_material_summary_antifragile.sql
-- purpose: first media-rich learning material — Antifragile (Taleb) summary with
--          NotebookLM-produced podcast audio (en) + infographics (pt/en) + cover art
--
-- affected tables: learning_material (insert), learning_material_sub (insert),
--                  learning_material_media (insert)
-- new rpcs:        none
-- breaking?       no — content only
--
-- notes:
--   migrations are write-once; never edit after applying
--   media assets were uploaded to the 'learning-media' bucket BEFORE this migration
--   (antifragil/audio.en.m4a, antifragil/infographic.{pt,en}.webp, antifragil/cover.webp)
--   and verified via `supabase storage ls`. paths below are bucket-relative.
--   text bodies are original PT/EN parallel prose adapted from the NotebookLM
--   briefing doc; audio exists only in EN (the app shows a language badge).

begin;

with m as (
  insert into public.learning_material
    (slug, type, dimension_id, topic, reading_minutes,
     title_pt, title_en, summary_pt, summary_en,
     body_pt, body_en,
     takeaways_pt, takeaways_en, signs_pt, signs_en,
     tracking_pt, tracking_en,
     hero_image_url, source_url, source_label_pt, source_label_en)
  values (
    'summary-antifragile', 'summary', 'mind', 'antifragile-book', 6,
    'Antifrágil — o que melhora com o caos',
    'Antifragile — what gains from disorder',
    'Por que sistemas superprotegidos quebram no primeiro choque — e como estruturar exposição pra crescer com a desordem.',
    'Why overprotected systems break at the first shock — and how to structure exposure so you grow from disorder.',
    $body_pt$O vento apaga uma vela e alimenta uma fogueira. Nassim Taleb abre *Antifrágil* (Random House, 2012) com essa imagem porque ela separa duas relações opostas com o caos: o que é frágil teme a rajada; o que é antifrágil quer que ela venha. A pergunta do livro é direta — o que faz um corpo, uma carreira ou um sistema inteiro pertencer a um lado ou ao outro?

A resposta começa desmontando uma confusão comum: resistir não é o contrário de quebrar. Existe um terceiro estado, quase sem nome na nossa linguagem, e é ele que interessa.

## 1. A tríade: quebrar, resistir ou melhorar

Taleb organiza o mundo em três arquétipos. O frágil é Dâmocles, jantando sob uma espada pendurada por um fio de crina: depende de estabilidade total, e um único evento ruim destrói tudo. O resiliente é a Fênix, que renasce das cinzas — apanha e volta ao estado original, mas não aprende nada no processo. O antifrágil é a Hidra: corte uma cabeça e nascem duas. O dano é justamente o que a fortalece.

:::quote{author="Nassim Taleb", source="Antifrágil (2012)"}
Você quer ser o fogo e desejar o vento.
:::

A distinção importa porque quase tudo que é vivo funciona como uma Hidra em pequena escala. Músculos crescem porque o treino os danifica primeiro. Ossos mantêm densidade porque impacto e gravidade os desafiam. O sistema imune aprende com germes — sem exposição, desaprende. Sistemas complexos privados de estressores não ficam preservados: atrofiam, como um corpo depois de um mês de cama.

## 2. A tragédia da modernidade: proteger até quebrar

Se estresse em dose certa fortalece, o projeto moderno de eliminar todo desconforto tem um custo escondido. Taleb dá nome a quem nos cobra esse custo: o *fragilista* — quem intervém em sistemas complexos atrás de um benefício pequeno e visível, ignorando efeitos colaterais graves e invisíveis. O médico que prescreve remédio pra qualquer incômodo menor. O pai-helicóptero que corta da infância o processo de tentativa e erro. O gestor que trata a economia como máquina de lavar com defeito.

O dano causado por quem quer ajudar tem nome técnico: iatrogenia. E a defesa contra ela inverte o ônus da prova: a intervenção artificial é que precisa provar que é segura; o corpo não precisa provar que se cura sozinho. Por décadas, a ausência de evidência de dano sustentou cigarro, gordura trans e talidomida — até a evidência aparecer.

Daí vem a heurística mais prática do livro, a *via negativa*: o conhecimento cresce mais por subtração do que por adição. Tirar cigarro, açúcar e ultraprocessado é mais robusto do que caçar o próximo suplemento milagroso. Na dúvida entre adicionar e remover, remova.

## 3. Barbell e pele em jogo: como se expor sem se destruir

Antifragilidade não é buscar risco a esmo — é estruturar a exposição. A estratégia barbell joga nos dois extremos e evita o meio, onde moram os riscos escondidos:

:::list-icon
shield-checkmark | **Nas finanças** — ~90% em segurança extrema, ~10% em apostas de alto risco: perda máxima limitada, ganho ilimitado.
briefcase | **Na carreira** — um trabalho estável pagando as contas + um projeto ousado nas horas livres.
people | **Nos vínculos** — compromisso total com poucas relações próximas, exploração ocasional no resto.
:::

O filtro ético que fecha o livro: pele em jogo. Um sistema é frágil quando quem decide não sofre as consequências do próprio erro — e uma opinião só vale alguma coisa se quem a emite tem algo a perder. Antes de seguir um conselho, a pergunta não é se a pessoa parece confiante, e sim o que acontece com ela se estiver errada.

O corpo humano não é uma máquina que gasta com o uso. É o contrário: quebra sem uso. Proteger-se de todo desconforto hoje é garantir o colapso no primeiro choque inevitável de amanhã. A meta do livro cabe na imagem da capa: deixar de ser a vela — e virar a fogueira.

:::source[Antifragile — Nassim Taleb (Random House, 2012)](https://www.penguinrandomhouse.com/books/176227/antifragile-by-nassim-nicholas-taleb/)$body_pt$,
    $body_en$The wind puts out a candle and feeds a bonfire. Nassim Taleb opens *Antifragile* (Random House, 2012) with that image because it splits the world into two opposite relationships with chaos: the fragile fears the gust; the antifragile wants it to come. The book's question is blunt — what makes a body, a career, or an entire system land on one side or the other?

The answer starts by dismantling a common confusion: resisting is not the opposite of breaking. There is a third state, nearly missing from our vocabulary, and it is the one that matters.

## 1. The triad: break, resist, or improve

Taleb sorts the world into three archetypes. The fragile is Damocles, dining under a sword hanging by a single horsehair: it depends on total stability, and one bad event destroys everything. The resilient is the Phoenix, reborn from the ashes — it takes the hit and returns to its original state, but learns nothing along the way. The antifragile is the Hydra: cut off one head and two grow back. Harm is precisely what makes it stronger.

:::quote{author="Nassim Taleb", source="Antifragile (2012)"}
You want to be the fire and wish for the wind.
:::

The distinction matters because almost everything alive works like a small-scale Hydra. Muscles grow because training damages them first. Bones keep their density because impact and gravity keep challenging them. The immune system learns from germs — without exposure, it unlearns. Complex systems deprived of stressors don't stay preserved: they atrophy, like a body after a month in bed.

## 2. Modernity's tragedy: protecting things until they break

If the right dose of stress strengthens, the modern project of removing every discomfort has a hidden cost. Taleb names the character who makes us pay it: the *fragilista* — someone who intervenes in complex systems chasing a small, visible benefit while ignoring severe, invisible side effects. The doctor who medicates every minor complaint. The helicopter parent who edits trial and error out of childhood. The official who treats the economy like a broken washing machine.

Harm done by the helper has a technical name: iatrogenics. The defense against it flips the burden of proof: the artificial intervention must prove it is safe; the body does not have to prove it can heal itself. For decades, absence of evidence of harm propped up smoking, trans fats, and thalidomide — until the evidence arrived.

From there comes the book's most practical heuristic, the *via negativa*: knowledge grows more by subtraction than by addition. Cutting cigarettes, sugar, and ultra-processed food is more robust than hunting for the next miracle supplement. When torn between adding and removing, remove.

## 3. Barbell and skin in the game: exposure without ruin

Antifragility is not chasing risk at random — it is structuring your exposure. The barbell strategy plays both extremes and avoids the middle, where the hidden risks live:

:::list-icon
shield-checkmark | **In money** — ~90% in extreme safety, ~10% in high-risk bets: downside capped, upside unlimited.
briefcase | **In your career** — a stable day job that pays the bills + a bold side project on your own time.
people | **In your bonds** — full commitment to a few close relationships, occasional exploration beyond them.
:::

The ethical filter that closes the book: skin in the game. A system is fragile when the people deciding do not suffer the consequences of their own mistakes — and an opinion is only worth something if the person voicing it has something to lose. Before following advice, the question is not whether they sound confident, but what happens to them if they are wrong.

The human body is not a machine that wears out with use. It is the reverse: it breaks without use. Shielding yourself from every discomfort today is how you guarantee collapse at tomorrow's first unavoidable shock. The book's goal fits the cover image: stop being the candle — become the bonfire.

:::source[Antifragile — Nassim Taleb (Random House, 2012)](https://www.penguinrandomhouse.com/books/176227/antifragile-by-nassim-nicholas-taleb/)$body_en$,
    array[
      'Existe um terceiro estado além de frágil e resistente: o antifrágil melhora com choques — e quase tudo que é vivo funciona assim na dose certa.',
      'Via negativa: remover o que prejudica (cigarro, açúcar, superproteção) rende mais que adicionar a próxima solução milagrosa.',
      'Barbell: extremos seguros + apostas pequenas de alto risco, nunca o meio — e só confie em quem tem algo a perder.'
    ],
    array[
      $t$There is a third state beyond fragile and tough: the antifragile improves with shocks — and almost everything alive works that way in the right dose.$t$,
      $t$Via negativa: removing what harms (cigarettes, sugar, overprotection) beats adding the next miracle fix.$t$,
      $t$Barbell: safe extremes plus small high-risk bets, never the middle — and only trust people with something to lose.$t$
    ],
    array[
      'Você evita qualquer desconforto físico ou social — e sente que anda mais frágil por causa disso.',
      'Sua rotina depende de tudo dar certo: um imprevisto pequeno derruba a semana inteira.',
      'Você resolve problemas adicionando coisas (apps, suplementos, regras) e quase nunca removendo.'
    ],
    array[
      $t$You avoid every physical or social discomfort — and feel more fragile because of it.$t$,
      $t$Your routine depends on everything going right: one small surprise wrecks the whole week.$t$,
      $t$You solve problems by adding things (apps, supplements, rules) and almost never by removing.$t$
    ],
    'Esse resumo fica em Aprender, ligado aos subs Contemplar e Dinheiro. Um jeito direto de aplicar: crie uma tarefa semanal de desconforto voluntário — treino pesado, banho frio, uma conversa difícil — e acompanhe pelo Momentum a exposição virando hábito. No lado do dinheiro, uma tarefa mensal de revisar sua divisão segurança/risco fecha o barbell.',
    $t$This summary lives in Learn, linked to the Contemplate and Money subs. A direct way to apply it: create a weekly voluntary-discomfort task — a hard workout, a cold shower, a difficult conversation — and let Momentum show exposure becoming habit. On the money side, a monthly task reviewing your safety/risk split closes the barbell.$t$,
    'https://uneqnpyzevosznwkmvvo.supabase.co/storage/v1/object/public/learning-media/antifragil/cover.webp',
    'https://www.penguinrandomhouse.com/books/176227/antifragile-by-nassim-nicholas-taleb/',
    'Antifrágil — Nassim Taleb (Random House, 2012)',
    'Antifragile — Nassim Taleb (Random House, 2012)'
  )
  returning id
),
subs as (
  insert into public.learning_material_sub (material_id, sub_id)
  select m.id, s.sub_id from m, (values ('contemplate'), ('money')) as s(sub_id)
  returning material_id
)
insert into public.learning_material_media
  (material_id, kind, locale, path, duration_seconds, source, meta)
select m.id, x.kind, x.locale, x.path, x.duration_seconds, 'notebooklm', x.meta::jsonb
from m, (values
  ('audio', 'en', 'antifragil/audio.en.m4a', 1716,
   '{"title": "Why safety makes you fragile"}'),
  ('infographic', 'pt', 'antifragil/infographic.pt.webp', null,
   '{"width": 1080, "height": 1935, "alt": "Guia visual de antifragilidade: a tríade, hormese, estratégia barbell, via negativa e pele em jogo"}'),
  ('infographic', 'en', 'antifragil/infographic.en.webp', null,
   '{"width": 1080, "height": 1935, "alt": "Antifragile visual guide: the triad, hormesis, barbell strategy, via negativa and skin in the game"}')
) as x(kind, locale, path, duration_seconds, meta);

commit;
