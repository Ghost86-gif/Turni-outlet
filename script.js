// === Gestione Turni Outlet – operatori con contratto modificabile ===

const GIORNI = ['Lunedi', 'Martedi', 'Mercoledi', 'Giovedi', 'Venerdi', 'Sabato', 'Domenica'];

// Ore di apertura PV: somma dei giorni (senza pausa). Es. "10-20" x7 = 70h.
function oreAperturaPV(orario) {
    if (!orario) return 0;
    const v = orario.toLowerCase().trim();
    if (v === "") return 0;
    let tot = 0;
    for (const blocco of v.split("/")) {
        const m = blocco.match(/(\d+):?(\d*)\s*-\s*(\d+):?(\d*)/);
        if (!m) continue;
        const h1 = +m[1], min1 = m[2] ? +m[2] : 0;
        const h2 = +m[3], min2 = m[4] ? +m[4] : 0;
        tot += (h2 * 60 + min2 - (h1 * 60 + min1)) / 60;
    }
    return Math.round(tot * 7 * 10) / 10; // 7 giorni
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
});

// Righe editabili (Storico / Pari data / Data) sopra i giorni
const RIGHE_EDITABILI = {
    storico: "storico_settimana",
    paridata: "paridata_settimana",
    data: "date_settimana"
};

function setupDateEditor() {
    const celle = document.querySelectorAll(".data-cell");
    celle.forEach(th => {
        const rowKey = th.dataset.row;
        const campo = RIGHE_EDITABILI[rowKey];
        const i = parseInt(th.dataset.i, 10);
        th.textContent = employeeData.parametri_generali[campo][i] || "";
        th.addEventListener("click", () => {
            const input = document.createElement("input");
            input.value = th.textContent;
            th.innerHTML = "";
            th.appendChild(input);
            input.focus(); input.select();
            const fine = () => {
                const v = input.value.trim();
                employeeData.parametri_generali[campo][i] = v;
                th.textContent = v;
            };
            input.addEventListener("keydown", e => {
                if (e.key === "Enter") { e.preventDefault(); fine(); }
                else if (e.key === "Escape") { th.textContent = employeeData.parametri_generali[campo][i] || ""; }
            });
            input.addEventListener("blur", fine);
        });
    });
}

// Orario PV cliccabile: modifica "10-20" e ricalcola le ore di apertura
function setupPvEditor() {
    const el = document.getElementById("pv-orario");
    if (!el) return;
    el.addEventListener("click", () => {
        const input = document.createElement("input");
        input.value = employeeData.parametri_generali.orario_apertura_pv;
        el.innerHTML = "";
        el.appendChild(input);
        input.focus(); input.select();
        const fine = () => {
            const v = input.value.trim();
            if (v) {
                employeeData.parametri_generali.orario_apertura_pv = v;
                employeeData.parametri_generali.tot_ore_apertura_pv = oreAperturaPV(v);
                updateMetrics();
            }
            el.textContent = employeeData.parametri_generali.orario_apertura_pv;
        };
        input.addEventListener("keydown", e => {
            if (e.key === "Enter") { e.preventDefault(); fine(); }
            else if (e.key === "Escape") { el.textContent = employeeData.parametri_generali.orario_apertura_pv; }
        });
        input.addEventListener("blur", fine);
    });
}

// "10-16:30" o "10-13/15-20" -> ore nette ( -0.5h se blocco >= 6h )
function calcolaOre(orario) {
    if (!orario) return 0;
    const v = orario.toLowerCase().trim();
    if (v === "" || v.includes("riposo")) return 0;
    let tot = 0;
    for (const blocco of v.split("/")) {
        const m = blocco.match(/(\d+):?(\d*)\s*-\s*(\d+):?(\d*)/);
        if (!m) continue;
        const h1 = +m[1], min1 = m[2] ? +m[2] : 0;
        const h2 = +m[3], min2 = m[4] ? +m[4] : 0;
        let ore = (h2 * 60 + min2 - (h1 * 60 + min1)) / 60;
        if (ore >= 6) ore -= 0.5;
        tot += ore;
    }
    return Math.round(tot * 2) / 2;
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
            giallo: "#eab308", rosa: "#ec4899", arancione: "#f97316",
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
    const input = document.createElement("input");
    input.value = emp.nome;
    input.style.width = "150px";
    input.style.fontSize = "0.85em";
    el.innerHTML = "";
    el.appendChild(input);
    input.focus(); input.select();
    const fine = () => {
        const v = input.value.trim();
        if (v) emp.nome = v;
        el.textContent = emp.nome;
    };
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") { e.preventDefault(); fine(); }
        else if (e.key === "Escape") { el.textContent = emp.nome; }
    });
    input.addEventListener("blur", fine);
}

function editContratto(emp, el) {
    const input = document.createElement("input");
    input.value = emp.contratto_ore;
    input.style.width = "50px";
    input.style.fontSize = "0.8em";
    el.innerHTML = "";
    el.appendChild(input);
    input.focus(); input.select();
    const fine = () => {
        const v = parseInt(input.value, 10);
        if (!isNaN(v) && v >= 0) {
            emp.contratto_ore = v;
            emp.recupero = Math.round((emp.totale_ore_lavorate - v) * 10) / 10;
            updateUI();
        }
        el.textContent = emp.contratto_ore + "H";
    };
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") { e.preventDefault(); fine(); }
        else if (e.key === "Escape") { el.textContent = emp.contratto_ore + "H"; }
    });
    input.addEventListener("blur", fine);
}

