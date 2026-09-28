import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { escapeHTML, docsOrdenados } from "./util.js";

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
    if (!user) window.location.href = "login.html";
});

const btnSair = document.getElementById('btnSair');
if (btnSair) {
    btnSair.addEventListener('click', () => {
        signOut(auth).then(() => window.location.href = "login.html");
    });
}

const listaCorpo = document.getElementById('listaFinanceiroCorpo');
const selVendedor = document.getElementById('filtroVendedorFin');
const selMes = document.getElementById('filtroMesFin');
const selAno = document.getElementById('filtroAnoFin');

let dadosFinanceiro = [];

// dataCadastro pode ser string ISO (gravada pelo app.js) ou Timestamp do Firestore
const dataDoCadastro = (v) => {
    if (!v) return null;
    if (typeof v === 'object' && typeof v.seconds === 'number') return new Date(v.seconds * 1000);
    const dt = new Date(v);
    return isNaN(dt.getTime()) ? null : dt;
};

const alternarStatusPagamento = async (id, statusAtual) => {
    const novoStatus = statusAtual === "Pago" ? "Pendente" : "Pago";
    try {
        await updateDoc(doc(db, "vendas", id), { statusFinanceiro: novoStatus });
    } catch (error) {
        console.error("Erro ao atualizar status financeiro:", error);
        alert("Erro ao atualizar o status.\n\nMotivo: " + (error.code || error.message || error));
    }
};

// Delegação de eventos (sem onclick inline nem função global)
listaCorpo.addEventListener('click', (e) => {
    const btn = e.target.closest('.badge-status');
    if (!btn) return;
    alternarStatusPagamento(btn.getAttribute('data-id'), btn.getAttribute('data-status'));
});

const renderizarFinanceiro = () => {
    const vFiltro = selVendedor.value;
    const mFiltro = selMes.value;
    const aFiltro = selAno.value;

    let html = "";

    dadosFinanceiro.forEach(d => {
        const dtCadastro = dataDoCadastro(d.dataCadastro);
        const dataExibicao = d.dataPgtoInicial || (dtCadastro ? dtCadastro.toLocaleDateString('pt-BR') : "---");

        let anoVenda = "";
        if (d.dataPgtoInicial && d.dataPgtoInicial.includes('/')) {
            const partes = d.dataPgtoInicial.split('/');
            if (partes.length === 3) anoVenda = partes[2];
        } else if (dtCadastro) {
            anoVenda = String(dtCadastro.getFullYear());
        }

        const mesReferencia = d.pagamentoMes || d.primeiroPagamentoMes || "";
        const clienteNome = d.nomeCliente || d.cliente || "-";
        const valorMensal = d.mensalidadePlano || d.valorTotal || "R$ 0,00";
        const valorEntrada = d.pagamentoInicial || d.valorEntrada || "R$ 0,00";
        const formaPgto = d.formaPagamento || d.formaEntrada || "-";

        const vBate = vFiltro === "todos" || d.vendedor === vFiltro || (d.vendedor || "").startsWith(vFiltro);
        const mBate = mFiltro === "todos" || mesReferencia === mFiltro;
        const aBate = aFiltro === "todos" || anoVenda === aFiltro;

        if (vBate && mBate && aBate) {
            const status = d.statusFinanceiro === "Pago" ? "Pago" : "Pendente";
            const classeStatus = status === "Pago" ? "pago" : "pendente";

            html += `
                <tr>
                    <td style="font-size: 0.8rem; color: #888;">${escapeHTML(dataExibicao)}</td>
                    <td>${escapeHTML(d.vendedor || '-')}</td>
                    <td style="font-weight: bold;">${escapeHTML(clienteNome)}</td>
                    <td>${escapeHTML(d.telefone || '-')}</td>
                    <td style="color: var(--accent); font-weight: bold;">${escapeHTML(valorMensal)}</td>
                    <td>${escapeHTML(valorEntrada)}</td>
                    <td>${escapeHTML(formaPgto)}</td>
                    <td>
                        <button class="badge-status ${classeStatus}" data-id="${escapeHTML(d.id)}" data-status="${status}">
                            ${status}
                        </button>
                    </td>
                </tr>
            `;
        }
    });

    listaCorpo.innerHTML = html;
};

onSnapshot(collection(db, "vendas"), (snap) => {
    dadosFinanceiro = docsOrdenados(snap);
    renderizarFinanceiro();
});

selVendedor.addEventListener('change', renderizarFinanceiro);
selMes.addEventListener('change', renderizarFinanceiro);
selAno.addEventListener('change', renderizarFinanceiro);
