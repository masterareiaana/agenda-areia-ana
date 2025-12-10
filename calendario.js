// URL do nó "eventos" no Realtime Database (REST API)
const DB_URL = "https://agenda-areia-ana-default-rtdb.firebaseio.com/eventos.json";

// Eventos da empresa (vêm do Firebase)
let eventosGlobal = [];
// Feriados nacionais calculados por ano
let feriados = [];

let mesAtual;
let anoAtual;
let modoAtual = "mes";   // "mes", "ano", "semestre", "dia"
let semestreAtual = 1;   // 1º ou 2º semestre

const mesesNomes = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

/* -------- FERIADOS FIXOS (nacionais) ---------- */
function gerarFeriadosParaAno(ano) {
  const fixos = [
    { mes: 1,  dia: 1,  titulo: "Confraternização Universal" },
    { mes: 4,  dia: 21, titulo: "Tiradentes" },
    { mes: 5,  dia: 1,  titulo: "Dia do Trabalhador" },
    { mes: 9,  dia: 7,  titulo: "Independência do Brasil" },
    { mes: 10, dia: 12, titulo: "Nossa Senhora Aparecida" },
    { mes: 11, dia: 2,  titulo: "Finados" },
    { mes: 11, dia: 15, titulo: "Proclamação da República" },
    { mes: 12, dia: 25, titulo: "Natal" }
  ];

  feriados = fixos.map(f => ({
    data: `${ano}-${pad2(f.mes)}-${pad2(f.dia)}`,
    titulo: f.titulo,
    cor: "#808080",
    tipo: "feriado"
  }));
}

/* -------- CARREGA EVENTOS DO FIREBASE ---------- */
async function carregarEventosDoFirebase() {
  try {
    const resp = await fetch(DB_URL);
    const dados = await resp.json();
    // se ainda não existe, fica []
    eventosGlobal = Array.isArray(dados) ? dados : [];
  } catch (e) {
    console.warn("Não foi possível carregar eventos do Firebase.", e);
    eventosGlobal = [];
  }
}

/* -------- INIT ---------- */
async function inicializarCalendario() {
  await carregarEventosDoFirebase();

  const hoje = new Date();
  mesAtual = hoje.getMonth();        // 0..11
  anoAtual = hoje.getFullYear();

  gerarFeriadosParaAno(anoAtual);
  preencherSelectsAnoMes();

  const dateInput = document.getElementById("datePicker");
  if (dateInput) {
    dateInput.value = hoje.toISOString().slice(0, 10);
  }

  alterarModo();
  renderizarLegenda();
}

/* -------- SELECTs ANO / MÊS ---------- */

function preencherSelectsAnoMes() {
  const yearSel = document.getElementById("yearSelect");
  const monthSel = document.getElementById("monthSelect");
  if (!yearSel || !monthSel) return;

  yearSel.innerHTML = "";
  for (let y = anoAtual - 2; y <= anoAtual + 2; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    if (y === anoAtual) opt.selected = true;
    yearSel.appendChild(opt);
  }

  monthSel.innerHTML = "";
  mesesNomes.forEach((m, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = m;
    if (idx === mesAtual) opt.selected = true;
    monthSel.appendChild(opt);
  });

  atualizarVisibilidadeSelectMes();
}

function atualizarVisibilidadeSelectMes() {
  const wrapper = document.getElementById("monthLabelWrapper");
  if (!wrapper) return;
  wrapper.style.display = (modoAtual === "mes") ? "inline" : "none";
}

function alterarAno() {
  const yearSel = document.getElementById("yearSelect");
  if (!yearSel) return;
  anoAtual = parseInt(yearSel.value, 10);
  gerarFeriadosParaAno(anoAtual);
  alterarModo();
}

function alterarMesSelect() {
  const monthSel = document.getElementById("monthSelect");
  if (!monthSel) return;
  mesAtual = parseInt(monthSel.value, 10);
  alterarModo();
}

/* -------- LEGENDA ---------- */

function renderizarLegenda() {
  const legendaEl = document.getElementById("legenda");
  if (!legendaEl) return;

  const mapa = new Map();

  // Um título por cor (pega o primeiro que encontrar)
  eventosGlobal.forEach(e => {
    if (!mapa.has(e.cor)) {
      mapa.set(e.cor, e.titulo);
    }
  });

  if (feriados.length > 0) {
    mapa.set("#808080", "Feriado nacional");
  }

  let html = `<div class="legend-title">Legenda de eventos</div>`;
  if (mapa.size === 0) {
    html += `<div style="color:#c2c7ff;font-size:11px;">
               Sem eventos cadastrados ainda. Use a tela de administrador.
             </div>`;
  } else {
    mapa.forEach((titulo, cor) => {
      html += `
        <div class="legend-item">
          <div class="legend-color" style="background:${cor};"></div>
          <span>${titulo}</span>
        </div>
      `;
    });
  }

  legendaEl.innerHTML = html;
}

/* -------- CONTROLE DE MODO ---------- */

