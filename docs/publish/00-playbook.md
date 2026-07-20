# Playbook de Publicação — Perceva (App Store + Google Play)

Para quem nunca publicou. Sequencial, com custos, tempos e fontes. Todos os fatos foram verificados na web em junho de 2026.

**Fatos-chave do app que moldam este playbook** (do contexto do projeto):
- Sem login social → **Sign in with Apple NÃO é obrigatório** (Guideline 4.8 só exige se houver outro social login).
- Sem IAP/assinatura real no v1 → **sem StoreKit/Play Billing**.
- Notificações **locais** apenas → sem push token, sem APNs.
- Sem tracking, sem ATT, sem analytics de terceiros → em todo formulário de privacidade a resposta a "used for tracking?" é **NÃO**.
- Backend Supabase, client só com publishable key.
- **Delete Account** é hoje fake (`app/app/(tabs)/profile.tsx` linha ~62, `handleDeleteAccount` mostra "not yet available") → **bloqueador travado**: precisa virar real via Edge Function antes de submeter em qualquer loja.

---

## Bloqueador que gate as duas lojas: Delete Account real

Isso não é opcional e **não depende de loja** — vale para Apple e Google.

- **Apple**: exigência em vigor **desde 30 de junho de 2022** para todo app que permite criar conta. Precisa apagar o registro inteiro + dados pessoais; só desativar/deslogar é insuficiente. ([Apple — Offering account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/))
- **Google**: a User Data policy exige deleção in-app **E** um **link web** onde o usuário possa pedir deleção da conta e dos dados (porque pode já ter desinstalado). Isso é declarado nas "Data deletion questions" do Data Safety form. ([Play — account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en))

**Implicação prática para o seu v1**: além do botão in-app (Edge Function chamando `auth.admin.deleteUser(uid)`, já travado no contexto), o Google exige uma **URL pública de deleção**. Como não há site, a saída barata é uma página estática simples (ex.: GitHub Pages / um HTML no domínio que você tiver) explicando "para deletar sua conta, abra o app → Settings → Delete Account, ou envie email para X e apagamos em até N dias". Isso satisfaz o requisito de link web do Google sem backend novo.

---

## Ordem recomendada (por quê Google primeiro)

O gargalo do Google é o **closed testing de 14 dias corridos com 12 testadores** — isso roda em background e não dá pra acelerar com dinheiro (sem quebrar regra). Então:

1. **Semana 0**: criar as duas contas + implementar Delete Account real. Assim que a conta Google estiver verificada, **subir o primeiro build no closed testing e recrutar os 12 testadores** → o relógio de 14 dias começa a correr.
2. **Enquanto os 14 dias correm**: fazer todo o trabalho iOS em paralelo (App Store Connect, Privacy, TestFlight, submissão à review).
3. Quando o closed testing fecha os 14 dias → aplicar para produção no Google.

---

# A) APPLE

## A1. Apple Developer Program — conta

