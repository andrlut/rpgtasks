# Publicar o Perceva — pacote de mão beijada

Tudo que você precisa pra colocar o Perceva na **App Store** e na **Google Play**,
verificado contra as regras de 2026. Este README é o **índice + o roteiro do dia da
execução**. Os detalhes ficam nos arquivos numerados.

| Arquivo | O que é |
|---|---|
| [`00-playbook.md`](00-playbook.md) | Contas Apple + Google do zero, Data Safety / Nutrition Labels item-a-item, regra dos 12 testers, timeline |
| [`01-store-metadata.md`](01-store-metadata.md) | **Copy-paste**: nome, subtitle, descrição, keywords, categoria, content rating — pt-BR + en-US, 2 lojas |
| [`02-assets-spec.md`](02-assets-spec.md) | Ícone, screenshots, feature graphic — tamanhos exatos + quais telas capturar |
| [`03-ios-build-runbook.md`](03-ios-build-runbook.md) | O que mudou em `app.json`/`eas.json` + passo-a-passo do `eas build`/`eas submit` iOS |
| [`04-delete-account.md`](04-delete-account.md) | Auditoria de cascade + Edge Function + wiring do client + deploy |
| [`privacy-policy-pt.md`](privacy-policy-pt.md) / [`privacy-policy-en.md`](privacy-policy-en.md) | Política de privacidade pronta pra hospedar (LGPD + GDPR) |

---

## ✅ O que esta PR já deixou pronto (não precisa fazer nada)

- **Config iOS aplicada** em `app/app.json` (`bundleIdentifier`, `buildNumber`, export-compliance) e `app/eas.json` (blocos `ios` + `submit`).
- **`supportsTablet: false`** — decisão de v1: evita ter que produzir screenshots de iPad e a review de layout em tablet. É **uma linha reversível** se você quiser iPad depois.
- **Edge Function `delete-account`** escrita em `supabase/functions/delete-account/` — **deployada e ligada no client** desde a #274 (`app/app/(tabs)/profile.tsx` invoca ela). Passo 1 abaixo está concluído.
- **`google-service-account.json` no `.gitignore`** (nunca vaza).
- Toda a documentação acima.

## 🔒 Dois confirm-gates (decida antes de submeter)

1. **Bundle ID** = `com.andrlut.rpgtasks` (espelha o Android, invisível ao usuário). Ainda **mutável até a 1ª submissão iOS**. Se quiser `perceva.*`, troque em `app.json` antes de buildar.
2. **Qual build vira a v1** — hoje o `main` está em evolução pelo polish V3. Escolha a commit que vira o release quando o Phase 1 assentar. Nada aqui trava isso; a prep é independente do build.

---

## 🚀 Roteiro do dia (ordem exata)

Marcadores: 💳 = custa dinheiro/tem latência (comece cedo) · 🤖 = eu executo (Claude) · 👤 = você · 🌐 = fora do repo.

### Passo 0 — Comece o que é lento (dias de latência)
- [ ] 💳👤 **Apple Developer Program** ($99/ano, *individual* — não precisa D-U-N-S). Enrollment sai em 24–48h; pode pedir foto de documento. → [`00-playbook.md` §A1](00-playbook.md)
- [ ] 💳👤 **Google Play Console** ($25, taxa única). Verificação de ID + endereço leva até ~2 dias úteis. Escolha conta **pessoal**. → [`00-playbook.md` §B1](00-playbook.md)

### Passo 1 — Delete Account real (bloqueia AS DUAS lojas) — ✅ **concluído na #274**
- [x] 👤 Service_role key rotacionada.
- [x] 🤖 `supabase functions deploy delete-account` — a function está no ar.
- [x] 🤖 Client wiring aplicado: `app/app/(tabs)/profile.tsx` invoca `supabase.functions.invoke('delete-account')`.
- [ ] 🤖👤 Smoke test com uma conta descartável: tap em Settings → Delete Account → confirmar que some do Auth + dados cascateados.

> Sobra só o smoke test. O botão in-app satisfaz metade do requisito — a **página web** de deleção (Passo 2) continua obrigatória pro Google.

### Passo 2 — Páginas públicas (privacy + deleção web)
- [ ] 👤🌐 Criar repo público `perceva-legal`, jogar `privacy-policy-pt/en` como HTML, ligar **GitHub Pages**. → passos exatos abaixo.
- [ ] 👤🌐 **Página web de exclusão de conta** — o Google exige um **link web** (além do botão in-app), porque o usuário pode já ter desinstalado. Pode ser uma seção da própria privacy: "para excluir: app → Settings → Delete Account, ou email para privacy@perceva.app".
- [ ] 👤 Trocar `[DATA]` na privacy pela data real e conferir o email de contato.