function alterarModo() {
  const select = document.getElementById("viewMode");
  if (!select) return;
  modoAtual = select.value;

  const dateInput = document.getElementById("datePicker");
  if (dateInput) {
    dateInput.style.display = (modoAtual === "dia") ? "inline-block" : "none";
  }

  atualizarVisibilidadeSelectMes();

  if (modoAtual === "mes") {
    renderizarCalendarioMensal();
  } else if (modoAtual === "ano") {
    renderizarCalendarioAnual();
  } else if (modoAtual === "semestre") {
    renderizarCalendarioSemestral();
  } else if (modoAtual === "dia") {
    renderizarDia();
  }
}

/* -------- DETALHES ---------- */

function atualizarDetalhesMensagem(titulo, corpoHtml) {
  const detalhes = document.getElementById("detalhes");
  if (!detalhes) return;
  detalhes.innerHTML = `
    <div class="details-title">${titulo}</div>
    <div style="color:#c2c7ff;">${corpoHtml}</div>
  `;
}

function mostrarEventosDoDia(dataStr) {
  const todosEventos = [...eventosGlobal, ...feriados];
  const eventosDia = todosEventos.filter(e => e.data === dataStr);

  const [ano, mes, dia] = dataStr.split("-");
  const dataFormatada = `${dia}/${mes}/${ano}`;

  if (eventosDia.length === 0) {
    atualizarDetalhesMensagem(
      dataFormatada,
      "Não há eventos cadastrados para esta data."
    );
    return;
  }

  let html = "";
  eventosDia.forEach(ev => {
    html += `
      <div class="event-item">
        <div class="event-color" style="background:${ev.cor};"></div>
        <span>${ev.titulo}</span>
      </div>
    `;
  });

  atualizarDetalhesMensagem(dataFormatada, html);
}

/* -------- CALENDÁRIO MENSAL – TABELA ---------- */

