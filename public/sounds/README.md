# Sounds Directory

Questa cartella contiene i file audio utilizzati nell'applicazione.

## notification.mp3

File audio per le notifiche di nuovi messaggi nella Virtual Room.

### Come aggiungere il file:

1. Scarica un file audio di notifica (formato MP3)
2. Rinomina il file in `notification.mp3`
3. Posizionalo in questa cartella (`public/sounds/`)

### Requisiti:
- Formato: MP3
- Durata consigliata: 0.5-1 secondo
- Volume: medio-basso (il codice lo imposta automaticamente a 50%)

### Fallback:
Se il file MP3 non è presente, l'applicazione genererà automaticamente un suono sintetizzato usando la Web Audio API (due beep in sequenza: 800Hz e 600Hz).

### Fonti consigliate per file audio:
- [Freesound.org](https://freesound.org)
- [Zapsplat.com](https://www.zapsplat.com)
- [Notification Sounds](https://notificationsounds.com)

Cerca termini come: "notification", "message", "alert", "ping", "ding"
