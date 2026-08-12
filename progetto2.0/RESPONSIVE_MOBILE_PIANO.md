# Piano: rendere la pagina fruibile da telefono (responsive)

## Contesto
La pagina "Turni Outlet" oggi è online (GitHub Pages, repo `Turni-outlet`) e
funziona bene da desktop. Su telefono la parte debole e' la **tabella turni**:
10 colonne (nome+contratto, 7 giorni, ore tot, recupero) non entrano in uno
schermo stretto e diventano illeggibili.

`style.css` ha gia' una media query `@media (max-width: 768px)` per header,
metriche e pulsanti, ma la tabella resta il punto critico.

## Soluzioni valutate

### Soluzione 1 — Scroll orizzontale fluido (semplice)
Mantenere la tabella com'è, ma su mobile permettere lo scroll orizzontale
lnato (gia' c'e' `overflow-x: auto` su `.turni-section`, da migliorare con
ombre/indicatore e header sticky).
- PRO: pochissimo lavoro, nessun cambio struttura.
- CONTRO: su telefono bisogna scorrere a destra per vedere Ore Tot./Recupero;
  resta scomodo con 7 giorni.

### Soluzione 2 — Layout "scheda risorsa" (piu' leggibile)
Su mobile, invece della tabella larga, mostrare ogni risorsa come una
"card" impilata verticalmente, con i 7 giorni in colonna (Lun: 13-20, Mar: ...).
- PRO: perfettamente leggibile su telefono, niente scroll orizzontale.
- CONTRO: richiede di ricostruire la renderizzazione della tabella in
  `script.js` (populateTable/updateUI) con una vista alternativa mobile,
  oppure via CSS (ma 10 colonne -> card puro-CSS e' complesso). Lavoro medio.

### Soluzione 3 — Tabella compressa (compromesso)
Ridurre al minimo font/padding su mobile, nascondere label meno importanti,
tenere scroll orizzontale ma piu' gestibile.
- PRO: lavoro basso/medio.
- CONTRO: comunque richiede scroll su schermi piccoli.

## Soluzione ritenuta migliore
**Soluzione 2 (layout a schede/card su mobile)**, eventualmente ibridata con
la 1 per il Gantt. Da mobile la leggibilita' conta piu' della compattezza,
e l'utente finale (negozi) usera' molto il telefono.

## Piano di lavoro (repo BETA)
Per non toccare la versione online, si crea una **nuova repo GitHub `beta`**
dove sperimentare il responsive. L'utente la apre dal telefono e la controlla
in tempo reale. Solo quando e' soddisfatto, si merge/porta su `Turni-outlet`.

Passi:
1. Creare repo `beta` su GitHub (public).
2. Copiare i 3 file web (`index.html`, `script.js`, `style.css`) nel repo beta.
3. Lavorare sul responsive in `style.css` (+ eventuali adattamenti in
   `script.js`/`index.html` per la vista mobile a card).
4. Pushare e verificare su telefono via GitHub Pages di `beta`.
5. Una volta ok, riportare le modifiche su `Turni-outlet` (e backup locale).

## Stato
⏳ Da fare. File di pianificazione creato il 16/07/2026. Nessuna modifica
ancora applicata alla pagina.