function renderizarCalendarioMensal() {
  const container = document.getElementById("calendario");
  if (!container) return;

  const primeiroDia = new Date(anoAtual, mesAtual, 1);
  const totalDias = new Date(anoAtual, mesAtual + 1, 0).getDate();

  // getDay() 0=Dom...6=Sáb -> ajusta para 0=Seg
  const jsDay = primeiroDia.getDay(); // 0..6
  let inicioSemana = (jsDay + 6) % 7; // 0=Seg

  const todosEventos = [...eventosGlobal, ...feriados];

  let html = `
    <div class="month-header">
      <button class="nav-btn" onclick="mudarMes(-1)">&lt;</button>
      <span>${mesesNomes[mesAtual]} ${anoAtual}</span>
      <button class="nav-btn" onclick="mudarMes(1)">&gt;</button>
    </div>

    <table class="cal-table">
      <thead>
        <tr>
          <th class="week-col">Semana</th>
          <th>Seg</th><th>Ter</th><th>Qua</th><th>Qui</th><th>Sex</th><th>Sáb</th><th>Dom</th>
        </tr>
      </thead>
      <tbody>
  `;

  let diaAtual = 1;
  let semana = 1;

  while (diaAtual <= totalDias) {
    html += `<tr><td class="week-col">${semana}</td>`;
    for (let col = 0; col < 7; col++) {
      if (semana === 1 && col < inicioSemana) {
        html += `<td class="day-cell day-empty"></td>`;
      } else if (diaAtual > totalDias) {
        html += `<td class="day-cell day-empty"></td>`;
      } else {
        const dataStr = `${anoAtual}-${pad2(mesAtual + 1)}-${pad2(diaAtual)}`;
        const eventosDia = todosEventos.filter(e => e.data === dataStr);
        const hasEvent = eventosDia.length > 0;

        if (!hasEvent) {
          html += `<td class="day-cell"><span class="day-number">${diaAtual}</span></td>`;
        } else {
          const label = eventosDia.map(e => e.titulo).join(" / ").replace(/"/g,"&quot;");
          html += `<td class="day-cell day-has-event" onclick="mostrarEventosDoDia('${dataStr}')" title="${label}">
            <span class="day-number">${diaAtual}</span>
          `;

          if (eventosDia.length === 1) {
            html += `<div class="event-bar" style="background:${eventosDia[0].cor};"></div>`;
          } else {
            const max = Math.min(eventosDia.length, 4);
            html += `<div class="event-bar event-bar-multi">`;
            for (let i = 0; i < max; i++) {
              html += `<div class="event-dot" style="background:${eventosDia[i].cor};"></div>`;
            }
            html += `</div>`;
          }

          html += `</td>`;
        }

        diaAtual++;
      }
    }
    html += `</tr>`;
    semana++;
  }

  html += `</tbody></table>`;
  container.innerHTML = html;

  atualizarDetalhesMensagem(
    "Nenhuma data selecionada",
    "Clique em um dia com cor para ver os eventos."
  );
}

function mudarMes(delta) {
  mesAtual += delta;
  if (mesAtual < 0) {
    mesAtual = 11;
    anoAtual--;
    gerarFeriadosParaAno(anoAtual);
  } else if (mesAtual > 11) {
    mesAtual = 0;
    anoAtual++;
    gerarFeriadosParaAno(anoAtual);
  }

  const yearSel = document.getElementById("yearSelect");
  const monthSel = document.getElementById("monthSelect");
  if (yearSel) yearSel.value = anoAtual;
  if (monthSel) monthSel.value = mesAtual;

  renderizarCalendarioMensal();
}

/* -------- VISÃO ANUAL (lista por mês) ---------- */

function renderizarCalendarioAnual() {
  const container = document.getElementById("calendario");
  if (!container) return;

  const todosEventos = [...eventosGlobal, ...feriados];
  let html = `<div class="view-title">Eventos de ${anoAtual}</div>`;

  for (let m = 0; m < 12; m++) {
    const mesStr = pad2(m + 1);
    const eventosMes = todosEventos
      .filter(e => e.data.startsWith(`${anoAtual}-${mesStr}`))
      .sort((a,b) => a.data.localeCompare(b.data));

    html += `<div class="month-block">
      <div class="month-name">${mesesNomes[m]}</div>
    `;

    if (eventosMes.length === 0) {
      html += `<div class="day-view-empty">Sem eventos neste mês.</div>`;
    } else {
      html += `<ul class="month-list">`;
      eventosMes.forEach(ev => {
        const dia = ev.data.split("-")[2];
        html += `<li><strong>${dia}</strong> – ${ev.titulo}</li>`;
      });
      html += `</ul>`;
    }

    html += `</div>`;
  }

  container.innerHTML = html;

  atualizarDetalhesMensagem(
    "Visão anual",
    "Listagem de todos os eventos e feriados do ano."
  );
}

/* -------- VISÃO SEMESTRAL ---------- */

function renderizarCalendarioSemestral() {
  const container = document.getElementById("calendario");
  if (!container) return;

  const todosEventos = [...eventosGlobal, ...feriados];
  const inicio = (semestreAtual === 1) ? 0 : 6;
  const fim = (semestreAtual === 1) ? 5 : 11;
  const titulo = semestreAtual === 1 ? "1º Semestre" : "2º Semestre";

  let html = `
    <div class="semestre-header">
      <span>${titulo} de ${anoAtual}</span>
      <button class="semestre-btn" onclick="trocarSemestre()">Trocar semestre</button>
    </div>
  `;

  for (let m = inicio; m <= fim; m++) {
    const mesStr = pad2(m + 1);
    const eventosMes = todosEventos
      .filter(e => e.data.startsWith(`${anoAtual}-${mesStr}`))
      .sort((a,b) => a.data.localeCompare(b.data));

    html += `<div class="month-block">
      <div class="month-name">${mesesNomes[m]}</div>
    `;

    if (eventosMes.length === 0) {
      html += `<div class="day-view-empty">Sem eventos neste mês.</div>`;
    } else {
      html += `<ul class="month-list">`;
      eventosMes.forEach(ev => {
        const dia = ev.data.split("-")[2];
        html += `<li><strong>${dia}</strong> – ${ev.titulo}</li>`;
      });
      html += `</ul>`;
    }

    html += `</div>`;
  }

  container.innerHTML = html;

  atualizarDetalhesMensagem(
    "Visão semestral",
    "Eventos agrupados por mês dentro do semestre selecionado."
  );
}

function trocarSemestre() {
  semestreAtual = (semestreAtual === 1) ? 2 : 1;
  renderizarCalendarioSemestral();
}

/* -------- VISÃO DIA ---------- */

function renderizarDia() {
  const container = document.getElementById("calendario");
  const dateInput = document.getElementById("datePicker");
  if (!container || !dateInput) return;

  let dataStr = dateInput.value;
  if (!dataStr) {
    const hoje = new Date().toISOString().slice(0,10);
    dataStr = hoje;
    dateInput.value = hoje;
  }

  const todosEventos = [...eventosGlobal, ...feriados];
  const eventosDia = todosEventos.filter(e => e.data === dataStr);

  const [ano, mes, dia] = dataStr.split("-");
  const dataFormatada = `${dia}/${mes}/${ano}`;
  let html = `<div class="view-title">Eventos em ${dataFormatada}</div>`;

  if (eventosDia.length === 0) {
    html += `<div class="day-view-empty">Não há eventos cadastrados para esta data.</div>`;
  } else {
    html += `<ul class="month-list">`;
    eventosDia.forEach(ev => {
      html += `<li>${ev.titulo}</li>`;
    });
    html += `</ul>`;
  }

  container.innerHTML = html;
  mostrarEventosDoDia(dataStr);
}

/* -------- EXPOSE PARA O HTML ---------- */

window.alterarModo = alterarModo;
window.mudarMes = mudarMes;
window.trocarSemestre = trocarSemestre;
window.renderizarDia = renderizarDia;
window.alterarAno = alterarAno;
window.alterarMesSelect = alterarMesSelect;

document.addEventListener("DOMContentLoaded", inicializarCalendario);