function startEdit(emp, day, td, span, idx) {
    if (td.querySelector(".shift-input")) return;
    const input = document.createElement("input");
    input.className = "shift-input";
    input.value = span.textContent;
    input.placeholder = "es. 13-20";
    td.innerHTML = "";
    td.appendChild(input);
    input.focus(); input.select();

    let saved = false;
    const save = () => {
        if (saved) return;
        saved = true;
        const newVal = input.value.trim();
        emp.turni[day].orario = newVal;
        emp.turni[day].ore_nette = calcolaOre(newVal);
        ricalcolaOperatore(emp);
        span.textContent = newVal;
        span.classList.toggle("empty", newVal === "");
        updateUI();
        td.replaceChild(span, input);
    };

    input.addEventListener("keydown", e => {
        if (e.key === "Enter") { e.preventDefault(); save(); }
        else if (e.key === "Escape") { td.replaceChild(span, input); }
    });
    input.addEventListener("blur", save);
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
}

function updateMetrics() {
    const totale = employeeData.dipendenti.reduce((s, e) => s + (e.totale_ore_lavorate || 0), 0);
    const apertura = employeeData.parametri_generali.tot_ore_apertura_pv || 70;
    const fte = totale / 39;
    const bdg = employeeData.parametri_generali.fte_bdg || 0;

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

    document.getElementById("coverage-index").textContent = (totale / apertura).toFixed(2);

    const bdgEl = document.getElementById("fte-bdg");
    if (bdgEl && !bdgEl.querySelector("input")) bdgEl.textContent = bdg.toFixed(2);
}

// FTE BDG cliccabile: imposta l'obiettivo FTE
function setupFteBdg() {
    const el = document.getElementById("fte-bdg");
    if (!el) return;
    el.addEventListener("click", () => {
        const input = document.createElement("input");
        input.value = employeeData.parametri_generali.fte_bdg;
        el.innerHTML = "";
        el.appendChild(input);
        input.focus(); input.select();
        const fine = () => {
            const v = parseFloat(input.value.replace(",", "."));
            if (!isNaN(v) && v >= 0) employeeData.parametri_generali.fte_bdg = v;
            el.textContent = (employeeData.parametri_generali.fte_bdg || 0).toFixed(2);
        };
        input.addEventListener("keydown", e => {
            if (e.key === "Enter") { e.preventDefault(); fine(); }
            else if (e.key === "Escape") { el.textContent = (employeeData.parametri_generali.fte_bdg || 0).toFixed(2); }
        });
        input.addEventListener("blur", fine);
    });
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
        .container, header, .metrics, .metric-card, .turni-section,
        .turni-table, .turni-table thead th, .turni-table tbody tr,
        .turni-table tbody tr:nth-child(even), .turni-table tbody tr:hover,
        .resource-name, .shift-cell, .shift-cell.empty, .total-cell,
        .recovery-cell, .date-row th, .data-cell, .nome-op, .contratto-op {
            background: #ffffff !important;
            color: #000000 !important;
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

window.resetTurni = function () {
    if (confirm("Azzerare tutti i turni e i nomi?")) {
        employeeData = datiVuoti();
        populateTable();
        updateMetrics();
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
    const m = (employeeData.parametri_generali.orario_apertura_pv || "10-20").match(/(\d+)\s*-\s*(\d+)/);
    const start = m ? +m[1] : 10;
    const end = m ? +m[2] : 20;
    return { start, end };
}

function drawChart() {
    const gantt = document.getElementById("gantt");
    if (!gantt) return;
    const day = GIORNI[chartDayIndex];
    const { start, end } = getAperturaRange();
    const span = Math.max(1, end - start);

    // Asse ore: stessa struttura delle righe (etichetta + tracciato)
    let axisTicks = "";
    for (let h = start; h <= end; h++) {
        const left = ((h - start) / span) * 100;
        const cls = h === start ? "first" : (h === end ? "last" : "");
        axisTicks += '<span class="' + cls + '" style="left:' + left + '%">' + h + ':00</span>';
    }
    const axis = '<div class="gantt-axis"><div class="gantt-label"></div>' +
                  '<div class="gantt-axis-track">' + axisTicks + '</div></div>';

    let rows = "";
    let attivi = 0;
    employeeData.dipendenti.forEach(emp => {
        const orario = emp.turni[day].orario || "";
        const label = emp.nome + " (" + emp.contratto_ore + "H)";
        if (!orario || orario.toLowerCase().includes("riposo")) {
            rows += '<div class="gantt-row"><div class="gantt-label">' + esc(label) + '</div>' +
                    '<div class="gantt-track"></div></div>';
            return;
        }
        attivi++;
        let bars = "";
        orario.split("/").forEach(blocco => {
            const mm = blocco.match(/(\d+):?(\d*)\s*-\s*(\d+):?(\d*)/);
            if (!mm) return;
            const h1 = +mm[1], h2 = +mm[3];
            const left = ((h1 - start) / span) * 100;
            const width = ((h2 - h1) / span) * 100;
            bars += '<div class="gantt-bar" style="left:' + left + '%;width:' + width + '%" title="' +
                    esc(blocco.trim()) + '">' + esc(blocco.trim()) + '</div>';
        });
        // Griglia verticale delle ore nel tracciato
        let grid = "";
        for (let h = start + 1; h < end; h++) {
            const left = ((h - start) / span) * 100;
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