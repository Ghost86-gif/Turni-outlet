// === Gestione Turni Outlet – operatori con contratto modificabile ===

const GIORNI = ['Lunedi', 'Martedi', 'Mercoledi', 'Giovedi', 'Venerdi', 'Sabato', 'Domenica'];

// Converte gli intervalli in minuti e rifiuta orari incompleti, impossibili o sovrapposti.
function parseTimeBlocks(orario) {
    if (!orario || !String(orario).trim()) return [];
    const v = String(orario).trim().toLowerCase();
    if (v.includes("riposo")) return [];
    const intervalli = [];
    for (const blocco of v.split("/").map(b => b.trim())) {
        const m = blocco.match(/^(\d{1,2})(?::(\d{1,2}))?\s*-\s*(\d{1,2})(?::(\d{1,2}))?$/);
        if (!m) return null;
        const h1 = Number(m[1]), min1 = Number(m[2] || 0);
        const h2 = Number(m[3]), min2 = Number(m[4] || 0);
        if (h1 > 23 || h2 > 24 || min1 > 59 || min2 > 59 || (h2 === 24 && min2 !== 0)) return null;
        const inizio = h1 * 60 + min1, fine = h2 * 60 + min2;
        if (fine <= inizio || fine > 1440) return null;
        intervalli.push({ inizio, fine, etichetta: blocco });
    }
    intervalli.sort((a, b) => a.inizio - b.inizio);
    for (let i = 1; i < intervalli.length; i++) {
        if (intervalli[i].inizio < intervalli[i - 1].fine) return null;
    }
    return intervalli;
}

// Ore di apertura PV settimanali: intervalli giornalieri x 7 giorni.
function oreAperturaPV(orario) {
    const intervalli = parseTimeBlocks(orario);
    if (!intervalli || intervalli.length === 0) return 0;
    const minuti = intervalli.reduce((tot, x) => tot + x.fine - x.inizio, 0);
    return Math.round((minuti / 60) * 7 * 100) / 100;
}

// Dati iniziali: 8 operatori, turni VUOTI, contratti variabili.
function datiVuoti() {
    const contratti = [39, 30, 24, 24, 20, 39, 30, 24]; // esempi di contratti diversi
    const turniVuoti = () => Object.fromEntries(GIORNI.map(d => [d, { orario: "", ore_nette: 0 }]));
    return {
        parametri_generali: {
            orario_apertura_pv: "10-20",
            tot_ore_apertura_pv: oreAperturaPV("10-20"),
            fte_assegnato: 8,
            fte_bdg: 4.00,
            date_settimana: ["", "", "", "", "", "", ""],
            storico_settimana: ["", "", "", "", "", "", ""],
            paridata_settimana: ["", "", "", "", "", "", ""]
        },
        dipendenti: Array.from({ length: 8 }, (_, i) => ({
            nome: "Operatore " + (i + 1),
            contratto_ore: contratti[i] || 39,
            colore_codice: "grigio",
            turni: turniVuoti(),
            totale_ore_lavorate: 0,
            recupero: -(contratti[i] || 39)
        }))
    };
}

let employeeData = null;

document.addEventListener('DOMContentLoaded', () => {
    employeeData = datiVuoti();
    populateTable();
    updateMetrics();
    setupPvEditor();
    setupFteBdg();
    setupDateEditor();
    setupChart();
    renderMobileWeekInfo();
});

// Righe editabili (Storico / Pari data / Data) sopra i giorni
const RIGHE_EDITABILI = {
    storico: "storico_settimana",
    paridata: "paridata_settimana",
    data: "date_settimana"
};

function setupDateEditor() {
    document.querySelectorAll(".data-cell").forEach(th => {
        const campo = RIGHE_EDITABILI[th.dataset.row];
        const i = parseInt(th.dataset.i, 10);
        th.textContent = employeeData.parametri_generali[campo][i] || "";
        th.onclick = () => {
            if (th.querySelector("input")) return;
            const precedente = employeeData.parametri_generali[campo][i] || "";
            const input = document.createElement("input");
            input.value = precedente;
            th.innerHTML = "";
            th.appendChild(input);
            input.focus(); input.select();
            let terminato = false;
            const fine = (annulla = false) => {
                if (terminato) return;
                terminato = true;
                const v = annulla ? precedente : input.value.trim();
                employeeData.parametri_generali[campo][i] = v;
                th.textContent = v;
                renderMobileWeekInfo();
                setupChart();
            };
            input.addEventListener("keydown", e => {
                if (e.key === "Enter") { e.preventDefault(); fine(false); }
                else if (e.key === "Escape") { e.preventDefault(); fine(true); }
            });
            input.addEventListener("blur", () => fine(false));
        };
    });
}

