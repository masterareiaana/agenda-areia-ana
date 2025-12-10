// URL do Realtime Database (somente leitura dos eventos)
const URL_EVENTOS = "https://agenda-areia-ana-default-rtdb.firebaseio.com/eventos.json";

// Cores padrão
const COR_FERIADO = "#555555";      // cinza mais escuro
const COR_EVENTO_PADRAO = "#ff7a1a";

let eventos = [];       // carregados do Firebase
let anoAtual;
let mesAtual;           // 0-11

const seletorAno = document.getElementById("anoSelecionado");
const seletorMes = document.getElementById("mesSelecionado");
const seletorModo = document.getElementById("modoVisualizacao");
const filtroMesWrapper = document.getElementById("filtroMesWrapper");

const tituloMesEl = document.getElementById("tituloMes");
const tituloAnoEl = document.getElementById("tituloAno");
const corpoMensal = document.getElementById("corpoMensal");
const gradeAnual = document.getElementById("gradeAnual");

const btnMesAnterior = document.getElementById("btnMesAnterior");
const btnMesProximo = document.getElementById("btnMesProximo");

const viewMensal = document.getElementById("viewMensal");
const viewAnual = document.getElementById("viewAnual");

const nomesMeses = [
  "Janeiro", "Fevereiro", "Março", "Abril",
  "Maio", "Junho", "Julho", "Agosto",
  "Setembro", "Outubro", "Novembro", "Dezembro"
];

// -------------------- FERIADOS FIXOS (BR) -----------------------

function gerarFeriadosAno(ano) {
  const base = [
    { mes: 1, dia: 1,  titulo: "Confraternização Universal" },
    { mes: 4, dia: 21, titulo: "Tiradentes" },
    { mes: 5, dia: 1,  titulo: "Dia do Trabalho" },
    { mes: 9, dia: 7,  titulo: "Independência do Brasil" },
    { mes: 10, dia: 12, titulo: "Nossa Senhora Aparecida" },
    { mes: 11, dia: 2,  titulo: "Finados" },
    { mes: 11, dia: 15, titulo: "Proclamação da República" },
    { mes: 12, dia: 25, titulo: "Natal" }
  ];

  return base.map(f => ({
    data: `${ano}-${String(f.mes).padStart(2, "0")}-${String(f.dia).padStart(2, "0")}`,
    titulo: f.titulo,
    tipo: "feriado"
  }));
}

// -------------------- UTIL -----------------------

