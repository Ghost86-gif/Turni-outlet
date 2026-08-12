# Progetto: Gestione Turni Outlet (Orario 10-20)

![Tabella dei Turni Originale](file:///c:/Users/fastm/Cloude%20gratis/file/tabella_turni.png)


Questo repository contiene la base dati e le specifiche per lo sviluppo di un'applicazione web o desktop di **gestione dei turni per il personale di un outlet**.

L'obiettivo è automatizzare la pianificazione settimanale, calcolare le ore lavorate nette, il recupero ore (straordinario) e calcolare gli indici di copertura del Punto Vendita (PV).

---

## 📅 Dati estratti dalla tabella (Luglio - Settimana dal 13 al 19)

### Turni Settimanali del Personale

| Risorsa (Contratto) | Lun 13 | Mar 14 | Mer 15 | Gio 16 | Ven 17 | Sab 18 | Dom 19 | Ore Tot. | Recupero |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **MICHELE SPECCHIO (39H)** | 10-16:30 *(6h)* | 13-19 *(5.5h)* | Riposo | 13-20 *(6.5h)* | 13-20 *(6.5h)* | 13-20 *(6.5h)* | 10-13/15-20 *(8h)* | **39** | **0** |
| **GLORIA CROCINI (30H)** | 12-19 *(6.5h)* | 10-17 *(6.5h)* | 12-19 *(6.5h)* | 10-17 *(6.5h)* | Riposo | 10-17 *(6.5h)* | 10-17 *(6.5h)* | **39** | **+9** |
| **SILVIA VILELLA (24H)** | 16-20 *(4h)* | Riposo | 16-20 *(4h)* | Riposo | 10-14 *(4h)* | 13-20 *(6.5h)* | 13-20 *(6.5h)* | **25** | **+1** |
| **SARA MASTRANGELO (24H)** | Riposo | 16-20 *(4h)* | 10-14 *(4h)* | 16-20 *(4h)* | 16-20 *(4h)* | 10-14 *(4h)* | 15-19 *(4h)* | **24** | **0** |
| **DA ASSEGNARE (24H)** | Riposo | Riposo | Riposo | Riposo | Riposo | Riposo | Riposo | **0** | **-24** |

### Metriche Generali e Copertura

*   **Totale Ore Risorse:** `127 ore` (Somma delle ore lavorate da tutte le risorse attive)
*   **Totali FTE (Full Time Equivalent):** `3,26` (calcolato su base 39 ore: `127 / 39 = 3.256`)
*   **FTE Assegnato:** `4` (Numero contratti attivi)
*   **Totale Ore Apertura PV:** `70 ore` (Apertura 10-20 per 7 giorni = 70 ore)
*   **Indice Copertura:** `1,81` (Rapporto tra Ore Risorse e Ore Apertura PV: `127 / 70 = 1.814`)

---

## 🛠 Struttura Dati
Tutti i dati storici e correnti di questa tabella sono stati salvati in formato strutturato all'interno del file **[`dati_turni.json`](file:///c:/Users/fastm/Cloude%20gratis/dati_turni.json)** per essere letti facilmente da qualsiasi programma.

---

## 🚀 Idee per lo Sviluppo con Claude Code

Puoi chiedere a Claude Code di sviluppare diverse funzionalità basandoti su questa base. Ecco alcune idee:

1. **Interfaccia Grafica Web (HTML/JS + CSS Sleek)**:
   * Chiedi a Claude di creare una bellissima griglia interattiva (dashboard) per visualizzare questi turni.
   * Rendi le celle cliccabili ed editabili per modificare gli orari dei turni in tempo reale.
2. **Calcolatore automatico**:
   * Sviluppa un algoritmo che calcola automaticamente le ore nette (es. sottraendo le pause pranzo o cena) e calcola il "Recupero" rispetto alle ore del contratto.
   * Calcolo dinamico degli indicatori (Ore Risorse, FTE, Copertura).
3. **Esportazione**:
   * Aggiungi pulsanti per scaricare la griglia dei turni in formato Excel (CSV) o generare un report stampabile in PDF.
4. **Verifiche di Conformità (Validatore)**:
   * Controlla che nessun dipendente superi il limite massimo di ore giornaliere (es. 8 o 10 ore).
   * Segnala se un dipendente non ha i giorni di riposo minimi previsti dal contratto.

---

*Nota: per far leggere questi file a Claude Code, ti basterà fare domande tipo: "Leggi il file `dati_turni.json` e il `README.md` nella cartella e creami una pagina web interattiva per gestire questi turni".*