// Orario PV cliccabile: modifica "10-20" e ricalcola le ore di apertura
function setupPvEditor() {
    const el = document.getElementById("pv-orario");
    if (!el) return;
    el.onclick = () => {
        if (el.querySelector("input")) return;
        const precedente = employeeData.parametri_generali.orario_apertura_pv;
        const input = document.createElement("input");
        input.value = precedente;
        el.innerHTML = "";
        el.appendChild(input);
        input.focus(); input.select();
        let terminato = false;
        const fine = (annulla = false) => {
            if (terminato) return;
            terminato = true;
            const v = input.value.trim();
            const intervalli = parseTimeBlocks(v);
            if (!annulla && v && intervalli && intervalli.length) {
                employeeData.parametri_generali.orario_apertura_pv = v;
                employeeData.parametri_generali.tot_ore_apertura_pv = oreAperturaPV(v);
            } else if (!annulla && v !== precedente) {
                alert("Orario non valido. Usa un formato come 10-20 oppure 10-13/15-20.");
            }
            el.textContent = employeeData.parametri_generali.orario_apertura_pv;
            updateMetrics();
            drawChart();
        };
        input.addEventListener("keydown", e => {
            if (e.key === "Enter") { e.preventDefault(); fine(false); }
            else if (e.key === "Escape") { e.preventDefault(); fine(true); }
        });
        input.addEventListener("blur", () => fine(false));
    };
}

// Pausa di 30 minuti una sola volta se il totale giornaliero è almeno 7 ore.
function calcolaOre(orario) {
    const intervalli = parseTimeBlocks(orario);
    if (!intervalli || intervalli.length === 0) return 0;
    let minutiTotali = intervalli.reduce((tot, x) => tot + x.fine - x.inizio, 0);
    if (minutiTotali >= 7 * 60) minutiTotali -= 30;
    return Math.round((minutiTotali / 60) * 100) / 100;
}

function formatRecupero(val) {
    if (isNaN(val)) return "0.0";
    return val >= 0 ? "+" + val.toFixed(1) : val.toFixed(1);
}

function ricalcolaOperatore(emp) {
    const tot = Object.values(emp.turni).reduce((s, t) => s + (t.ore_nette || 0), 0);
    emp.totale_ore_lavorate = Math.round(tot * 10) / 10;
    emp.recupero = Math.round((emp.totale_ore_lavorate - emp.contratto_ore) * 10) / 10;
}

function populateTable() {
    const tbody = document.getElementById("turni-body");
    tbody.innerHTML = "";

    employeeData.dipendenti.forEach((emp, i) => {
        const tr = document.createElement("tr");

        // Prima colonna: NOME (cliccabile) + CONTRATTO ORE (cliccabile)
        const colori = {
            giallo: "#f0e68c", rosa: "#f8bbd0", arancione: "#f97316",
            azzurro: "#06b6d4", verde: "#22c55e", blu: "#3b82f6",
            marrone: "#a16207", grigio: "#94a3b8"
        };
        const colore = colori[emp.colore_codice] || "#94a3b8";

        const th = document.createElement("th");
        th.className = "resource-name";
        th.style.borderLeft = "4px solid " + colore;
        th.innerHTML = "";
        const nomeSpan = document.createElement("div");
        nomeSpan.className = "nome-op";
        nomeSpan.textContent = emp.nome;
        nomeSpan.title = "Clicca per modificare il nome";
        nomeSpan.addEventListener("click", () => editNome(emp, nomeSpan));
        const contrSpan = document.createElement("div");
        contrSpan.className = "contratto-op";
        contrSpan.textContent = emp.contratto_ore + "H";
        contrSpan.title = "Clicca per modificare le ore di contratto";
        contrSpan.addEventListener("click", () => editContratto(emp, contrSpan));
        th.appendChild(nomeSpan);
        th.appendChild(contrSpan);
        tr.appendChild(th);

        // Turni settimanali
        GIORNI.forEach(day => {
            const td = document.createElement("td");
            const span = document.createElement("span");
            span.className = "shift-cell";
            span.textContent = emp.turni[day].orario || "";
            if (!emp.turni[day].orario) span.classList.add("empty");
            span.addEventListener("click", () => startEdit(emp, day, td, span, i));
            td.appendChild(span);
            tr.appendChild(td);
        });

        const tdTot = document.createElement("td");
        tdTot.className = "total-cell";
        tdTot.textContent = emp.totale_ore_lavorate.toFixed(1);
        tr.appendChild(tdTot);

        const tdRec = document.createElement("td");
        tdRec.className = "recovery-cell " + (emp.recupero >= 0 ? "recovery-positive" : "recovery-negative");
        tdRec.textContent = formatRecupero(emp.recupero);
        tr.appendChild(tdRec);

        tbody.appendChild(tr);
    });
}

