# Perceva — Store Visual Assets Spec & Capture Plan (2026)

## 1. Asset requirements table

| Asset | Loja | Dimensão (px) | Formato | Qtd (min–max) | Status atual |
|---|---|---|---|---|---|
| App icon (marketing) | App Store | **1024×1024**, sem alpha, sem cantos arredondados | PNG/JPEG, sRGB, flatten | 1 (obrigatório) | ✅ Reaproveitar `assets/images/icon.png` (já é 1024×1024). Verificar que **não tem canal alpha** — Apple rejeita transparência no ícone de marketing. |
| App icon (loja) | Google Play | **512×512** | PNG 32-bit **com** alpha, ≤1 MB | 1 (obrigatório) | ⚠️ Gerar: reduzir `icon.png` 1024→512. A partir de **31/03/2026** o Play aplica cantos 30% automáticos + safe-zone 15–18% de padding interno; conferir que o glifo não encosta na borda. |
| Screenshots iPhone 6.9" | App Store | **1260×2736** (portrait) — também aceitos 1290×2796 e 1320×2868 | PNG/JPEG, sem alpha | **1–10** | ❌ Capturar. É o **único tamanho de iPhone obrigatório**; Apple escala pros demais. |
| Screenshots iPad 13" | App Store | **2064×2752** (portrait) | PNG/JPEG, sem alpha | 1–10 | ❌ **Obrigatório** porque `app.json` tem `ios.supportsTablet: true`. Se não quiser manter iPad, setar `supportsTablet:false` elimina este slot inteiro (decisão de produto — ver nota §5). |
| Screenshots phone | Google Play | 16:9 / 9:16; lado 320–3840 px (máx ≤ 2× o menor). Prático: **1080×1920** ou **1080×2400** | PNG/JPEG, sem alpha | **2–8** (mín. 2 pra publicar) | ❌ Capturar. Reaproveitáveis dos frames do iPhone reexportados. |
| Screenshots tablet (7" e 10") | Google Play | 16:9 / 9:16, lado 1080–7680 px | PNG/JPEG, sem alpha | **4–8** cada (só se declarar suporte a tablet) | ⚠️ Opcional. Só necessário se você marcar suporte a tablet no Play Console; caso contrário, pular. |
| Feature graphic | Google Play | **1024×500** | PNG/JPEG **24-bit, SEM alpha** | 1 (**obrigatório** — bloqueia publicação sem ele) | ❌ Gerar do zero. Logo Perceva + tagline curta sobre `#0E1230`. É a "Frame 0" — branding, não explicação de feature. |
| App preview (vídeo) | App Store | 6.9": **886×1920** (portrait) | .mov/.mp4/.m4v | 0–3 (opcional) | ➖ Pular no v1. Screenshots bastam; vídeo é esforço alto. |
| Promo/TV/Wear graphics | Google Play | — | — | 0 | ➖ N/A (sem Android TV/Wear/XR). |

**Notas de formato que travam submissão:**
- App Store icon marketing **não pode ter alpha**; Play icon **precisa** ter alpha. São dois arquivos distintos — não reutilize o mesmo.
- Play feature graphic **sem transparência** (24-bit).
- Apple rejeita screenshot **1px fora** da spec — exporte exatamente 1260×2736 (ou um dos 3 aceitos), consistente em todas.

## 2. Correção sobre o splash

O prompt diz que o splash é "200×200". **Não é.** O arquivo `assets/images/splash-icon.png` é **1024×1024**; o `200` no `app.json` é `imageWidth` — o tamanho de **renderização em pt** do glifo centralizado sobre `#0E1230` (`resizeMode: contain`). Ou seja, o splash já é um glifo minimalista centrado, tecnicamente correto e sem risco de rejeição. **Risco: baixo.** Sugestão opcional (não bloqueia lançamento): subir `imageWidth` pra ~288–320 e/ou usar um lockup logo+wordmark "Perceva" pra dar mais presença de marca no cold boot — puramente cosmético.

## 3. 6–8 telas recomendadas do Perceva (ordem narrativa)

Ordem pensada como funil: hook → o que faço → como me conheço → progressão → recompensa → conteúdo.

1. **Home / Tasks (dia a dia)** — hero shot. Lista de tarefas com streak/momentum visível. É o "o que eu faço todo dia". *Frame 1 = maior conversão.*
2. **Hero / 3 pilares (Identidade Percebida/Praticada/Desejada)** — a tese do app numa tela. Diferencia de um to-do genérico.
3. **Um instrumento psicométrico** — Big Five 120 ou o resultado/perfil (`profile-mirror.tsx`). Mostra o ângulo de autoconhecimento. Legenda enquadrando como **bem-estar/autoconhecimento**, nunca saúde mental.
4. **Skills com tier ladder** — medalhão orbital + tiers (bronze→master). "Identidade Desejada", progressão tangível.
5. **Rewards / banco de recompensas** — o loop de motivação (gastar coins). Reforça o lado "jogo".
6. **Learn (materiais)** — mostra que o app tem conteúdo/profundidade, não só tracking.
7. *(opcional)* **Quests** — objetivos com deadline; reforça engajamento.
8. *(opcional)* **Tour pós-login** — screenshot do onboarding/tour mostrando acolhimento inicial.

