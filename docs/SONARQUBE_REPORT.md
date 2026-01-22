# 📊 SonarQube Analysis Report - Leonardo School

**Data analisi:** 23 Gennaio 2026  
**Branch:** `sonarqube_refactoring`  
**Tool:** eslint-plugin-sonarjs (regole identiche a SonarQube Cloud)

---

## 📁 Cartelle Analizzate

| Cartella | Analizzata | File con errori |
|----------|------------|-----------------|
| `app/` | ✅ | 47 |
| `components/` | ✅ | 35 |
| `lib/` | ✅ | 15 |
| `server/` | ✅ | 14 |
| `tests/` | ✅ | 24 |
| `scripts/` | ✅ | 4 |
| `mobile/` | ✅ | 23 |
| `types/` | ✅ | - |
| `prisma/` | ✅ | - |

---

## 🔢 Riepilogo Totale

| Metrica | Valore |
|---------|--------|
| **Totale errori** | **783** |
| Cognitive Complexity > 15 | 74 |
| Nested Ternary | 248 |
| Nested Functions > 4 levels | 187 |
| Slow Regex (vulnerabilità) | 26 |
| Unused Variables | ~53 |
| Pseudo-random warnings | ~47 |
| Hardcoded Passwords (falsi positivi) | 9 |
| TODO Comments | 2 |
| Commented Code | 5 |

---

## 🔴 PRIORITÀ 1: Cognitive Complexity (74 errori)

Funzioni che superano il limite di complessità 15.

### 🌐 Web App (66 errori)

| File | Riga | Funzione | Complessità |
|------|------|----------|-------------|
| `app/(app)/materiali/MaterialsContent.tsx` | 164 | `AdminMaterialsContent` | **129** |
| `server/trpc/routers/students.ts` | 608 | `getDetailedStats` | **62** |
| `app/(app)/simulazioni/nuova/page.tsx` | 714 | Callback | **50** |
| `components/admin/QuestionForm.tsx` | 96 | `QuestionForm` | **35** |
| `app/(app)/calendario/CollaboratorCalendarContent.tsx` | 68 | Component | **35** |
| `app/(app)/utenti/AdminUtentiContent.tsx` | 452 | `AssignContractModal` | **32** |
| `app/(app)/profilo/page.tsx` | 38 | Component | **29** |
| `components/simulazioni/TolcSimulationLayout.tsx` | 64 | Component | **28** |
| `app/(app)/domande/AdminQuestionsContent.tsx` | 66 | Component | **27** |
| `app/(app)/simulazioni/StudentSimulationsContent.tsx` | 96 | Component | **22** |
| `server/trpc/routers/virtualRoom.ts` | 527 | Mutation | **22** |
| `app/(app)/simulazioni/[id]/risultato/page.tsx` | 490 | Callback | **22** |
| `app/(app)/materiali/MaterialsContent.tsx` | 478 | `handleMultiUpload` | **20** |
| `app/(app)/simulazioni/AdminSimulationsContent.tsx` | 87 | Component | **19** |
| `app/(app)/calendario/AdminCalendarContent.tsx` | 69 | Component | **18** |
| `app/(app)/materiali/MaterialsContent.tsx` | 1568 | Render callback | **18** |
| `app/(app)/simulazioni/[id]/risultato/page.tsx` | 40 | Component | **18** |
| `app/(app)/simulazioni/[id]/risultato/page.tsx` | 369 | Callback | **18** |
| `app/(app)/gruppi/AdminGruppiContent.tsx` | 87 | Component | **17** |
| `server/trpc/routers/users.ts` | 1202 | `getAdminPlatformStats` | **17** |

### 📱 Mobile App (8 errori)

| File | Riga | Funzione | Complessità |
|------|------|----------|-------------|
| `mobile/app/simulation/[id]/index.tsx` | 100 | Component | **27** |
| `mobile/app/(onboarding)/pending-contract.tsx` | 25 | Component | **26** |
| `mobile/components/auth/AuthGuard.tsx` | 61 | Component | **25** |
| `mobile/app/(tabs)/messaggi.tsx` | 59 | Component | **22** |
| `mobile/app/(tabs)/simulations.tsx` | 67 | Component | **20** |
| `mobile/app/(tabs)/profile.tsx` | 41 | Component | **17** |
| `mobile/components/simulation/TolcSimulationLayout.tsx` | 176 | Function | **16** |

---

## 🔴 PRIORITÀ 2: Slow Regex - Vulnerabilità DoS (26 errori)

Regex vulnerabili a ReDoS (Regular Expression Denial of Service).

### 🌐 Web App (25 errori)