function editNome(emp, el) {
    if (el.querySelector("input")) return;
    const precedente = emp.nome;
    const input = document.createElement("input");
    input.value = precedente;
    input.style.width = "150px";
    input.style.fontSize = "0.85em";
    el.innerHTML = "";
    el.appendChild(input);
    input.focus(); input.select();
    let terminato = false;
    const fine = (annulla = false) => {
        if (terminato) return;
        terminato = true;
        const v = annulla ? precedente : input.value.trim();
        if (v) emp.nome = v;
        el.textContent = emp.nome;
        updateUI();
    };
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") { e.preventDefault(); fine(false); }
        else if (e.key === "Escape") { e.preventDefault(); fine(true); }
    });
    input.addEventListener("blur", () => fine(false));
}

function editContratto(emp, el) {
    if (el.querySelector("input")) return;
    const precedente = emp.contratto_ore;
    const input = document.createElement("input");
    input.value = precedente;
    input.style.width = "60px";
    input.style.fontSize = "0.8em";
    input.inputMode = "numeric";
    el.innerHTML = "";
    el.appendChild(input);
    input.focus(); input.select();
    let terminato = false;
    const fine = (annulla = false) => {
        if (terminato) return;
        terminato = true;
        const testo = input.value.trim(), v = Number(testo);
        if (!annulla && testo !== "" && Number.isFinite(v) && v >= 0 && Number.isInteger(v)) emp.contratto_ore = v;
        el.textContent = emp.contratto_ore + "H";
        updateUI();
    };
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") { e.preventDefault(); fine(false); }
        else if (e.key === "Escape") { e.preventDefault(); fine(true); }
    });
    input.addEventListener("blur", () => fine(false));
}

function startEdit(emp, day, td, span) {
    if (td.querySelector(".shift-input")) return;
    const precedente = emp.turni[day].orario || "";
    const input = document.createElement("input");
    input.className = "shift-input";
    input.value = precedente;
    input.placeholder = "es. 13-20";
    td.innerHTML = "";
    td.appendChild(input);
    input.focus(); input.select();

    let terminato = false;
    const save = (annulla = false) => {
        if (terminato) return;
        terminato = true;
        const newVal = annulla ? precedente : input.value.trim();
        if (!annulla && newVal && parseTimeBlocks(newVal) === null) {
            alert("Turno non valido. Usa ad esempio 10-16:30 oppure 10-13/15-20. Controlla che gli intervalli non si sovrappongano.");
            td.replaceChild(span, input);
            return;
        }
        emp.turni[day].orario = newVal;
        emp.turni[day].ore_nette = calcolaOre(newVal);
        ricalcolaOperatore(emp);
        span.textContent = newVal;
        span.classList.toggle("empty", newVal === "");
        updateUI();
        if (input.parentNode === td) td.replaceChild(span, input);
    };

    input.addEventListener("keydown", e => {
        if (e.key === "Enter") { e.preventDefault(); save(false); }
        else if (e.key === "Escape") { e.preventDefault(); save(true); }
    });
    input.addEventListener("blur", () => save(false));
}

