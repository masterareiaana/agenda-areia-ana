// URL do Realtime Database
const DB_URL = "https://agenda-areia-ana-default-rtdb.firebaseio.com";

let eventosFirebase = {};     // eventos vindos do admin
let mapaAnoAtual = {};        // { "YYYY-MM-DD": [eventos...] }

let viewMode = "mensal";
let hoje = new Date();
let anoAtual = hoje.getFullYear();
let mesAtual = hoje.getMonth(); // 0-11

const mesesNomes = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const bodyTabela = document.getElementById("calendar-body");
const tituloMes = document.getElementById("month-title");
const detalhesDia = document.getElementById("detalhesDia");
const viewModeSelect = document.getElementById("viewMode");
const anoSelect = document.getElementById("anoSelect");
const mesSelect = document.getElementById("mesSelect");
const navMensal = document.getElementById("navMensal");
const mesContainer = document.getElementById("mesContainer");
const monthlyView = document.getElementById("monthly-view");
const annualView = document.getElementById("annual-view");
const gridAno = document.getElementById("gridAno");

document.getElementById("btnPrev").addEventListener("click", () => {
  if (viewMode !== "mensal") return;
  mesAtual--;
  if (mesAtual < 0) {
    mesAtual = 11;
    anoAtual--;
  }
  anoSelect.value = anoAtual;
  mesSelect.value = mesAtual;
  atualizarMapaEAparecer();
});

document.getElementById("btnNext").addEventListener("click", () => {
  if (viewMode !== "mensal") return;
  mesAtual++;
  if (mesAtual > 11) {
    mesAtual = 0;
    anoAtual++;
  }
  anoSelect.value = anoAtual;
  mesSelect.value = mesAtual;
  atualizarMapaEAparecer();
});

viewModeSelect.addEventListener("change", () => {
  viewMode = viewModeSelect.value;
  atualizarVisibilidadeView();
  atualizarMapaEAparecer();
});

anoSelect.addEventListener("change", () => {
  anoAtual = parseInt(anoSelect.value, 10);
  atualizarMapaEAparecer();
});

mesSelect.addEventListener("change", () => {
  mesAtual = parseInt(mesSelect.value, 10);
  atualizarMapaEAparecer();
});

function atualizarVisibilidadeView() {
  if (viewMode === "mensal") {
    monthlyView.style.display = "block";
    annualView.style.display = "none";
    navMensal.style.display = "flex";
    mesContainer.style.display = "block";
  } else {
    monthlyView.style.display = "none";
    annualView.style.display = "block";
    navMensal.style.display = "none";
    mesContainer.style.display = "none";
  }
}

// -------- FERIADOS (cor cinza escuro) --------
function getFeriadosNacionais(ano) {
  // só fixos, igual seu modelo
  const feriados = [
    { mes: 0,  dia: 1,  titulo: "Confraternização Universal" },
    { mes: 3,  dia: 21, titulo: "Tiradentes" },
    { mes: 4,  dia: 1,  titulo: "Dia do Trabalhador" },
    { mes: 8,  dia: 7,  titulo: "Independência do Brasil" },
    { mes: 9,  dia: 12, titulo: "Nossa Senhora Aparecida" },
    { mes: 10, dia: 2,  titulo: "Finados" },
    { mes: 10, dia: 15, titulo: "Proclamação da República" },
    { mes: 11, dia: 25, titulo: "Natal" }
  ];

  const map = {};
  feriados.forEach(f => {
    const d = new Date(ano, f.mes, f.dia);
    const iso = d.toISOString().slice(0, 10);
    map[iso] = {
      titulo: f.titulo,
      tipo: "feriado",
      cor: "#3a3a3a"
    };
  });
  return map;
}

// -------- Firebase --------
async function carregarEventosFirebase() {
  try {
    const resp = await fetch(`${DB_URL}/eventos.json`);
    const dados = await resp.json();
    eventosFirebase = dados || {};
  } catch (err) {
    console.error("Erro ao carregar eventos do Firebase:", err);
    eventosFirebase = {};
  }
}

// Gera mapa de TODOS os dias do ano
function gerarMapaAno(ano) {
  const mapa = {};
  const inicio = new Date(ano, 0, 1);
  const fim = new Date(ano + 1, 0, 0);

  const feriados = getFeriadosNacionais(ano);

  for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    const dia = d.getDate();     // 1-31
    const diaSemana = d.getDay();// 0-6  (0 domingo)
    mapa[iso] = [];

    // FERIADOS
    if (feriados[iso]) {
      mapa[iso].push(feriados[iso]);
    }

    // EVENTOS DO FIREBASE
    Object.values(eventosFirebase).forEach(ev => {
      if (!ev) return;
      if (ev.tipo === "unico" && ev.data === iso) {
        mapa[iso].push(ev);
      } else if (ev.tipo === "mensal" && ev.diaMes === dia) {
        mapa[iso].push(ev);
      } else if (ev.tipo === "semanal" && ev.diaSemana === diaSemana) {
        mapa[iso].push(ev);
      }
    });
  }

  return mapa;
}