| File | Riga | Descrizione |
|------|------|-------------|
| `app/(app)/simulazioni/[id]/StaffSimulationDetailContent.tsx` | 332 | Regex backtracking |
| `app/(app)/simulazioni/[id]/domande/page.tsx` | 336, 425 | Regex backtracking |
| `app/(app)/simulazioni/[id]/statistiche/page.tsx` | 255, 443 | Regex backtracking |
| `lib/utils/sanitizeHtml.ts` | multiple | HTML sanitization regex |
| `lib/validations/*.ts` | multiple | Validation patterns |

### 📱 Mobile App (1 errore)

| File | Riga | Descrizione |
|------|------|-------------|
| `mobile/app/(auth)/register.tsx` | 100 | Regex backtracking in validation |

---

## 🟡 PRIORITÀ 3: Nested Ternary (248 errori)

Operatori ternari annidati che riducono la leggibilità.

### 🌐 Web App - File con più occorrenze:
- `MaterialsContent.tsx` - 21 occorrenze
- `AdminCalendarContent.tsx` - 10 occorrenze
- `CollaboratorCalendarContent.tsx` - 10 occorrenze
- `risultato/page.tsx` - 15 occorrenze
- `AdminQuestionsContent.tsx` - 6 occorrenze

### 📱 Mobile App (21 errori):
| File | Righe |
|------|-------|
| `mobile/components/simulation/TolcSimulationLayout.tsx` | 195, 197, 204, 215, 217 (5) |
| `mobile/app/(tabs)/index.tsx` | 407, 432, 439 (3) |
| `mobile/app/(tabs)/messaggi.tsx` | 337, 342, 349 (3) |
| `mobile/app/(tabs)/simulations.tsx` | 413, 414, 425 (3) |
| `mobile/app/(tabs)/notifications.tsx` | 241, 281 (2) |
| `mobile/app/(tabs)/calendario.tsx` | 281 (1) |
| `mobile/app/(tabs)/gruppo.tsx` | 153 (1) |
| `mobile/app/(tabs)/materiali.tsx` | 223 (1) |
| `mobile/app/(tabs)/statistics.tsx` | 511 (1) |
| `mobile/app/conversation/[id].tsx` | 292 (1) |
| `mobile/app/simulation/[id]/index.tsx` | 1119 (1) |
| `mobile/components/simulation/InTestMessaging.tsx` | 310 (1) |
| `mobile/components/simulation/StudentWaitingRoom.tsx` | 154 (1) |

**Soluzione:** Estrarre in funzioni helper o usare early returns.

---

## 🟡 PRIORITÀ 4: Nested Functions > 4 levels (187 errori)

Funzioni annidate oltre 4 livelli di profondità.

### 🌐 Web App - File con più occorrenze:
- `tests/unit/trpc/routers/*.test.ts` - Maggior parte nei test
- `MaterialsContent.tsx` - 3 occorrenze
- `StudentMaterialsContent.tsx` - 6 occorrenze
- `AdminCalendarContent.tsx` - 2 occorrenze

### 📱 Mobile App (1 errore):
| File | Riga |
|------|------|
| `mobile/components/simulation/InTestMessaging.tsx` | 179 |

**Soluzione:** Estrarre callback in funzioni separate.

---

## 🟢 PRIORITÀ 5: Altri Warning

### Unused Variables (~53)
Variabili dichiarate ma mai usate. Pattern comune: `_ctx`, `_utils`, etc.

#### 📱 Mobile specifici:
| File | Riga | Variabile |
|------|------|-----------|
| `mobile/app/simulation/[id]/index.tsx` | 118 | `_showSectionTransition` |
| `mobile/components/simulation/TolcSimulationLayout.tsx` | 368 | `_getQuestionStatus` |
| `mobile/hooks/useAuth.ts` | 31 | `_inTabsGroup` |

### Pseudo-random (~47)
Uso di `Math.random()` - warning di sicurezza per contesti critici.

### Concise Regex (~10)
Usare `\d` invece di `[0-9]` per leggibilità.

#### 📱 Mobile specifico:
| File | Riga |
|------|------|
| `mobile/app/(auth)/register.tsx` | 63 |

### 🔐 Hardcoded Passwords - Falsi Positivi (9 errori)

Questi sono **label** dei campi password, NON password hardcoded reali.

| File | Righe |
|------|-------|
| `mobile/app/(auth)/login.tsx` | 108, 110 (2) |
| `mobile/app/(auth)/register.tsx` | 106, 108, 110, 115, 117 (7) |
| `mobile/lib/errorHandler.ts` | 95, 97 (2) |

> ⚠️ Considerare disabilitare questa regola per i file mobile auth o aggiungere commenti `// NOSONAR`.

### 📌 TODO Comments (2 errori)

| File | Riga | Descrizione |
|------|------|-------------|
| `mobile/app/(tabs)/simulations.tsx` | 367 | Task incompleto |
| `mobile/services/pushNotifications.ts` | 76 | Task incompleto |

### 🗑️ Commented Code (5 errori)