function updateUI() {
    employeeData.dipendenti.forEach((emp, i) => {
        const tr = document.querySelectorAll("#turni-body tr")[i];
        if (!tr) return;
        const nomeSpan = tr.children[0].querySelector(".nome-op");
        const contrSpan = tr.children[0].querySelector(".contratto-op");
        if (nomeSpan) nomeSpan.textContent = emp.nome;
        if (contrSpan) contrSpan.textContent = emp.contratto_ore + "H";
        GIORNI.forEach((day, j) => {
            const span = tr.children[j + 1].querySelector(".shift-cell");
            if (span) {
                span.textContent = emp.turni[day].orario || "";
                span.classList.toggle("empty", !emp.turni[day].orario);
            }
        });
        const tdTot = tr.children[tr.children.length - 2];
        const tdRec = tr.children[tr.children.length - 1];
        tdTot.textContent = emp.totale_ore_lavorate.toFixed(1);
        tdRec.textContent = formatRecupero(emp.recupero);
        tdRec.className = "recovery-cell " + (emp.recupero >= 0 ? "recovery-positive" : "recovery-negative");
    });
    updateMetrics();
    drawChart();
    renderMobileWeekInfo();
}

// Riepilogo compatto delle date, visibile solo nella versione per telefono.
function renderMobileWeekInfo() {
    const contenitore = document.getElementById("mobile-week-info");
    if (!contenitore) return;
    contenitore.innerHTML = "";
    const parametri = employeeData.parametri_generali;
    const righe = [
        ["Storico", parametri.storico_settimana || []],
        ["Pari data", parametri.paridata_settimana || []],
        ["Data", parametri.date_settimana || []]
    ];

    GIORNI.forEach((giorno, i) => {
        const valori = righe.filter(([, dati]) => dati[i]).map(([etichetta, dati]) => [etichetta, dati[i]]);
        if (valori.length === 0) return;
        const scheda = document.createElement("div");
        scheda.className = "mobile-week-day";
        const titolo = document.createElement("strong");
        titolo.textContent = giorno.slice(0, 3);
        scheda.appendChild(titolo);
        valori.forEach(([etichetta, valore]) => {
            const riga = document.createElement("span");
            riga.textContent = etichetta + ": " + valore;
            scheda.appendChild(riga);
        });
        contenitore.appendChild(scheda);
    });
}

function updateMetrics() {
    const totale = employeeData.dipendenti.reduce((s, e) => s + (Number(e.totale_ore_lavorate) || 0), 0);
    const apertura = Math.max(0, Number(employeeData.parametri_generali.tot_ore_apertura_pv) || 0);
    const fte = totale / 39;
    const bdg = Math.max(0, Number(employeeData.parametri_generali.fte_bdg) || 0);

    document.getElementById("total-hours").textContent = totale.toFixed(1);

    const fteEl = document.getElementById("fte-value");
    fteEl.textContent = fte.toFixed(2);
    // Colore FTE vs BDG: > BDG rosso; tra BDG-0.5 e BDG giallo; <= BDG-0.6 verde
    if (fte > bdg) {
        fteEl.style.color = "#f87171"; // rosso
    } else if (fte >= bdg - 0.5) {
        fteEl.style.color = "#fbbf24"; // giallo
    } else {
        fteEl.style.color = "#4ade80"; // verde
    }

    document.getElementById("coverage-index").textContent = (apertura > 0 ? totale / apertura : 0).toFixed(2);

    const bdgEl = document.getElementById("fte-bdg");
    if (bdgEl && !bdgEl.querySelector("input")) bdgEl.textContent = bdg.toFixed(2);
}

// FTE BDG cliccabile: imposta l'obiettivo FTE
function setupFteBdg() {
    const el = document.getElementById("fte-bdg");
    if (!el) return;
    el.onclick = () => {
        if (el.querySelector("input")) return;
        const precedente = employeeData.parametri_generali.fte_bdg;
        const input = document.createElement("input");
        input.value = precedente;
        el.innerHTML = "";
        el.appendChild(input);
        input.focus(); input.select();
        let terminato = false;
        const fine = (annulla = false) => {
            if (terminato) return;
            terminato = true;
            const v = parseFloat(input.value.replace(",", "."));
            if (!annulla && !isNaN(v) && v >= 0 && Number.isFinite(v)) employeeData.parametri_generali.fte_bdg = v;
            el.textContent = (employeeData.parametri_generali.fte_bdg || 0).toFixed(2);
            updateMetrics();
        };
        input.addEventListener("keydown", e => {
            if (e.key === "Enter") { e.preventDefault(); fine(false); }
            else if (e.key === "Escape") { e.preventDefault(); fine(true); }
        });
        input.addEventListener("blur", () => fine(false));
    };
}