// -------- RENDER MENSAL --------
function renderMensal() {
  const ano = anoAtual;
  const mes = mesAtual;

  tituloMes.textContent = `${mesesNomes[mes]} de ${ano}`;
  detalhesDia.textContent = "Selecione um dia com evento para ver os detalhes aqui.";

  bodyTabela.innerHTML = "";

  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);

  // em JS, semana começa no domingo, mas queremos colunas: Seg - Dom
  // vamos alinhar manualmente
  let diaCorrente = new Date(ano, mes, 1);
  let semanaNumero = 1;

  while (diaCorrente <= ultimoDia) {
    const tr = document.createElement("tr");

    // coluna "Semana"
    const tdSemana = document.createElement("td");
    tdSemana.textContent = semanaNumero;
    tdSemana.style.color = "#c2c7ff";
    tr.appendChild(tdSemana);

    // para cada coluna (Seg=1 ... Dom=0)
    for (let col = 1; col <= 7; col++) {
      const td = document.createElement("td");

      // precisamos verificar se esse dia do loop pertence a essa semana/coluna
      // ideia: achar o dia da semana (1-7) de diaCorrente no padrão Seg-Dom
      const diaSemanaReal = diaCorrente.getDay(); // 0-6 domingo-sábado
      const diaSemanaSegDom = diaSemanaReal === 0 ? 7 : diaSemanaReal; // 1-7

      if (
        diaCorrente.getMonth() === mes &&
        diaSemanaSegDom === col
      ) {
        const diaNumero = diaCorrente.getDate();
        const iso = diaCorrente.toISOString().slice(0, 10);
        td.textContent = diaNumero;

        const eventos = mapaAnoAtual[iso] || [];
        if (eventos.length > 0) {
          td.classList.add("com-evento");

          // marcador (feriado x evento comum)
          const temFeriado = eventos.some(e => e.tipo === "feriado");
          const marker = document.createElement("div");
          marker.className = "marcador" + (temFeriado ? " marcador-feriado" : "");
          td.appendChild(marker);
        }

        // hoje
        const hojeISO = hoje.toISOString().slice(0, 10);
        if (iso === hojeISO) {
          td.classList.add("hoje");
        }

        td.addEventListener("click", () => {
          mostrarDetalhesDia(iso);
        });

        // avança pro próximo dia
        diaCorrente.setDate(diaCorrente.getDate() + 1);
      } else {
        td.classList.add("vazio");
        td.textContent = "";
      }

      tr.appendChild(td);
    }

    bodyTabela.appendChild(tr);
    semanaNumero++;
  }
}

function mostrarDetalhesDia(iso) {
  const eventos = mapaAnoAtual[iso] || [];
  if (eventos.length === 0) {
    detalhesDia.textContent = "Nenhum evento neste dia.";
    return;
  }

  const [ano, mes, dia] = iso.split("-");
  let html = `<strong>${dia}/${mes}/${ano}</strong><br/>`;

  eventos.forEach(ev => {
    const isFeriado = ev.tipo === "feriado";
    const classe = isFeriado ? "badge badge-feriado" : "badge badge-evento";
    html += `<span class="${classe}">${ev.titulo || "Evento"}</span>`;
  });

  detalhesDia.innerHTML = html;
}

// -------- RENDER ANUAL --------
function renderAnual() {
  const ano = anoAtual;
  tituloMes.textContent = `Ano de ${ano}`;
  gridAno.innerHTML = "";

  for (let mes = 0; mes < 12; mes++) {
    const mini = document.createElement("div");
    mini.className = "mini-month";

    const title = document.createElement("div");
    title.className = "mini-month-title";
    title.textContent = mesesNomes[mes];
    mini.appendChild(title);

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");
    const diasSemana = ["S", "T", "Q", "Q", "S", "S", "D"]; // cabeçalho compacto
    diasSemana.forEach(d => {
      const th = document.createElement("th");
      th.textContent = d;
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    const primeiro = new Date(ano, mes, 1);
    const ultimo = new Date(ano, mes + 1, 0);

    let d = new Date(ano, mes, 1);

    while (d <= ultimo) {
      const tr = document.createElement("tr");
      // 7 colunas (Seg-Dom)
      for (let col = 1; col <= 7; col++) {
        const td = document.createElement("td");

        const diaSemanaReal = d.getDay();
        const diaSemanaSegDom = diaSemanaReal === 0 ? 7 : diaSemanaReal;

        if (d.getMonth() === mes && diaSemanaSegDom === col) {
          const diaNumero = d.getDate();
          const iso = d.toISOString().slice(0, 10);
          td.textContent = diaNumero;

          const eventos = mapaAnoAtual[iso] || [];
          if (eventos.length > 0) {
            const temFeriado = eventos.some(e => e.tipo === "feriado");
            const mark = document.createElement("div");
            mark.className = "mini-mark" + (temFeriado ? " mini-mark-feriado" : "");
            td.appendChild(mark);
          }

          d.setDate(d.getDate() + 1);
        } else {
          td.textContent = "";
        }

        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    mini.appendChild(table);
    gridAno.appendChild(mini);
  }
}

// -------- CONTROLES / INICIALIZAÇÃO --------
function preencherSelectsAnoMes() {
  // anos +/- 2
  const anoBase = hoje.getFullYear();
  for (let y = anoBase - 2; y <= anoBase + 3; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    if (y === anoAtual) opt.selected = true;
    anoSelect.appendChild(opt);
  }

  mesesNomes.forEach((nome, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = nome;
    if (idx === mesAtual) opt.selected = true;
    mesSelect.appendChild(opt);
  });
}

async function atualizarMapaEAparecer() {
  mapaAnoAtual = gerarMapaAno(anoAtual);
  if (viewMode === "mensal") {
    renderMensal();
  } else {
    renderAnual();
  }
}

async function init() {
  preencherSelectsAnoMes();
  atualizarVisibilidadeView();
  await carregarEventosFirebase();
  await atualizarMapaEAparecer();
}

init();