Priorize as **6 primeiras**; 7–8 são bônus. Cada frame deve ter uma **caption curta em pt-BR** (e variante en-US pra localização en) sobreposta acima do device — a legenda vende, o screenshot prova.

## 4. Como capturar na prática

**Fonte dos pixels — use build real, não simulador:**
- **iPhone 6.9":** idealmente captura num device físico Pro Max / iPhone 17-16-15 Pro Max (1290×2796 nativo, aceito) ou num **simulador iOS** do device 6.9" (produz exatamente as dimensões válidas). Você não tem Mac local no fluxo Windows → a rota prática é **TestFlight num iPhone Pro Max emprestado** ou um **simulador via EAS/Mac na nuvem**. Screenshots do simulador são aceitos pela Apple (não precisam ser de device físico).
- **Android phone:** capture no **APK preview real** já existente (`eas build --profile preview`) num telefone 1080×2400 ou 1080×1920. Screenshots de device Android real são o caminho mais simples aqui — você já tem o APK live.
- **iPad 13":** simulador iPad Pro 13" (se mantiver `supportsTablet`).

**Passo a passo mínimo:**
1. Popular a conta de teste com dados bonitos (tarefas variadas, streak alto, skills com tiers preenchidos, um instrumento concluído, coins pra rewards). Screenshots vazios matam conversão.
2. Rodar em **dark mode** (`userInterfaceStyle: dark` já é o default do app — consistente com o branding `#0E1230`).
3. Capturar as 6–8 telas em cada device-class.
4. **Moldura (opcional, recomendado):** enquadrar em device frames + caption. Ferramentas: **Fastlane frameit**, **Screenshots.pro / AppMockup / Previewed / Shotbot**, ou **Figma** (frames de device grátis). O caption é onde entra a cópia pt-BR/en-US.
5. Exportar exatamente nas dimensões da tabela (§1). Conferir que os PNGs **não têm alpha** onde a loja exige sem alpha.

**Reaproveitamento entre lojas:** capture uma vez em alta no iPhone/Android e reexporte os frames Play a partir do mesmo layout Figma — o conteúdo das telas é idêntico, só muda o canvas (1260×2736 vs 1080×2400).

## 5. Decisão de escopo a confirmar (não bloqueante)

`app.json` declara `ios.supportsTablet: true`. Isso **obriga** screenshots de iPad 13" (2064×2752) e faz a Apple revisar em iPad. Se o Perceva v1 não foi desenhado/testado pra iPad, o caminho de menor esforço é **`supportsTablet: false`** → remove o slot de iPad inteiro e reduz superfície de review. Como não posso pushar mudança aqui, deixo isto como diff sugerido pra aplicar na branch de publish (uma linha em `app.json`). Se quiser manter iPad, o slot de screenshots iPad passa a ser obrigatório.

## Arquivos locais relevantes
- `C:\Users\André Luthold\Projetos\RPG\app\app.json` — `icon`, `adaptiveIcon`, `splash-icon` (imageWidth 200), `ios.supportsTablet: true`
- `C:\Users\André Luthold\Projetos\RPG\app\assets\images\icon.png` — 1024×1024 (base pro App Store 1024 e pro Play 512)
- `C:\Users\André Luthold\Projetos\RPG\app\assets\images\splash-icon.png` — 1024×1024 (renderizado a 200pt; NÃO é 200×200)
- `android-icon-foreground/background/monochrome.png` — 432×432 (adaptive icon; já cobre o launcher Android, é distinto do ícone de listagem 512×512)

## Fontes
- [Apple — Screenshot specifications (App Store Connect Help)](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)
- [Apple — Upload app previews and screenshots](https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots/)
- [Google Play — Add preview assets to showcase your app](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en)
- [Google Play App Icon Guidelines 2026 (30% radius / safe zone)](https://theapplaunchpad.com/blog/google-play-app-icon-guidelines/)
- [App Store Screenshot Sizes 2026 (6.9" accepted sizes + preview video 886×1920)](https://aso.dev/app-store-connect/screenshots/)
- [Google Play Feature Graphic 1024×500 spec (2026)](https://screenkit.tools/specs/google-play-feature-graphic-size)