window.exportPDF = function () {
    if (!window.jspdf || !window.jspdf.jsPDF) { alert("Libreria PDF non caricata. Verifica la connessione."); return; }
    if (typeof html2canvas === "undefined") { alert("Libreria html2canvas non caricata. Verifica la connessione."); return; }
    const { jsPDF } = window.jspdf;

    // Clona il container, rimuove le sezioni non utili nel PDF
    const src = document.querySelector(".container");
    const clone = src.cloneNode(true);
    const chart = clone.querySelector(".chart-section");
    if (chart) chart.remove();            // Copertura Settimanale (Gantt)
    const actions = clone.querySelector(".actions");
    if (actions) actions.remove();        // Esporta PDF / Azzera / Invia Mail
    const footer = clone.querySelector("footer");
    if (footer) footer.remove();          // Footer

    // Forza sfondo bianco + testo nero ovunque (tranne i dati verde/rosso)
    const style = document.createElement("style");
    style.textContent = `
        /* Set background and text color for all elements */
        .container, header, .metrics, .metric-card, .turni-section,
        .turni-table, .turni-table thead th, .turni-table tbody tr,
        .turni-table tbody tr:nth-child(even), .turni-table tbody tr:hover,
        .resource-name, .shift-cell, .shift-cell.empty, .total-cell,
        .recovery-cell, .date-row th, .data-cell, .nome-op, .contratto-op {
            background: #ffffff !important;
            color: #000000 !important;
        }

        /* Set border color for all elements except .resource-name */
        .container, header, .metrics, .metric-card, .turni-section,
        .turni-table, .turni-table thead th, .turni-table tbody tr,
        .turni-table tbody tr:nth-child(even), .turni-table tbody tr:hover,
        .shift-cell, .shift-cell.empty, .total-cell,
        .recovery-cell, .date-row th, .data-cell, .nome-op, .contratto-op {
            border-color: #cccccc !important;
        }

        header {
            background: #ffffff !important;
            border-bottom: 2px solid #000000 !important;
            padding: 6px 16px !important;
        }
        header h1 { font-size: 1.1em !important; color: #000000 !important; }
        header p, .pv-edit, #pv-orario { color: #000000 !important; font-size: 0.85em !important; }
        .metric-value { color: #000000 !important; font-size: 1.8em !important; }
        .metric-card::after { display: none !important; }
        .recovery-positive { color: #15803d !important; }   /* verde */
        .recovery-negative { color: #b91c1c !important; }   /* rosso */
        .total-cell { color: #15803d !important; background: #ffffff !important; }
        .contratto-op, #pv-orario, .data-cell { color: #000000 !important; }
        .turni-table thead th { color: #000000 !important; }
        .turni-table thead tr:not(.date-row) th:first-child,
        .turni-table thead tr:nth-child(-n+3) th { padding: 3px 6px !important; font-size: 0.85em !important; }
        .data-cell { font-size: 0.85em !important; }
        .shift-cell.empty { color: #999999 !important; }

        /* Intestazioni Storico e Pari data: rosa tenue, separate dalle righe sottostanti. */
        .turni-table thead tr:nth-child(1) > *,
        .turni-table thead tr:nth-child(2) > * {
            background: #fde8e8 !important;
        }
        .turni-table thead tr:nth-child(2) > *,
        .turni-table thead tr:nth-child(3) > * {
            border-bottom: 3px solid #d9a6a6 !important;
        }

        /* Una tonalita' pastello per ogni operatore: solo nel PDF. */
        .turni-table tbody tr:nth-child(1) > * ,
        .turni-table tbody tr:nth-child(1) .shift-cell { background: #fff9e8 !important; }
        .turni-table tbody tr:nth-child(2) > * ,
        .turni-table tbody tr:nth-child(2) .shift-cell { background: #fff0f4 !important; }
        .turni-table tbody tr:nth-child(3) > * ,
        .turni-table tbody tr:nth-child(3) .shift-cell { background: #fff3e8 !important; }
        .turni-table tbody tr:nth-child(4) > * ,
        .turni-table tbody tr:nth-child(4) .shift-cell { background: #edf8ff !important; }
        .turni-table tbody tr:nth-child(5) > * ,
        .turni-table tbody tr:nth-child(5) .shift-cell { background: #eef9f0 !important; }
        .turni-table tbody tr:nth-child(6) > * ,
        .turni-table tbody tr:nth-child(6) .shift-cell { background: #f4efff !important; }
        .turni-table tbody tr:nth-child(7) > * ,
        .turni-table tbody tr:nth-child(7) .shift-cell { background: #fff1e8 !important; }
        .turni-table tbody tr:nth-child(8) > * ,
        .turni-table tbody tr:nth-child(8) .shift-cell { background: #eef5ff !important; }
    `;
    clone.appendChild(style);

    // Contenitore off-screen per il render
    const holder = document.createElement("div");
    holder.style.position = "fixed";
    holder.style.left = "-10000px";
    holder.style.top = "0";
    holder.style.width = src.offsetWidth + "px";
    holder.style.background = "#ffffff";
    holder.style.padding = "0";
    holder.appendChild(clone);
    document.body.appendChild(holder);

    html2canvas(clone, { backgroundColor: "#ffffff", scale: 2, logging: false, windowWidth: src.offsetWidth }).then(canvas => {
        document.body.removeChild(holder);
        const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
        const PW = doc.internal.pageSize.getWidth();
        const PH = doc.internal.pageSize.getHeight();
        const imgW = PW;
        const imgH = canvas.height * (imgW / canvas.width);

        let heightLeft = imgH;
        let position = 0;
        const imgData = canvas.toDataURL("image/jpeg", 0.95);

        doc.addImage(imgData, "JPEG", 0, position, imgW, imgH);
        heightLeft -= PH;
        while (heightLeft > 0) {
            position -= PH;
            doc.addPage();
            doc.addImage(imgData, "JPEG", 0, position, imgW, imgH);
            heightLeft -= PH;
        }
        doc.save("turni_outlet.pdf");
    }).catch(err => {
        if (holder.parentNode) document.body.removeChild(holder);
        alert("Errore nella generazione del PDF: " + err.message);
    });
};

