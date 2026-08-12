# Pubblicazione su GitHub + GitHub Pages

## Obiettivo
Rendere la pagina "Turni Outlet" raggiungibile da qualsiasi negozio via web.

## Prerequisiti fatti
- Account GitHub creato: **Ghost86-gif**
- Git installato su Windows: **2.55.0.windows.3**
  - Percorso: `C:\Program Files\Git\cmd\git.exe`
  - Nota: dopo l'installazione serve riavviare PowerShell, altrimenti `git`
    non è nel PATH della sessione. In alternativa si usa il percorso completo.

## Configurazione Git (globale)
Eseguita una volta sola:
```
git config --global user.name "Ghost86-gif"
git config --global user.email "Ghost86-gif@users.noreply.github.com"
git config --global init.defaultBranch main
```

## Repository
- URL repo: **https://github.com/Ghost86-gif/Turni-outlet.git**
- Visibilità: **Public** (necessaria per GitHub Pages sul piano free)

## File caricati (solo i 3 della pagina web)
- `index.html`
- `script.js`
- `style.css`

## File esclusi / rimossi
Inizialmente erano stati caricati anche `.gitignore`, `IDEA_SALVATAGGIO_TURNI.md`
e `README.md`, poi rimossi su richiesta per lasciare online SOLO i 3 file web.
Sono stati cancellati dal tracking e dal repo remoto con `git rm --cached` + commit + push.

⚠️ NOTA: il `.gitignore` è stato rimosso. Se in futuro si rifa' `git add .` nella
cartella del progetto, le cartelle di backup (`backup_base/`, `backup2/`,
`progetto_estetico/`, `file/`) e i PDF verrebbero ricaricati su GitHub.
Da ricreare prima di un prossimo push se serve escluderli.

## Comandi usati (riepilogo)
Dalla cartella `C:\Users\fastm\Cloude gratis`:
```
git init
git add index.html script.js style.css
git commit -m "Prima versione pagina turni outlet"
git remote add origin https://github.com/Ghost86-gif/Turni-outlet.git
git branch -M main
git push -u origin main
```
Rimozione file extra:
```
git rm --cached .gitignore IDEA_SALVATAGGIO_TURNI.md README.md
git commit -m "Rimossi file non necessari, lascio solo i 3 file web"
git push origin main
```

## Attivazione GitHub Pages (fatta da interfaccia web)
1. Repo -> tab **Settings**
2. Colonna sinistra -> **Pages**
3. Build and deployment -> Branch: **main**, cartella **/ (root)**
4. **Save**

## URL finale (online)
**https://ghost86-git.github.io/Turni-outlet/**  [da verificare con l'URL esatto]
Correggere con: **https://ghost86-gif.github.io/Turni-outlet/**

> Nota: su GitHub Pages la pagina e' STATICA. I dati restano solo nel browser di
> ciascun negozio (nessun salvataggio condiviso). Per il salvataggio per-negozio
> + super utente (vedi `IDEA_SALVATAGGIO_TURNI.md`) servira' un backend.

## Stato
✅ Pagina pubblicata e online al 16/07/2026.