function dataISO(ano, mes, dia) {
  return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function agruparEventosPorData(lista) {
  const mapa = {};
  lista.forEach(ev => {
    if (!mapa[ev.data]) mapa[ev.data] = [];
    mapa[ev.data].push(ev);
  });
  return mapa;
}

// -------------------- CARREGAR EVENTOS -----------------------

async function carregarEventos() {
  try {
    const resp = await fetch(URL_EVENTOS);
    const data = await resp.json();
    const lista = [];

    if (data) {
      Object.keys(data).forEach(id => {
        const ev = data[id];
        if (!ev || !ev.data) return;
        lista.push({
          id,
          data: ev.data,
          titulo: ev.titulo || "Evento",
          cor: ev.cor || COR_EVENTO_PADRAO
        });
      });
    }

    eventos = lista;
  } catch (e) {
    console.error("Erro ao carregar eventos do Firebase", e);
    eventos = [];
  }
}

// -------------------- CONTROLES DE ANO/MÊS -----------------------

function preencherSeletorAno() {
  const agora = new Date();
  const anoCorrido = agora.getFullYear();
  seletorAno.innerHTML = "";

  for (let a = anoCorrido - 1; a <= anoCorrido + 3; a++) {
    const opt = document.createElement("option");
    opt.value = a;
    opt.textContent = a;
    if (a === anoAtual) opt.selected = true;
    seletorAno.appendChild(opt);
  }
}

function preencherSeletorMes() {
  seletorMes.innerHTML = "";
  nomesMeses.forEach((nome, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = nome;
    if (idx === mesAtual) opt.selected = true;
    seletorMes.appendChild(opt);
  });
}

// -------------------- RENDER MENSAL -----------------------

function renderMensal() {
  viewMensal.classList.add("ativo");
  viewAnual.classList.remove("ativo");
  filtroMesWrapper.style.display = "inline-block";

  tituloMesEl.textContent = `${nomesMeses[mesAtual]} de ${anoAtual}`;

  const feriados = gerarFeriadosAno(anoAtual);
  const todosEventos = [...eventos, ...feriados];
  const mapa = agruparEventosPorData(todosEventos);

  // Começo do mês
  const primeiroDiaSemana = new Date(anoAtual, mesAtual, 1).getDay(); // 0=Dom
  const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();

  // No calendário queremos segunda a domingo, então ajustamos o índice
  const offset = (primeiroDiaSemana + 6) % 7; // transforma: 1=Seg...0=Dom => 6

  corpoMensal.innerHTML = "";
  let dia = 1;
  for (let linha = 0; linha < 6; linha++) {
    const tr = document.createElement("tr");

    for (let col = 0; col < 7; col++) {
      const td = document.createElement("td");

      if (linha === 0 && col < offset) {
        td.innerHTML = "";
      } else if (dia > diasNoMes) {
        td.innerHTML = "";
      } else {
        const data = dataISO(anoAtual, mesAtual, dia);
        const spanNum = document.createElement("span");
        spanNum.className = "dia-numero";
        spanNum.textContent = dia;
        td.appendChild(spanNum);

        const eventosDia = mapa[data] || [];
        const temFeriado = eventosDia.some(e => e.tipo === "feriado");
        const temEvento = eventosDia.some(e => e.tipo !== "feriado");

        if (temFeriado) {
          td.classList.add("dia-feriado");
        }

        if (temEvento) {
          td.classList.add("dia-evento");
          const marcador = document.createElement("div");
          marcador.className = "marcador-evento";
          td.appendChild(marcador);
        }

        dia++;
      }

      tr.appendChild(td);
    }

    corpoMensal.appendChild(tr);
  }
}

// -------------------- RENDER ANUAL -----------------------

function renderAnual() {
  viewMensal.classList.remove("ativo");
  viewAnual.classList.add("ativo");
  filtroMesWrapper.style.display = "none";

  tituloAnoEl.textContent = `Ano de ${anoAtual}`;

  const feriados = gerarFeriadosAno(anoAtual);
  const todosEventos = [...eventos, ...feriados];
  const mapa = agruparEventosPorData(todosEventos);

  gradeAnual.innerHTML = "";

  for (let m = 0; m < 12; m++) {
    const mini = document.createElement("div");
    mini.className = "mini-mes";

    const titulo = document.createElement("div");
    titulo.className = "mini-mes-titulo";
    titulo.textContent = nomesMeses[m];
    mini.appendChild(titulo);

    const tabela = document.createElement("table");
    tabela.className = "mini-grade";

    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");
    ["S", "T", "Q", "Q", "S", "S", "D"].forEach(dia => {
      const th = document.createElement("th");
      th.textContent = dia;
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    tabela.appendChild(thead);

    const tbody = document.createElement("tbody");

    const primeiro = new Date(anoAtual, m, 1).getDay();
    const diasMes = new Date(anoAtual, m + 1, 0).getDate();
    const offset = (primeiro + 6) % 7;

    let d = 1;
    for (let linha = 0; linha < 6; linha++) {
      const tr = document.createElement("tr");
      for (let col = 0; col < 7; col++) {
        const td = document.createElement("td");

        if (linha === 0 && col < offset) {
          td.textContent = "";
        } else if (d > diasMes) {
          td.textContent = "";
        } else {
          const data = dataISO(anoAtual, m, d);
          const span = document.createElement("span");
          span.textContent = d;
          td.appendChild(span);

          const eventosDia = mapa[data] || [];
          const temFeriado = eventosDia.some(e => e.tipo === "feriado");
          const temEvento = eventosDia.some(e => e.tipo !== "feriado");

          if (temFeriado) {
            td.classList.add("mini-feriado");
          }
          if (temEvento) {
            td.classList.add("mini-evento");
          }

          d++;
        }

        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }

    tabela.appendChild(tbody);
    mini.appendChild(tabela);
    gradeAnual.appendChild(mini);
  }
}

// -------------------- TROCA DE MODO -----------------------

function atualizarVisao() {
  const modo = seletorModo.value;
  if (modo === "mensal") {
    renderMensal();
  } else {
    renderAnual();
  }
}

// -------------------- EVENTOS DE UI -----------------------

seletorAno.addEventListener("change", () => {
  anoAtual = Number(seletorAno.value);
  atualizarVisao();
});

seletorMes.addEventListener("change", () => {
  mesAtual = Number(seletorMes.value);
  atualizarVisao();
});

seletorModo.addEventListener("change", atualizarVisao);

btnMesAnterior.addEventListener("click", () => {
  mesAtual--;
  if (mesAtual < 0) {
    mesAtual = 11;
    anoAtual--;
    preencherSeletorAno();
  }
  preencherSeletorMes();
  atualizarVisao();
});

btnMesProximo.addEventListener("click", () => {
  mesAtual++;
  if (mesAtual > 11) {
    mesAtual = 0;
    anoAtual++;
    preencherSeletorAno();
  }
  preencherSeletorMes();
  atualizarVisao();
});

// -------------------- INICIALIZAÇÃO -----------------------

(async function init() {
  const hoje = new Date();
  anoAtual = hoje.getFullYear();
  mesAtual = hoje.getMonth();

  preencherSeletorAno();
  preencherSeletorMes();
  await carregarEventos();
  atualizarVisao();
})();