function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Salvataggio locale: il browser scarica un file JSON che puo' essere riaperto in seguito.
window.saveSchedule = function () {
    const suggerito = "turni-outlet-" + new Date().toISOString().slice(0, 10);
    const richiesto = prompt("Nome del file di salvataggio:", suggerito);
    if (richiesto === null) return;

    const base = richiesto.trim() || suggerito;
    const nome = base.replace(/[\\\\/:*?"<>|]/g, "-").replace(/\.json$/i, "") + ".json";
    const contenuto = {
        versione: 1,
        salvato_il: new Date().toISOString(),
        dati: employeeData
    };
    const blob = new Blob([JSON.stringify(contenuto, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nome;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

window.triggerLoadSchedule = function () {
    document.getElementById("schedule-file-input").click();
};

window.loadSchedule = function (input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const salvato = JSON.parse(reader.result);
            const dati = salvato.dati || salvato;
            if (!dati || !dati.parametri_generali || !Array.isArray(dati.dipendenti)) {
                throw new Error("Il file non contiene una pianificazione valida.");
            }

            dati.dipendenti.forEach(emp => {
                if (!emp.turni) throw new Error("Il file contiene un operatore senza turni.");
                GIORNI.forEach(day => {
                    if (!emp.turni[day]) emp.turni[day] = { orario: "", ore_nette: 0 };
                    emp.turni[day].orario = String(emp.turni[day].orario || "");
                    emp.turni[day].ore_nette = calcolaOre(emp.turni[day].orario);
                });
                emp.nome = String(emp.nome || "Operatore");
                emp.contratto_ore = Number(emp.contratto_ore) || 0;
                ricalcolaOperatore(emp);
            });

            const parametri = dati.parametri_generali;
            ["date_settimana", "storico_settimana", "paridata_settimana"].forEach(campo => {
                if (!Array.isArray(parametri[campo])) parametri[campo] = ["", "", "", "", "", "", ""];
            });
            parametri.orario_apertura_pv = String(parametri.orario_apertura_pv || "10-20");
            parametri.tot_ore_apertura_pv = oreAperturaPV(parametri.orario_apertura_pv);
            parametri.fte_bdg = Number(parametri.fte_bdg) || 0;

            employeeData = dati;
            populateTable();
            setupDateEditor();
            updateMetrics();
            setupChart();
            renderMobileWeekInfo();
            alert("Pianificazione caricata con successo.");
        } catch (errore) {
            alert("Impossibile aprire il file: " + errore.message);
        } finally {
            input.value = "";
        }
    };
    reader.readAsText(file);
};

window.resetTurni = function () {
    if (confirm("Azzerare tutti i turni e i nomi?")) {
        employeeData = datiVuoti();
        populateTable();
        updateMetrics();
        setupChart();
        renderMobileWeekInfo();
    }
};

function pad(s, n) { s = String(s); return s.length >= n ? s : s + " ".repeat(n - s.length); }

// === Grafico copertura (Gantt) ===
let chartDayIndex = 0; // Lunedi di default

function setupChart() {
    const picker = document.getElementById("day-picker");
    picker.innerHTML = "";
    GIORNI.forEach((g, i) => {
        const b = document.createElement("button");
        b.textContent = g.slice(0, 3) + (employeeData.parametri_generali.date_settimana[i] ? " " + employeeData.parametri_generali.date_settimana[i] : "");
        b.className = (i === chartDayIndex) ? "active" : "";
        b.addEventListener("click", () => {
            chartDayIndex = i;
            picker.querySelectorAll("button").forEach((x, j) => x.className = (j === i ? "active" : ""));
            drawChart();
        });
        picker.appendChild(b);
    });
    drawChart();
}

function getAperturaRange() {
    const intervalli = parseTimeBlocks(employeeData.parametri_generali.orario_apertura_pv || "10-20");
    if (!intervalli || !intervalli.length) return { start: 600, end: 1200 };
    return {
        start: Math.min(...intervalli.map(x => x.inizio)),
        end: Math.max(...intervalli.map(x => x.fine))
    };
}

function formatOra(minuti) {
    const h = Math.floor(minuti / 60);
    const m = minuti % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

function drawChart() {
    const gantt = document.getElementById("gantt");
    if (!gantt || !employeeData) return;
    const day = GIORNI[chartDayIndex];
    const apertura = getAperturaRange();
    let start = apertura.start, end = apertura.end;

    // Include eventuali turni fuori dall'orario PV per non tagliarli nel grafico.
    employeeData.dipendenti.forEach(emp => {
        const intervalli = parseTimeBlocks(emp.turni[day]?.orario || "");
        if (!intervalli) return;
        intervalli.forEach(x => {
            start = Math.min(start, x.inizio);
            end = Math.max(end, x.fine);
        });
    });
    const span = Math.max(1, end - start);
    const tickSet = new Set([start, end]);
    for (let t = Math.ceil(start / 60) * 60; t < end; t += 60) tickSet.add(t);

    let axisTicks = "";
    [...tickSet].sort((a, b) => a - b).forEach(t => {
        const left = ((t - start) / span) * 100;
        const cls = t === start ? "first" : (t === end ? "last" : "");
        axisTicks += '<span class="' + cls + '" style="left:' + left + '%">' + formatOra(t) + '</span>';
    });
    const axis = '<div class="gantt-axis"><div class="gantt-label"></div>' +
                 '<div class="gantt-axis-track">' + axisTicks + '</div></div>';

    let rows = "";
    let attivi = 0;
    employeeData.dipendenti.forEach(emp => {
        const orario = emp.turni[day]?.orario || "";
        const label = emp.nome + " (" + emp.contratto_ore + "H)";
        const intervalli = parseTimeBlocks(orario);

        if (!orario || (intervalli && intervalli.length === 0)) {
            rows += '<div class="gantt-row"><div class="gantt-label">' + esc(label) + '</div>' +
                    '<div class="gantt-track"></div></div>';
            return;
        }

        attivi++;
        let bars = "";
        if (intervalli) {
            intervalli.forEach(x => {
                const left = ((x.inizio - start) / span) * 100;
                const width = ((x.fine - x.inizio) / span) * 100;
                bars += '<div class="gantt-bar" style="left:' + left + '%;width:' + width + '%" title="' +
                    esc(x.etichetta) + '">' + esc(x.etichetta) + '</div>';
            });
        } else {
            bars = '<div class="gantt-invalid">Orario non valido</div>';
        }

        let grid = "";
        for (let t = Math.ceil(start / 60) * 60; t < end; t += 60) {
            if (t <= start) continue;
            const left = ((t - start) / span) * 100;
            grid += '<div style="position:absolute;left:' + left + '%;top:0;bottom:0;width:1px;background:rgba(255,255,255,.08)"></div>';
        }
        rows += '<div class="gantt-row"><div class="gantt-label">' + esc(label) + '</div>' +
                '<div class="gantt-track">' + grid + bars + '</div></div>';
    });

    gantt.innerHTML = axis + (attivi === 0
        ? '<div class="gantt-empty">Nessun turno inserito per ' + day + '.</div>'
        : rows);
}

window.closeModal = function () {
    document.getElementById("modal").style.display = "none";
};
