// URL base do seu Realtime Database (sem /eventos.json no final)
const BASE_URL = "https://agenda-areia-ana-default-rtdb.firebaseio.com";

let eventosGlobal = []; // [{data: '2025-12-15', titulo: 'Reunião', cor: '#ff7a1a'}, ...]
let anoAtual;
let mesAtual; // 0-11

const mesesNomes = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const diasSemanaMini = ["S", "T", "Q", "Q", "S", "S", "D"];

const viewModeSelect = document.getElementById("viewMode");
const yearSelect = document.getElementById("yearSelect");
const monthSelect = document.getElementById("monthSelect");
const monthWrapper = document.getElementById("monthWrapper");

const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");

const monthTitle = document.getElementById("monthTitle");
const annualTitle = document.getElementById("annualTitle");

const monthlyView = document.getElementById("monthlyView");
const annualView = document.getElementById("annualView");
const calendarBody = document.getElementById("calendarBody");
const annualGrid = document.getElementById("annualGrid");
const dayInfo = document.getElementById("dayInfo");

// util
const pad2 = (n) => String(n).padStart(2, "0");

// --------- FERIADOS FIXOS (BR) ----------
function gerarFeriadosParaAno(ano) {
  const f = [
    { mes: 1, dia: 1, titulo: "Confraternização Universal" },
    { mes: 4, dia: 21, titulo: "Tiradentes" },
    { mes: 5, dia: 1, titulo: "Dia do Trabalho" },
    { mes: 9, dia: 7, titulo: "Independência do Brasil" },
    { mes: 10, dia: 12, titulo: "Nossa Senhora Aparecida" },
    { mes: 11, dia: 2, titulo: "Finados" },
    { mes: 11, dia: 15, titulo: "Proclamação da República" },
    { mes: 12, dia: 25, titulo: "Natal" }
  ];

  return f.map((fer) => ({
    data: `${ano}-${pad2(fer.mes)}-${pad2(fer.dia)}`,
    titulo: fer.titulo
  }));
}

// --------- CARREGAR EVENTOS DO FIREBASE ----------
async function carregarEventos() {
  try {
    const resp = await fetch(`${BASE_URL}/eventos.json`);
    if (!resp.ok) throw new Error("Erro ao buscar eventos");
    const data = await resp.json() || {};

    const lista = [];
    Object.keys(data).forEach((id) => {
      const ev = data[id];
      if (ev && ev.data && ev.titulo) {
        lista.push({
          data: ev.data,
          titulo: ev.titulo,
          cor: ev.cor || "#ff7a1a"
        });
      }
    });

    eventosGlobal = lista;
  } catch (e) {
    console.error("Erro carregando eventos:", e);
    eventosGlobal = [];
  }
}

// --------- POPULAR SELECTS ----------
function popularAnos() {
  const anoAgora = new Date().getFullYear();
  yearSelect.innerHTML = "";
  for (let ano = anoAgora - 2; ano <= anoAgora + 5; ano++) {
    const opt = document.createElement("option");
    opt.value = ano;
    opt.textContent = ano;
    yearSelect.appendChild(opt);
  }
}

function popularMeses() {
  monthSelect.innerHTML = "";
  mesesNomes.forEach((nome, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = nome;
    monthSelect.appendChild(opt);
  });
}

// --------- RENDER MENSAL ----------
function renderMensal() {
  const ano = anoAtual;
  const mes = mesAtual;

  const hoje = new Date();
  const hojeStr = `${hoje.getFullYear()}-${pad2(hoje.getMonth() + 1)}-${pad2(hoje.getDate())}`;

  const feriadosAno = gerarFeriadosParaAno(ano);

  monthTitle.textContent = `${mesesNomes[mes]} de ${ano}`;
  calendarBody.innerHTML = "";
  dayInfo.textContent = "Nenhuma data selecionada. Clique em um dia para ver os eventos.";

  const primeiroDiaSemana = new Date(ano, mes, 1).getDay(); // 0-dom..6-sab
  const diasMes = new Date(ano, mes + 1, 0).getDate();

  // montar matriz 6 semanas x 7 dias
  let dia = 1;
  for (let semana = 1; semana <= 6; semana++) {
    const tr = document.createElement("tr");

    const tdSemana = document.createElement("td");
    tdSemana.className = "week-col";
    tdSemana.textContent = semana;
    tr.appendChild(tdSemana);

    for (let dow = 1; dow <= 7; dow++) {
      const td = document.createElement("td");
      td.className = "day-cell";

      const posGlobal = (semana - 1) * 7 + dow; // posição de 1..42
      const offset = (primeiroDiaSemana + 6) % 7; // ajustar para semana começando em segunda

      if (posGlobal <= offset || dia > diasMes) {
        td.innerHTML = "";
        tr.appendChild(td);
        continue;
      }

      const dataStr = `${ano}-${pad2(mes + 1)}-${pad2(dia)}`;

      const span = document.createElement("span");
      span.className = "day-number";
      span.textContent = dia;

      // hoje
      if (dataStr === hojeStr) {
        td.classList.add("today");
      }

      // feriado?
      const feriado = feriadosAno.find((f) => f.data === dataStr);
      if (feriado) {
        td.classList.add("holiday");
        td.dataset.feriado = feriado.titulo;
      }

      // eventos?
      const eventosDia = eventosGlobal.filter((ev) => ev.data === dataStr);
      if (eventosDia.length > 0) {
        td.classList.add("has-event");
        // usa a cor do primeiro evento
        span.style.background = eventosDia[0].cor || "#ff7a1a";
      }

      td.appendChild(span);

      td.addEventListener("click", () => {
        mostrarInfoDia(dataStr, feriado, eventosDia);
      });

      tr.appendChild(td);
      dia++;
    }

    calendarBody.appendChild(tr);
    if (dia > diasMes) break;
  }
}