| File | Righe |
|------|-------|
| `mobile/app/(tabs)/notifications.tsx` | 162, 165 (2) |
| `mobile/services/pushNotifications.ts` | 224, 228, 232 (3) |

### 🔧 Redundant Type Alias (1 errore)

| File | Riga | Problema |
|------|------|----------|
| `mobile/lib/trpc.ts` | 24 | Alias ridondante per `any` |

---

## 📋 Comandi Utili

```bash
# Esegui analisi completa
pnpm lint

# Conta errori per tipo
pnpm lint 2>&1 | grep "cognitive-complexity" | wc -l

# Filtra solo errori di un file
pnpm lint 2>&1 | grep "MaterialsContent"

# Genera report JSON
pnpm eslint --format json app/ components/ lib/ server/ > sonar_report.json
```

---

## 🎯 Piano di Correzione Suggerito

### Fase 1: Critici (Cognitive Complexity)

#### 🌐 Web App:
1. `MaterialsContent.tsx` (129 → 15) - Estrarre componenti
2. `students.ts:getDetailedStats` (62 → 15) - Estrarre helper
3. `nuova/page.tsx` (50 → 15) - Refactoring callback
4. `QuestionForm.tsx` (35 → 15) - Estrarre sezioni form

#### 📱 Mobile App:
1. `simulation/[id]/index.tsx` (27 → 15) - Estrarre logica
2. `pending-contract.tsx` (26 → 15) - Semplificare flow
3. `AuthGuard.tsx` (25 → 15) - Estrarre checks
4. `messaggi.tsx` (22 → 15) - Refactor component

### Fase 2: Sicurezza (Slow Regex)
1. Verificare e ottimizzare regex in `sanitizeHtml.ts`
2. Usare pattern non-backtracking
3. Fix `mobile/app/(auth)/register.tsx:100`

### Fase 3: Leggibilità (Nested Ternary)
1. Creare utility functions per conditional classes
2. Usare oggetti di mapping invece di ternari multipli

### Fase 4: Clean Code
1. Rimuovere variabili unused
2. Usare `\d` in regex
3. Rimuovere commented code
4. Risolvere TODO o rimuoverli

---

## ✅ File Già Corretti

- `server/trpc/routers/simulations.ts` ✓
- `server/trpc/routers/questions.ts` ✓
- `app/(app)/simulazioni/[id]/StudentSimulationExecutionContent.tsx` ✓

---

## 📱 Mobile - Riepilogo Completo (56 errori in 23 file)

### Lista completa file con errori:

| File | Errori | Tipologia principale |
|------|--------|---------------------|
| `mobile/app/(auth)/login.tsx` | 2 | Hardcoded passwords (FP) |
| `mobile/app/(auth)/register.tsx` | 9 | Hardcoded passwords (FP), Slow regex, Concise regex |
| `mobile/app/(auth)/forgot-password.tsx` | - | - |
| `mobile/app/(onboarding)/pending-contract.tsx` | 1 | Cognitive complexity (26) |
| `mobile/app/(tabs)/calendario.tsx` | 1 | Nested ternary |
| `mobile/app/(tabs)/gruppo.tsx` | 1 | Nested ternary |
| `mobile/app/(tabs)/index.tsx` | 3 | Nested ternary |
| `mobile/app/(tabs)/materiali.tsx` | 1 | Nested ternary |
| `mobile/app/(tabs)/messaggi.tsx` | 4 | Cognitive complexity (22), Nested ternary x3 |
| `mobile/app/(tabs)/notifications.tsx` | 4 | Commented code x2, Nested ternary x2 |
| `mobile/app/(tabs)/profile.tsx` | 1 | Cognitive complexity (17) |
| `mobile/app/(tabs)/simulations.tsx` | 5 | Cognitive complexity (20), TODO, Nested ternary x3 |
| `mobile/app/(tabs)/statistics.tsx` | 1 | Nested ternary |
| `mobile/app/conversation/[id].tsx` | 1 | Nested ternary |
| `mobile/app/simulation/[id]/index.tsx` | 3 | Cognitive complexity (27), Unused var, Nested ternary |
| `mobile/components/auth/AuthGuard.tsx` | 1 | Cognitive complexity (25) |
| `mobile/components/simulation/InTestMessaging.tsx` | 2 | Nested function >4, Nested ternary |
| `mobile/components/simulation/StudentWaitingRoom.tsx` | 1 | Nested ternary |
| `mobile/components/simulation/TolcSimulationLayout.tsx` | 7 | Cognitive complexity (16), Unused var, Nested ternary x5 |
| `mobile/hooks/useAuth.ts` | 1 | Unused var |
| `mobile/lib/errorHandler.ts` | 2 | Hardcoded passwords (FP) |
| `mobile/lib/trpc.ts` | 1 | Redundant type alias |
| `mobile/services/pushNotifications.ts` | 4 | TODO, Commented code x3 |

---

*Report generato automaticamente con eslint-plugin-sonarjs*