### Passo 3 — Google (caminho crítico — começa o relógio de 14 dias)
- [ ] 👤 Criar o app no Play Console; preencher store listing com [`01-store-metadata.md`](01-store-metadata.md) (Play, pt+en).
- [ ] 🤖 `eas build --platform android --profile production` (gera **AAB**).
- [ ] 👤🌐 **Subir o 1º AAB MANUALMENTE** no closed testing (a Play API exige a 1ª submissão manual).
- [ ] 👤 Recrutar **14–16 testers** (folga sobre o mínimo de 12), criar a track, mandar o opt-in link → **relógio de 14 dias corridos começa**.
- [ ] 👤 Preencher **Data Safety** ([`00-playbook.md` §B3](00-playbook.md)) + content rating IARC + Ads = No.

### Passo 4 — Apple (roda em paralelo aos 14 dias do Google)
- [ ] 👤 App Store Connect → criar app "Perceva", registrar bundle ID `com.andrlut.rpgtasks`, anotar o `ascAppId` (numérico) → colar em `eas.json`.
- [ ] 👤 Preencher **Nutrition Labels** ([`00-playbook.md` §A3](00-playbook.md)) — tudo **Linked, NÃO tracking**; instrumentos como *User Content*, nunca Health.
- [ ] 🤖👤 **Demo account semeado** pro reviewer (conta de teste com tasks/streak/skills/1 instrumento feito) + preencher Review Notes ([`00-playbook.md` §A4](00-playbook.md)).
- [ ] 🤖 `eas build --platform ios --profile preview` → você instala no seu iPhone e valida de verdade (auth deep-link, sem telas quebradas).
- [ ] 🤖 `eas build --platform ios --profile production` → `eas submit --platform ios` → **TestFlight**.
- [ ] 👤 Submeter à **App Review** (espere ≥1 rejeição na 1ª; é normal).

### Passo 5 — Assets (precisa de build real)
- [ ] 👤 Capturar **6–8 telas** ([`02-assets-spec.md` §3](02-assets-spec.md)): Home/Tasks, 3 pilares, um instrumento, Skills, Rewards, Learn.
- [ ] 👤 iPhone 6.9" **1320×2868** (só esse tamanho é obrigatório) · Android phone **1080×2400** (do APK preview que você já tem).
- [ ] 👤 **Feature graphic 1024×500** do Google (obrigatório, bloqueia publicação) · ícone Play 512×512 (com alpha) · App Store 1024×1024 (sem alpha).

### Passo 6 — Fechar
- [ ] 👤 Google: passados os 14 dias → **Apply for production** (review ≤ 7 dias).
- [ ] 👤 Apple: responder a rejeições / reenviar até aprovar.

---

## 💳 Custos (ano 1)

| Item | Custo |
|---|---|
| Apple Developer Program | **US$ 99/ano** |
| Google Play (taxa única) | **US$ 25** |
| Privacy hosting (GitHub Pages) | grátis |
| **Total ano 1** | **~US$ 124** (depois ~US$ 99/ano) |

Sem IAP no v1 → **sem StoreKit/Play Billing**. Sem login social → **sem Sign in with Apple**. Sem tracking → **sem ATT**. Isso simplifica muito os formulários.

## ⏱️ Timeline realista

**~3–5 semanas** do zero ao publicável nas duas. O **closed testing do Google (14 dias fixos + até 7 de review) é o caminho crítico**; o iOS cabe todo dentro dessa janela. → detalhe em [`00-playbook.md` §C](00-playbook.md).

---

## 🌐 Hospedar a privacy policy (passos rápidos)

1. Criar repo público (ex.: `perceva-legal`).
2. Converter `privacy-policy-pt.md` / `-en.md` em `privacy-pt.html` / `privacy-en.html` (qualquer conversor md→HTML) + um `index.html` linkando os dois.
3. Repo → **Settings → Pages → Source: Deploy from a branch → `main` / root → Save**.
4. URLs finais: `https://<user>.github.io/perceva-legal/privacy-pt.html` (e `-en`).
5. Testar em aba anônima (Google rejeita URL com login, geofence ou PDF).
6. Colar: **App Store Connect** → App Information → Privacy Policy URL · **Play Console** → App content → Privacy Policy.

---

## 🤝 Coordenação com o polish V3 (chat paralelo)

Este pacote **não toca schema, RPCs, `xp.ts`, telas de tiers, nem o pipeline do Learn** — território do chat paralelo. Precisa de **zero migration** → zero risco na cloud DB compartilhada. As únicas costuras em arquivos existentes são `app/app.json` e `app/eas.json` (config aditiva). O wiring do `profile.tsx` fica **staged** (diff pronto no doc 04), aplicado só no dia do deploy pra não colidir. O `eas build` nativo continua sendo disparado pelo polish (D6).