- **Custo**: **US$ 99/ano**, cobrado anualmente, em moeda local quando disponível. Inalterado em 2026. ([Apple — Membership Details](https://developer.apple.com/programs/whats-included/), [Groovyweb 2026](https://www.groovyweb.co/blog/how-much-does-it-cost-app-store))
- **Como Indivíduo (recomendado para você)**:
  - Precisa de um **Apple ID com 2FA ligado** e ser maior de idade na sua região.
  - **NÃO precisa de D-U-N-S Number** — D-U-N-S só é exigido para enrollment como Organização. ([Apple — Enrollment](https://developer.apple.com/help/account/membership/program-enrollment/), [Apple — D-U-N-S](https://developer.apple.com/help/account/membership/D-U-N-S/))
  - Aparece "Perceva" (o dev) sob **seu nome legal**, não um nome de empresa. Para um beta com o irmão, isso é o certo.
- **Como Organização** (só se você quiser o nome de uma empresa como "seller"): exige **D-U-N-S Number** (grátis via Dun & Bradstreet, até **5 dias úteis** para receber + até **2 dias úteis** para a Apple sincronizar) + binding authority check. Não recomendado agora. ([Apple — D-U-N-S](https://developer.apple.com/help/account/membership/D-U-N-S/))
- **Tempo típico (individual)**: enrollment costuma sair em **24–48h**, às vezes na hora; a Apple pode pedir verificação de identidade (documento) via o Apple Developer app. ([Apple — Enroll](https://developer.apple.com/programs/enroll/), [WebToNative 2026](https://www.webtonative.com/blog/apple-developer-program-enrollment))

## A2. App Store Connect — criar o app e registrar o Bundle ID

1. **Certificates, Identifiers & Profiles → Identifiers → App IDs** → registrar o Bundle ID **`com.andrlut.rpgtasks`** (decisão travada — espelha o Android). Não precisa de capabilities especiais (sem push remoto, sem IAP).
2. **App Store Connect → Apps → +** → criar o app:
   - Nome: **Perceva** (nomes são globais e únicos na App Store — se "Perceva" estiver tomado, precisará de um variant; verifique nesse passo).
   - Primary language: **Português (Brasil)**.
   - Bundle ID: selecionar `com.andrlut.rpgtasks`.
   - SKU: string interna qualquer (ex.: `perceva-001`).
3. **Guarde o `ascAppId`** (numérico) que aparece — o EAS Submit vai pedir. Isso pode ir depois no `eas.json` (diff no fim).

## A3. App Privacy (Nutrition Labels) — respostas item a item

No App Store Connect, o modelo tem 3 blocos: **Data Used to Track You**, **Data Linked to You**, **Data Not Linked to You**. ([Apple — App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/))

Para o Perceva, a resposta global de tracking é **NÃO em tudo** (sem ATT, sem data broker, sem ads). Marque os data types abaixo como **coletados, Linked to You (porque atrelados à conta do usuário), NÃO usados para tracking**:

| Data type (categoria Apple) | Coletar? | Linked to identity? | Used for tracking? | Purpose | O que é no app |
|---|---|---|---|---|---|
| **Contact Info → Email address** | Sim | Sim | **Não** | App Functionality | login/auth |
| **User Content → Other user content** | Sim | Sim | **Não** | App Functionality | respostas dos instrumentos psicométricos, tasks/rewards/skills/quests, display_name |
| **Identifiers → User ID** | Sim | Sim | **Não** | App Functionality | `auth.uid()` (Supabase user id) |
| **Usage Data → Product Interaction** | Sim | Sim | **Não** | App Functionality | completions, XP/coins, streak/momentum, assessment_log |
| **Diagnostics** | **Não** | — | — | — | você não coleta crash/analytics de terceiros |

**NÃO marcar** (confirme que ficam desmarcados): Location, Contacts, Photos/Camera, Health & Fitness, Financial Info, Browsing History, Search History, Sensitive Info, Purchases, Advertising Data.

> **Ponto sensível — "Sensitive Info"**: os instrumentos (Big Five, ECR-R apego, Schwartz, bem-estar) NÃO devem ser marcados como "Sensitive Info" nem como "Health & Fitness". Conforme a decisão travada no contexto, enquadre como **User Content de autoconhecimento/wellness**, nunca saúde mental/diagnóstico. Marcar "Health" dispararia disclaimers médicos e revisão mais dura. A categoria correta é **User Content → Other user content**.

A resposta consolidada de "Data Used to Track You" fica **vazia** (nenhum tipo). ([Apple — User Privacy and Data Use](https://developer.apple.com/app-store/user-privacy-and-data-use/))

## A4. Demo account obrigatório + Review Notes

O reviewer da Apple **precisa entrar**. App com login e sem demo válido é motivo comum de rejeição. ([Apple — App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [Volpis — rejection reasons](https://volpis.com/blog/app-store-rejection-reasons/))

- Crie no Supabase um usuário de teste real (ex.: `review@perceva.app` / senha forte) e **semeie dados** nele: adote alguns templates de tasks/rewards, complete 1–2 tasks (para ter streak/XP), rode ao menos 1 instrumento até gerar score. Reviewer que vê tela vazia às vezes conclui "minimum functionality" (4.2).
- **App Review Information** no App Store Connect:
  - Sign-in required: **Yes** → preencher **Username + Password** do demo.
  - **Notes** (exemplo pronto):
    > Perceva is a personal habit & self-reflection app. Sign in with the demo credentials above. All data is protected per-user by Postgres Row-Level Security. The psychometric questionnaires (Big Five, attachment, values, wellbeing self-check) are self-reflection/wellness tools — not medical or diagnostic. Notifications are local only (a morning brief and a midday checkpoint); there is no remote push. Account deletion: Settings → Delete Account (permanently removes the account and all associated data).
  - Contact: seu email/telefone.

## A5. TestFlight (antes da review pública)

- Faça `eas build --platform ios --profile production` → o build vira disponível no App Store Connect.
- **Internal testing** (até 100 membros da equipe, sem review da Apple) → teste você + seu irmão na hora.
- **External testing** exige **Beta App Review** do primeiro build de cada versão — normalmente horas, mas pode esticar. Não é obrigatório para publicar, mas é onde você valida o app real (custom scheme `rpgtasks://` só funciona em build real, não em Expo Go). ([Apple — TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/), [PTKD](https://ptkd.com/journal/does-testflight-review-take-longer-for-the-first-build-2025))

## A6. Guidelines que mais derrubam iniciante nesse app — e mitigação

- **4.2 Minimum Functionality**: app "vazio"/sem utilidade cai. → Mitigar com o **demo account semeado** (A4) para o reviewer ver tasks, XP, questionários funcionando; garanta que empty states não pareçam "app quebrado". ([ShopApper — 4.2](https://shopapper.com/fix-apple-guideline-4-2-rejection-minimum-functionality-explained/))
- **5.1.1(v) Account Deletion**: **bloqueador travado** — precisa do Delete Account real (Edge Function) + fluxo achável em Settings. ([Apple](https://developer.apple.com/support/offering-account-deletion-in-your-app/))
- **2.1 Crashes/incomplete**: teste o build de produção real em device antes de submeter (o custom scheme e o deep-link auth `rpgtasks://auth/callback` precisam funcionar). Nada de "coming soon". ([Adapty 2026](https://adapty.io/blog/how-to-pass-app-store-review/))
- **5.1.1 Privacy**: Nutrition Labels precisam bater com o que o app faz; enquadrar instrumentos como wellness (não saúde). Em 2026 a Apple cruza Privacy Manifests — como você não usa SDKs de tracking, seu manifest é limpo, mas confirme que nada foi marcado como tracking. ([respectlytics](https://respectlytics.com/blog/app-store-privacy-label-guide/))
- **App review time em 2026**: Apple diz ~90% em 24h, mas a realidade de campo em 2026 tem variado de **24–48h até 7–30 dias** em picos. Planeje folga. ([Runway — live times](https://www.runway.team/appreviewtimes), [Lowcode — delays mar/2026](https://www.lowcode.agency/blog/ios-app-review-delays-march-2026))

## A7. Assets de loja (Apple)

- **Screenshots**: pelo menos 1 set de **iPhone 6.9"** (1320 × 2868 px, iPhone 17 Pro Max). Se o app suporta iPad (`supportsTablet: true` no `app.json`), a Apple exige também pelo menos 1 set de **iPad 13"** (2064 × 2752). → Considere setar `supportsTablet: false` no v1 para evitar produzir screenshots de iPad e revisão de layout em tablet. ([Apple — Screenshot specs](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications), [MobileAction 2026](https://www.mobileaction.co/guide/app-screenshot-sizes-and-guidelines-for-the-app-store/))
- Ícone 1024×1024, descrição, keywords, support URL, **Privacy Policy URL** (obrigatória — pode ser a mesma página estática do Delete Account).

---

# B) GOOGLE

## B1. Play Console — conta

- **Custo**: **US$ 25, taxa única** (sem mensalidade, sem por-app, sem renovação). ([IconikAI 2026](https://www.iconikai.com/blog/google-play-developer-account-fee-2026), [Afkar 2026](https://afkarsoftware.com/en/blog-detail/google-play-console-account-2026-one-time-25-fee/))
- **Verificação de identidade + endereço** (contas novas): Google exige **2FA na conta Google**, um **payments profile** (nome + endereço legal), e **verificação de ID por upload de documento**. Cartão de crédito/débito válido (não aceita pré-pago/virtual). Verificação leva de algumas horas a **~2 dias úteis**. ([Devstree](https://www.devstree.com.au/blog/google-play-developer-account-fees-what-you-need-to-know/), [Afkar 2026](https://afkarsoftware.com/en/blog-detail/google-play-console-account-2026-one-time-25-fee/))
- Escolha **conta pessoal** (não organização) — é o que dispara a regra de closed testing abaixo, mas é o caminho certo para você sem CNPJ.

## B2. Closed testing obrigatório (contas pessoais novas) — CONFIRMADO 2026

A regra **continua valendo em 2026**, e o número mudou de 20 → 12 (desde 11/dez/2024):

- Aplica-se a **contas pessoais criadas após 13/nov/2023**. Não vale para contas de organização. ([Play — testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en), [PrimeTestLab — 20 to 12](https://primetestlab.com/blog/google-play-changed-20-to-12-testers))
- **Mínimo 12 testadores opt-in**, mantidos por **14 dias corridos contínuos**. Testadores que entram e saem **não contam** — precisam ficar opted-in os 14 dias sem interrupção. ([Play answer/14151465](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en))
- **Como organizar na prática**:
  1. No Play Console: **Testing → Closed testing → criar uma track** (ou usar a "Closed testing – Alpha").
  2. Adicionar testadores por **lista de emails** (crie a lista com os 12+ emails Google/Gmail dos testadores) — ou por um **Google Group**.
  3. Publicar um build (AAB) nessa track → o Console gera um **opt-in link (web) e/ou link Play Store**; cada testador abre o link, clica **"Become a tester"** e instala.
  4. Confirme que os 12 aparecem como opted-in e **não deixe ninguém sair** durante os 14 dias.
  - Docs não detalham o método técnico além de "recrutar da sua rede"; o mecanismo é email-list/Group + opt-in link. ([Play — closed testing FAQ fetch](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en))
  - Dica de escala: recrute **14–16** para ter folga se alguém desistir.
- **Depois dos 14 dias**: Dashboard → **Apply for production** → responder 3 blocos (sobre o closed test, sobre o app, production readiness). Review de produção costuma sair em **7 dias ou menos**. ([Play answer/14151465](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en))

## B3. Data Safety form — respostas item a item (paralelo ao Nutrition Labels)

Google define 14 categorias; para cada tipo coletado pergunta: **collected? shared? purpose? optional? encrypted in transit? deletable?** ([Play — Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en), [respectlytics 2026](https://respectlytics.com/blog/google-play-data-safety-guide/))

Respostas para o Perceva:

| Data type (Google) | Collected | Shared | Purpose | Encrypted in transit | Deletable? | Nota |
|---|---|---|---|---|---|---|
| **Personal info → Email address** | Sim | **Não** | Account management | **Sim** (HTTPS/Supabase) | Sim | auth |
| **Personal info → Name** | Sim | **Não** | App functionality | Sim | Sim | display_name |
| **Personal info → User IDs** | Sim | **Não** | App functionality | Sim | Sim | `auth.uid()` |
| **App activity → App interactions** | Sim | **Não** | App functionality | Sim | Sim | tasks/rewards/completions/XP/streak |
| **App activity → Other user-generated content** | Sim | **Não** | App functionality | Sim | Sim | respostas/scores dos instrumentos (wellness) |
| **Messages / Photos / Location / Contacts / Financial / Health / Web history / Device IDs** | **Não** | — | — | — | — | não coletados |

- **Shared = Não** em tudo: Supabase é seu **processador de backend**, não terceiro que usa os dados para fins próprios; não há SDK de analytics/ads. ([respectlytics — sharing def](https://respectlytics.com/blog/google-play-data-safety-guide/))
- **Encrypted in transit = Sim** (todas as chamadas são HTTPS). ([Batch docs](https://doc.batch.com/guides-and-best-practices/privacy-and-gdpr/how-to-fill-the-google-play-data-safety-in-the-play-console))
- **Data deletion questions**: responda que **usuários podem deletar a conta e os dados** (in-app + a URL web de deleção da seção do bloqueador). ([Play — account deletion](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en))
- Não há tracking/ads → nenhuma categoria "Data shared for advertising".

## B4. AAB, Play App Signing, assets

- Produção usa **AAB** (Android App Bundle), não APK. Seus profiles `preview`/`development` no `eas.json` geram APK (`buildType: apk`); o profile **`production` não força apk → gera AAB por padrão** (correto). ([Expo — Submit to Play](https://docs.expo.dev/submit/android/))
- **Play App Signing**: ativado por padrão; o Google gerencia a chave de assinatura final. Você faz upload do AAB assinado com a upload key (o EAS gerencia isso).
- **Primeira submissão é MANUAL**: o Google exige subir o app **manualmente ao menos uma vez** no Console antes que submissões via API (EAS Submit) funcionem — limitação da Play API. Ou seja: o build do closed testing você sobe manualmente pelo Console; depois pode automatizar. ([Expo — Submit Android](https://docs.expo.dev/submit/android/), [expo/fyi — service account](https://github.com/expo/fyi/blob/main/creating-google-service-account.md))
- **Assets**: **Feature graphic 1024×500 px** (JPEG ou PNG 24-bit sem alpha), ícone 512×512, mínimo 2 screenshots de telefone (recomendado 1080×1920), descrição curta + longa, Privacy Policy URL. ([ScreenshotOtter — Play sizes](https://screenshototter.com/google-play-screenshot-sizes), [ScreenKit — feature graphic](https://screenkit.tools/specs/google-play-feature-graphic-size))
- **Content rating** (questionário IARC), **target audience**, **ads declaration = No ads** — tudo obrigatório no App content.

---

# C) TIMELINE REALISTA (semanas)

| Semana | Google (background) | Apple (paralelo) |
|---|---|---|
| **0** | Criar conta ($25) + verificação de ID (~horas–2 dias úteis). Implementar **Delete Account real** + página web de deleção. | Enrollment individual ($99, 24–48h). Registrar Bundle ID. |
| **1** | Subir 1º AAB **manualmente** no closed testing; recrutar **14–16** testadores; começar o relógio de **14 dias**. Preencher Data Safety. | Criar app no ASC, preencher Nutrition Labels, criar demo account semeado, subir build via `eas build`, testar em TestFlight. |
| **2** | Testadores mantidos opted-in (não mexer). | Finalizar screenshots/descrição, **submeter à App Review**. Review: 24–48h típico, até 7–30 dias em picos 2026. |
| **3** | Fecha os 14 dias → **Apply for production** (review ≤ 7 dias). | (Se aprovado) app liberado; ou responder a rejeições e reenviar. |
| **4** | Produção aprovada → publicar. | Buffer para rejeição/reenvio. |

**Estimativa consolidada**: **~3–5 semanas** do zero ao "publicável nas duas", com o **closed testing do Google como caminho crítico** (mínimo rígido de 14 dias + até 7 de review de produção). O iOS cabe todo dentro desse intervalo se a review não cair num pico de atraso.

Fontes de tempo: [Play — closed testing](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en), [Apple review times 2026 — Runway](https://www.runway.team/appreviewtimes), [Lowcode — delays 2026](https://www.lowcode.agency/blog/ios-app-review-delays-march-2026).

---

# D) CHECKLIST "PRONTO PRA SUBMETER"

### Comum (gate das duas)
- [ ] Delete Account **real** funcionando in-app (Edge Function `auth.admin.deleteUser`), achável em Settings
- [ ] **URL web pública de deleção** de conta/dados (exigência Google)
- [ ] **Privacy Policy URL** pública (serve para as duas)
- [ ] Build de produção testado em device real (deep-link `rpgtasks://auth/callback` OK, sem telas "coming soon")
- [ ] Instrumentos enquadrados como wellness/autoconhecimento em toda a copy e em ambos os formulários de privacidade

### Apple
- [ ] Apple Developer Program ativo ($99, individual, 2FA)
- [ ] Bundle ID `com.andrlut.rpgtasks` registrado
- [ ] App "Perceva" criado no App Store Connect; `ascAppId` anotado
- [ ] Nutrition Labels preenchidas (Email, User Content, User ID, Usage Data → **Linked, NÃO tracking**; tracking vazio)
- [ ] Demo account semeado + credenciais e Notes preenchidos em App Review Information
- [ ] Screenshots iPhone 6.9" (1320×2868); decidir `supportsTablet` (false evita screenshots de iPad)
- [ ] Ícone 1024×1024, descrição, keywords, support/privacy URLs
- [ ] Build enviado via `eas build --profile production` e visível no TestFlight

### Google
- [ ] Play Console ativo ($25, ID + endereço verificados, 2FA)
- [ ] App criado; **1º AAB subido MANUALMENTE** no closed testing
- [ ] Track de closed testing com **≥12 testadores opted-in** por **14 dias corridos** (recrutar 14–16)
- [ ] Data Safety completo (Email/Name/User ID/App activity/User content → collected, **not shared**, encrypted in transit, deletable) + Data deletion questions
- [ ] Content rating (IARC), target audience, **Ads = No** declarados
- [ ] Feature graphic 1024×500, ícone 512×512, ≥2 screenshots, descrições, privacy URL
- [ ] Após 14 dias: **Apply for production** submetido

---

## Diffs prontos (NÃO aplicados — para branch própria + PR, sem rebuild)

Estas são as mudanças em arquivos existentes. Nenhuma toca schema, RPCs, `app/lib/xp.ts`, funções do Learn ou telas de tiers — respeita o território do chat paralelo. Nenhuma força rebuild nativo (são config de submit/metadata; o build nativo já sai do `eas build` que o outro chat controla).

**1) `app/eas.json`** — preencher o `submit.production` para habilitar EAS Submit nas duas lojas. Preencha os placeholders quando tiver as credenciais (o Play exige a 1ª submissão manual antes disso funcionar via API).

```diff
   "submit": {
-    "production": {}
+    "production": {
+      "ios": {
+        "appleId": "SEU_APPLE_ID_EMAIL",
+        "ascAppId": "ASC_APP_ID_NUMERICO",
+        "appleTeamId": "SEU_TEAM_ID"
+      },
+      "android": {
+        "serviceAccountKeyPath": "./google-service-account.json",
+        "track": "internal"
+      }
+    }
   }
```
(o `google-service-account.json` deve ficar gitignored; nunca commitar. `track: "internal"` para as primeiras submissões automatizadas — troque para `production` no release final.)

**2) `app/app.json`** — opcional mas recomendado: desligar suporte a iPad no v1 para evitar a exigência de screenshots de iPad e revisão de layout em tablet.

```diff
     "ios": {
-      "supportsTablet": true
+      "supportsTablet": false
     },
```
(Se quiser manter iPad, deixe como está — mas então produza screenshots iPad 13" 2064×2752 e valide o layout em tablet.)

**3) `app/app/(tabs)/profile.tsx`** — ✅ **feito na #274.** `handleDeleteAccount` invoca `supabase.functions.invoke('delete-account')` seguido de `supabase.auth.signOut()`, e a Edge Function existe em `supabase/functions/delete-account/` e está deployada. O texto anterior descrevia uma coordenação entre dois chats que já aconteceu.

---

## Fontes

**Apple**
- [Apple Developer Program — Membership Details](https://developer.apple.com/programs/whats-included/)
- [Apple Developer Program Fee 2026 (Groovyweb)](https://www.groovyweb.co/blog/how-much-does-it-cost-app-store)
- [Apple — Enrollment help](https://developer.apple.com/help/account/membership/program-enrollment/)
- [Apple — D-U-N-S Number](https://developer.apple.com/help/account/membership/D-U-N-S/)
- [Apple — Enroll](https://developer.apple.com/programs/enroll/) · [WebToNative 2026 guide](https://www.webtonative.com/blog/apple-developer-program-enrollment)
- [Apple — App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/) · [User Privacy and Data Use](https://developer.apple.com/app-store/user-privacy-and-data-use/) · [respectlytics 2026](https://respectlytics.com/blog/app-store-privacy-label-guide/)
- [Apple — App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) · [Offering account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/) · [Volpis — rejection reasons](https://volpis.com/blog/app-store-rejection-reasons/) · [ShopApper — 4.2](https://shopapper.com/fix-apple-guideline-4-2-rejection-minimum-functionality-explained/) · [Adapty 2026 checklist](https://adapty.io/blog/how-to-pass-app-store-review/)
- [Apple — TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/) · [Apple review times (Runway)](https://www.runway.team/appreviewtimes) · [Lowcode — delays 2026](https://www.lowcode.agency/blog/ios-app-review-delays-march-2026)
- [Apple — Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications) · [MobileAction 2026](https://www.mobileaction.co/guide/app-screenshot-sizes-and-guidelines-for-the-app-store/)

**Google**
- [Play — App testing requirements (answer/14151465)](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en) · [PrimeTestLab — 20→12 testers](https://primetestlab.com/blog/google-play-changed-20-to-12-testers)
- [IconikAI — Play fee 2026](https://www.iconikai.com/blog/google-play-developer-account-fee-2026) · [Afkar — Play setup 2026](https://afkarsoftware.com/en/blog-detail/google-play-console-account-2026-one-time-25-fee/) · [Devstree — Play fees](https://www.devstree.com.au/blog/google-play-developer-account-fees-what-you-need-to-know/)
- [Play — Data safety (answer/10787469)](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en) · [respectlytics — Data Safety 2026](https://respectlytics.com/blog/google-play-data-safety-guide/) · [Batch — how to fill Data Safety](https://doc.batch.com/guides-and-best-practices/privacy-and-gdpr/how-to-fill-the-google-play-data-safety-in-the-play-console)
- [Play — account deletion requirements (answer/13327111)](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
- [Expo — Submit to Play](https://docs.expo.dev/submit/android/) · [expo/fyi — Google service account](https://github.com/expo/fyi/blob/main/creating-google-service-account.md)
- [ScreenshotOtter — Play screenshot sizes](https://screenshototter.com/google-play-screenshot-sizes) · [ScreenKit — feature graphic 1024×500](https://screenkit.tools/specs/google-play-feature-graphic-size)

**Files referenciados** (absolutos): `C:\Users\André Luthold\Projetos\RPG\app\app.json`, `C:\Users\André Luthold\Projetos\RPG\app\eas.json`, `C:\Users\André Luthold\Projetos\RPG\app\app\(tabs)\profile.tsx`.
