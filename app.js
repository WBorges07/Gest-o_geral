import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

// Verifica o estado de autenticação
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "login.html";
});

// Listener para o botão Sair
const btnSair = document.getElementById('btnSair');
if (btnSair) {
    btnSair.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = "login.html";
        }).catch((error) => {
            console.error("Erro ao fazer logout:", error);
        });
    });
}

const vendaForm = document.getElementById('vendaForm');
const selVendedor = document.getElementById('filtroVendedor');
const selMes = document.getElementById('filtroMes');
const selAno = document.getElementById('filtroAno');
const listaCorpo = document.getElementById('listaVendasCorpo');

let dadosVendas = [];

// Função auxiliar para converter moeda (R$) para valor numérico
const parseMoeda = (str) => {
    if (!str) return 0;
    const num = str.replace(/[^\d,-]/g, '').replace(',', '.');
    return parseFloat(num) || 0;
};

// Função auxiliar para formatar números para formato BRL (R$)
const formatarMoeda = (val) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

if (vendaForm) {
    vendaForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const campoAno = document.getElementById('filtroAno');
        const anoParaSalvar = (campoAno && campoAno.value !== "todos") ? campoAno.value : "2026";

        const mensalidade = document.getElementById('mensalidadePlano').value;
        const entrada = document.getElementById('pagamentoInicial').value;
        const formaPgto = document.getElementById('formaPagamento').value;

        const novaVenda = {
            // Campos de identificação e contato
            vendedor: document.getElementById('vendedor').value,
            cliente: document.getElementById('nomeCliente').value,
            telefone: document.getElementById('telefone').value,
            
            // Campos do Plano
            plano: document.getElementById('plano').value,
            vigencia: document.getElementById('vigencia').value,
            mensalidadePlano: mensalidade,
            
            // Campos Financeiros
            valorTotal: mensalidade,
            valorEntrada: entrada,
            formaEntrada: formaPgto,
            pagamentoInicial: entrada,
            dataPgtoInicial: document.getElementById('dataPgtoInicial').value,
            primeiroPagamentoMes: document.getElementById('pagamentoMes').value,
            primeiroPagamentoAno: anoParaSalvar,
            formaPagamento: formaPgto,
            statusFinanceiro: "Pendente",
            pago: false,
            vezes: "1",

            // Campos de Operação (CS/Tráfego)
            areaAtuacao: document.getElementById('area').value,
            perfilCliente: document.getElementById('perfil').value,
            tipoCampanha: document.getElementById('tipoCampanha').value,
            investimentoMensal: document.getElementById('investimento').value,
            instagramCliente: document.getElementById('instagram').value,
            jaInvestia: document.getElementById('jaInvestia').value,
            onboardingAconteceu: false,
            dataCadastro: serverTimestamp()
        };

        try {
            await addDoc(collection(db, "vendas"), novaVenda);
            alert("Venda cadastrada e enviada ao financeiro!");
            vendaForm.reset();
        } catch (error) {
            console.error("Erro ao salvar a venda:", error);
            alert("Erro ao salvar dados.");
        }
    });
}

// Renderização da tabela e atualização dos totais
const renderizarVendas = () => {
    if (!listaCorpo) return;

    const vFiltro = selVendedor ? selVendedor.value : "todos";
    const mFiltro = selMes ? selMes.value : "todos";
    const aFiltro = selAno ? selAno.value : "todos";

    listaCorpo.innerHTML = "";
    let totalMensalidades = 0;
    let totalEntradas = 0;

    dadosVendas.forEach(d => {
        const dataObjeto = d.dataCadastro?.seconds ? new Date(d.dataCadastro.seconds * 1000) : null;
        const anoVenda = dataObjeto ? dataObjeto.getFullYear().toString() : "";

        const vBate = vFiltro === "todos" || d.vendedor === vFiltro;
        const mBate = mFiltro === "todos" || d.primeiroPagamentoMes === mFiltro;
        const aBate = aFiltro === "todos" || anoVenda === aFiltro;

        if (vBate && mBate && aBate) {
            totalMensalidades += parseMoeda(d.mensalidadePlano || d.valorTotal);
            totalEntradas += parseMoeda(d.pagamentoInicial || d.valorEntrada);

            const dataF = dataObjeto ? dataObjeto.toLocaleDateString('pt-BR') : "--/--/----";
            listaCorpo.innerHTML += `
                <tr>
                    <td>${dataF}</td>
                    <td style="font-weight: bold;">${d.cliente || ''}</td>
                    <td>${d.vendedor || ''}</td>
                    <td>${d.plano || ''}</td>
                    <td>${d.mensalidadePlano || d.valorTotal || ''}</td>
                    <td>${d.pagamentoInicial || d.valorEntrada || ''}</td>
                    <td>${d.telefone || ''}</td>
                    <td><button onclick="excluirVenda('${d.id}')" style="color:var(--danger); background:none; border:none; cursor:pointer;">Excluir</button></td>
                </tr>`;
        }
    });

    // Atualização dos Cards de Total
    const elTotalMensalidades = document.getElementById('totalMensalidades');
    const elTotalEntradas = document.getElementById('totalEntradas');
    if (elTotalMensalidades) elTotalMensalidades.textContent = formatarMoeda(totalMensalidades);
    if (elTotalEntradas) elTotalEntradas.textContent = formatarMoeda(totalEntradas);
};

// Listagem na página inicial (Vendas)
if (listaCorpo) {
    onSnapshot(query(collection(db, "vendas"), orderBy("dataCadastro", "desc")), (snap) => {
        dadosVendas = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        renderizarVendas();
    });

    if (selVendedor) selVendedor.addEventListener('change', renderizarVendas);
    if (selMes) selMes.addEventListener('change', renderizarVendas);
    if (selAno) selAno.addEventListener('change', renderizarVendas);
}

// Função global para excluir vendas
window.excluirVenda = async (id) => {
    if (confirm("Tem certeza que deseja excluir esta venda?")) {
        try {
            await deleteDoc(doc(db, "vendas", id));
        } catch (error) {
            console.error("Erro ao excluir venda:", error);
        }
    }
};

// Função global para Logout
window.btnLogout = () => signOut(auth).then(() => window.location.href = "login.html");