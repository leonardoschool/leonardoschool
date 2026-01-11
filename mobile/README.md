# Leonardo School - Mobile App

App mobile React Native con Expo per studenti Leonardo School.

## Requisiti

- Node.js 18+
- pnpm (o npm/yarn)
- Expo CLI
- iOS: XCode (per build iOS)
- Android: Android Studio (per build Android)

## Setup

### 1. Installazione dipendenze

```bash
cd mobile
pnpm install
```

### 2. Configurazione ambiente

Copia il file di esempio e configura le variabili:

```bash
cp .env.example .env
```

Modifica `.env` con i valori corretti per:
- URL API backend
- Credenziali Firebase

### 3. Avvio development server

```bash
# Avvia Expo dev server
pnpm start

# Oppure per piattaforma specifica
pnpm ios     # iOS Simulator
pnpm android # Android Emulator
```

## Struttura Progetto

```
mobile/
├── app/                    # Route (Expo Router - file-based)
│   ├── (auth)/            # Schermate autenticazione
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/            # Tab navigation principale
│   │   ├── index.tsx      # Dashboard
│   │   ├── simulations.tsx
│   │   ├── statistics.tsx
│   │   ├── notifications.tsx
│   │   └── profile.tsx
│   ├── simulation/        # Esecuzione simulazioni
│   │   └── [id]/
│   │       ├── index.tsx  # Quiz
│   │       └── result.tsx # Risultati
│   └── _layout.tsx        # Root layout
├── components/            # Componenti React
│   └── ui/               # UI components base
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Input.tsx
│       ├── Text.tsx
│       ├── Badge.tsx
│       └── Loader.tsx
├── contexts/             # React contexts
│   └── ThemeContext.tsx  # Dark/light mode
├── hooks/                # Custom hooks
│   └── useAuth.ts        # Auth & notifications
├── lib/                  # Utilities
│   ├── config.ts         # API configuration
│   ├── storage.ts        # Async/Secure storage
│   ├── trpc.ts          # tRPC client
│   ├── errorHandler.ts   # Error handling
│   └── theme/            # Design system
│       ├── colors.ts     # Colori brand
│       ├── spacing.ts    # Sistema spaziatura
│       └── typography.ts # Tipografia
├── services/             # External services
│   └── pushNotifications.ts
├── stores/               # Zustand stores
│   ├── authStore.ts      # Auth state
│   └── notificationStore.ts
└── types/                # TypeScript types
    └── index.ts
```

## Funzionalità

### Autenticazione
- Login con email/password (Firebase Auth)
- Registrazione studenti
- Persistenza sessione con SecureStore

### Simulazioni
- Lista simulazioni assegnate/completate
- Esecuzione quiz con timer
- Navigatore domande
- Consegna e visualizzazione risultati

### Statistiche
- Statistiche per periodo
- Grafici punteggi
- Performance per materia

### Notifiche Push
- Notifiche simulazioni assegnate
- Promemoria scadenze
- Risultati disponibili

### Tema
- Supporto dark/light mode automatico
- Colori brand Leonardo School

## Scripts

```bash
pnpm start      # Avvia Expo dev server
pnpm ios        # Avvia su iOS Simulator
pnpm android    # Avvia su Android Emulator
pnpm web        # Avvia versione web
pnpm lint       # Controlla linting
pnpm test       # Esegui test (quando configurati)
```

## Build

### Development Build (EAS)

```bash
# iOS
eas build --platform ios --profile development

# Android
eas build --platform android --profile development
```

### Production Build

```bash
# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production
```

## Contribuire

1. Seguire le convenzioni di codice del progetto
2. Usare il sistema colori da `lib/theme/colors.ts`
3. Usare componenti UI da `components/ui/`
4. Gestire errori con `lib/errorHandler.ts`
5. Scrivere messaggi utente in italiano
