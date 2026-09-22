import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyARsHedCxsS4n3s6WxEopEDXzQPWAjrhp8",
    authDomain: "controle-de-gestao-976f4.firebaseapp.com",
    projectId: "controle-de-gestao-976f4",
    storageBucket: "controle-de-gestao-976f4.firebasestorage.app",
    messagingSenderId: "424359580737",
    appId: "1:424359580737:web:5d40c4213aa732171da2c0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    }
});

const btnSair = document.getElementById('btnSair');
if (btnSair) {
    btnSair.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = "login.html";
        }).catch((error) => console.error("Erro ao fazer logout:", error));
    });
}

let chartPlanosInstance = null;
let chartVendasMesInstance = null;
let chartVendedoresInstance = null;
let chartSatisfacaoSquadInstance = null;

const ordemMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const renderizarDashboardBI = (dados) => {
    // 1. Quantidade de Planos Fechados
    const contagemPlanos = {};
    const contagemVendedores = {};
    const contagemMeses = {};
    const satisfacaoPorSquad = {
        "Squad Black Mamba": { Satisfeito: 0, Alerta: 0, Insatisfeito: 0 },
        "Squad Titans": { Satisfeito: 0, Alerta: 0, Insatisfeito: 0 }
    };

    dados.forEach(d => {
        // Planos
        if (d.plano) {
            contagemPlanos[d.plano] = (contagemPlanos[d.plano] || 0) + 1;
        }
        // Vendedores
        if (d.vendedor) {
            contagemVendedores[d.vendedor] = (contagemVendedores[d.vendedor] || 0) + 1;
        }
        // Mês
        if (d.pagamentoMes) {
            contagemMeses[d.pagamentoMes] = (contagemMeses[d.pagamentoMes] || 0) + 1;
        }
        // Satisfação por Squad
        const squad = d.squad;
        const sat = d.satisfacao;
        if (squad && satisfacaoPorSquad[squad] && sat) {
            if (satisfacaoPorSquad[squad][sat] !== undefined) {
                satisfacaoPorSquad[squad][sat]++;
            }
        }
    });

    // Atualiza os Cards
    document.getElementById('totalPlanosNum').innerText = dados.length;
    
    const planoTop = Object.keys(contagemPlanos).reduce((a, b) => contagemPlanos[a] > contagemPlanos[b] ? a : b, "-");
    document.getElementById('planoMaisVendido').innerText = planoTop !== "-" ? planoTop : "N/A";

    const vendedorTop = Object.keys(contagemVendedores).reduce((a, b) => contagemVendedores[a] > contagemVendedores[b] ? a : b, "-");
    document.getElementById('vendedorDestaque').innerText = vendedorTop !== "-" ? vendedorTop : "N/A";

    // Satisfação Geral
    let totalSatisfeito = 0;
    let totalComSat = 0;
    dados.forEach(d => {
        if (d.satisfacao) {
            totalComSat++;
            if (d.satisfacao === "Satisfeito") totalSatisfeito++;
        }
    });
    const percSat = totalComSat > 0 ? Math.round((totalSatisfeito / totalComSat) * 100) + "%" : "N/A";
    document.getElementById('satisfacaoGeral').innerText = percSat;

    // --- GRÁFICO 1: PLANOS FECHADOS (Doughnut) ---
    const ctxPlanos = document.getElementById('chartPlanos').getContext('2d');
    if (chartPlanosInstance) chartPlanosInstance.destroy();
    chartPlanosInstance = new Chart(ctxPlanos, {
        type: 'doughnut',
        data: {
            labels: Object.keys(contagemPlanos),
            datasets: [{
                data: Object.values(contagemPlanos),
                backgroundColor: ['#00ff88', '#007aff', '#ffcc00', '#ff4444', '#9b59b6', '#e67e22', '#1abc9c', '#34495e']
            }]
        },
        options: { responsive: true, plugins: { legend: { labels: { color: '#fff' } } } }
    });

    // --- GRÁFICO 2: PERFORMANCE POR MÊS (Barra) ---
    const labelsMeses = ordemMeses.filter(m => contagemMeses[m] !== undefined);
    const dataMeses = labelsMeses.map(m => contagemMeses[m]);

    const ctxMeses = document.getElementById('chartVendasMes').getContext('2d');
    if (chartVendasMesInstance) chartVendasMesInstance.destroy();
    chartVendasMesInstance = new Chart(ctxMeses, {
        type: 'bar',
        data: {
            labels: labelsMeses,
            datasets: [{
                label: 'Vendas Fechadas',
                data: dataMeses,
                backgroundColor: '#00ff88'
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: { ticks: { color: '#fff' } },
                y: { ticks: { color: '#fff' }, beginAtZero: true }
            },
            plugins: { legend: { labels: { color: '#fff' } } }
        }
    });

    // --- GRÁFICO 3: VENDAS POR VENDEDOR (Barra Horizontal) ---
    const ctxVendedores = document.getElementById('chartVendedores').getContext('2d');
    if (chartVendedoresInstance) chartVendedoresInstance.destroy();
    chartVendedoresInstance = new Chart(ctxVendedores, {
        type: 'bar',
        data: {
            labels: Object.keys(contagemVendedores),
            datasets: [{
                label: 'Qtd Vendas',
                data: Object.values(contagemVendedores),
                backgroundColor: '#007aff'
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            scales: {
                x: { ticks: { color: '#fff' }, beginAtZero: true },
                y: { ticks: { color: '#fff' } }
            },
            plugins: { legend: { labels: { color: '#fff' } } }
        }
    });

    // --- GRÁFICO 4: SATISFAÇÃO POR SQUAD (Empilhado) ---
    const squads = ["Squad Black Mamba", "Squad Titans"];
    const ctxSatisfacao = document.getElementById('chartSatisfacaoSquad').getContext('2d');
    if (chartSatisfacaoSquadInstance) chartSatisfacaoSquadInstance.destroy();
    chartSatisfacaoSquadInstance = new Chart(ctxSatisfacao, {
        type: 'bar',
        data: {
            labels: squads,
            datasets: [
                {
                    label: 'Satisfeito',
                    data: squads.map(s => satisfacaoPorSquad[s].Satisfeito),
                    backgroundColor: '#00ff88'
                },
                {
                    label: 'Alerta',
                    data: squads.map(s => satisfacaoPorSquad[s].Alerta),
                    backgroundColor: '#ffcc00'
                },
                {
                    label: 'Insatisfeito',
                    data: squads.map(s => satisfacaoPorSquad[s].Insatisfeito),
                    backgroundColor: '#ff4444'
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: { stacked: true, ticks: { color: '#fff' } },
                y: { stacked: true, ticks: { color: '#fff' }, beginAtZero: true }
            },
            plugins: { legend: { labels: { color: '#fff' } } }
        }
    });
};

onSnapshot(query(collection(db, "vendas"), orderBy("dataCadastro", "desc")), (snap) => {
    const dados = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderizarDashboardBI(dados);
});