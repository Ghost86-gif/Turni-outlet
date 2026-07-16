# Idea di evoluzione: salvataggio turni per negozio + super utente

## Visione generale
La pagina "Turni Outlet" oggi è una web app statica (HTML/CSS/JS) che gira nel
browser: i dati vivono solo in memoria e (al momento) non vengono persistiti.

L'obiettivo futuro è passare a un modello **multi-negozio con ruoli**:

- Ogni **store/negozio** può salvare i propri turni settimanali.
- I turni salvati restano **isolati per negozio**: un negozio vede e modifica
  SOLO i propri dati, mai quelli degli altri.
- I turni devono essere **storici**: ogni settimana salvata resta consultabile
  in seguito (es. "riapri i turni della settimana X per controllarli").
- Esiste un **super utente** (ruolo a parte) che può **visionare gli orari di
  TUTTI i negozi**.

## Requisiti emersi dalla conversazione
- Ogni negozio vede solo i SUOI dati, non quelli degli altri (confermato).
- I negozi devono poter **riaprire e controllare** turni di settimane passate.
- Serve un livello "super utente" con visibilità su tutti i negozi.
- Per ora NON implementiamo nulla: questo file è solo una nota di intenti da
  rileggere quando si parte davvero.

## Cosa implica tecnicamente (da valutare poi)
Per supportare "ogni negozio i suoi + super utente vede tutto" serve necessariamente
un **backend** (un server) che conservi i dati in modo centralizzato, perché:
- il localStorage / i file JSON sul PC di ogni negozio NON permettono al
  super utente di vedere i dati degli altri negozi;
- serve un luogo unico dove i turni di tutti i negozi vengono scritti e letti.

Componenti probabili:
1. **Backend** (es. Node/Python/PHP) con API tipo:
   - `POST /turni`  -> un negozio salva i turni di una settimana
   - `GET /turni?negozio=XXX&settimana=YYY` -> il negozio rilegge i SUOI turni
   - `GET /turni` (solo super utente) -> lista di TUTTI i negozi/settimane
2. **Identificazione negozio**: ogni negozio ha un proprio ID/codice, così i
   dati salvati sono separati.
3. **Autenticazione/ruoli**: distinguere negozio normale da super utente
   (es. login, token, o semplicemente un parametro/codice "admin").
4. **Modello dati**: turni organizzati per `negozio` + `settimana` (es. con
   data inizio settimana o numero), così lo storico è consultabile.

## Stato attuale (riferimento)
- Pagina web: `index.html`, `script.js`, `style.css`
- Export PDF: identico all'interfaccia (senza Gantt), A4, bianco/nero, verde-rosso.
- Pulsanti oggi presenti: 📄 Esporta PDF, 🔄 Azzera Tutto.
- Nessun salvataggio persistente ancora implementato.
- Backup in `backup_base/` e `backup2/`.

## Prossimi passi (quando si decide di partire)
1. Scegliere hosting/stack backend (Node? Python? PHP? hosting gratuito?).
2. Definire schema dati: negozio, settimana, turni.
3. Implementare API salva/carica per negozio + vista super utente.
4. Aggiungere UI: selezione negozio, salvataggio settimanale, storico, login
   super utente.
5. Collegare il tasto "Salva" della pagina alle API.