function mostrarInfoDia(dataStr, feriado, eventosDia) {
  const [ano, mes, dia] = dataStr.split("-");
  const tituloData = `${dia}/${mes}/${ano}`;

  let html = `<strong>${tituloData}</strong><br/>`;

  if (!feriado && eventosDia.length === 0) {
    html += "Nenhum evento cadastrado.";
  } else {
    if (feriado) {
      html += `<span style="color: #aaaaaa;">• ${feriado.titulo} (feriado)</span><br/>`;
    }
    if (eventosDia.length > 0) {
      html += `<div class="events-list">`;
      eventosDia.forEach((ev) => {
        html += `<div class="event-item"><span class="event-dot" style="background:${ev.cor};"></span>${ev.titulo}</div>`;
      });
      html += `</div>`;
    }
  }

  dayInfo.innerHTML = html;
}

// --------- RENDER ANUAL ----------
function renderAnual() {
  const ano = anoAtual;
  const feriadosAno = gerarFeriadosParaAno(ano);

  annualTitle.textContent = `Ano de ${ano}`;
  annualGrid.innerHTML = "";

  for (let mes = 0; mes < 12; mes++) {
    const mini = document.createElement("div");
    mini.className = "mini-month";

    const header = document.createElement("div");
    header.className = "mini-month-header";
    header.textContent = mesesNomes[mes];
    mini.appendChild(header);

    const table = document.createElement("table");
    table.className = "mini-table";

    const thead = document.createElement("thead");
    const trh = document.createElement("tr");
    diasSemanaMini.forEach((d) => {
      const th = document.createElement("th");
      th.textContent = d;
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    const primeiroDiaSemana = new Date(ano, mes, 1).getDay(); // 0 dom..6 sab
    const diasMes = new Date(ano, mes + 1, 0).getDate();

    let dia = 1;
    for (let linha = 0; linha < 6; linha++) {
      const tr = document.createElement("tr");
      for (let col = 1; col <= 7; col++) {
        const td = document.createElement("td");

        const posGlobal = linha * 7 + col;
        const offset = (primeiroDiaSemana + 6) % 7;

        if (posGlobal <= offset || dia > diasMes) {
          td.textContent = "";
          tr.appendChild(td);
          continue;
        }

        const dataStr = `${ano}-${pad2(mes + 1)}-${pad2(dia)}`;
        const feriado = feriadosAno.find((f) => f.data === dataStr);
        const eventosDia = eventosGlobal.filter((ev) => ev.data === dataStr);

        const span = document.createElement("div");
        span.className = "mini-day";
        span.textContent = dia;

        if (feriado) {
          span.classList.add("mini-holiday");
        }

        if (eventosDia.length > 0) {
          span.classList.add("mini-event");
        }

        td.appendChild(span);
        tr.appendChild(td);
        dia++;
      }
      tbody.appendChild(tr);
      if (dia > diasMes) break;
    }

    table.appendChild(tbody);
    mini.appendChild(table);
    annualGrid.appendChild(mini);
  }
}

// --------- TROCA DE MODO (mensal / anual) ----------
function atualizarVisao() {
  const modo = viewModeSelect.value;

  if (modo === "mensal") {
    monthlyView.style.display = "block";
    annualView.style.display = "none";
    monthWrapper.style.display = "inline-flex";
    prevMonthBtn.style.display = "inline-flex";
    nextMonthBtn.style.display = "inline-flex";
    renderMensal();
  } else {
    monthlyView.style.display = "none";
    annualView.style.display = "block";
    monthWrapper.style.display = "none";
    prevMonthBtn.style.display = "none";
    nextMonthBtn.style.display = "none";
    renderAnual();
  }
}

// --------- NAVEGAÇÃO MENSAL ----------
function mudarMes(delta) {
  mesAtual += delta;
  if (mesAtual < 0) {
    mesAtual = 11;
    anoAtual--;
  } else if (mesAtual > 11) {
    mesAtual = 0;
    anoAtual++;
  }
  yearSelect.value = anoAtual;
  monthSelect.value = mesAtual;
  atualizarVisao();
}

// --------- EVENTOS DE UI ----------
viewModeSelect.addEventListener("change", atualizarVisao);

yearSelect.addEventListener("change", () => {
  anoAtual = parseInt(yearSelect.value, 10);
  atualizarVisao();
});

monthSelect.addEventListener("change", () => {
  mesAtual = parseInt(monthSelect.value, 10);
  atualizarVisao();
});

prevMonthBtn.addEventListener("click", () => mudarMes(-1));
nextMonthBtn.addEventListener("click", () => mudarMes(1));

// --------- INICIALIZAÇÃO ----------
(async function init() {
  popularAnos();
  popularMeses();

  const hoje = new Date();
  anoAtual = hoje.getFullYear();
  mesAtual = hoje.getMonth();

  yearSelect.value = anoAtual;
  monthSelect.value = mesAtual;

  await carregarEventos();
  atualizarVisao();
})();
