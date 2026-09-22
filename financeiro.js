import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

window.alternarStatusPagamento = async (id, statusAtual) => {
    const novoStatus = statusAtual === "Pago" ? "Pendente" : "Pago";
    try {
        await updateDoc(doc(db, "vendas", id), {
            statusFinanceiro: novoStatus
        });
    } catch (error) {
        console.error("Erro ao atualizar status financeiro:", error);
    }
};

const renderizarFinanceiro = () => {
    const vFiltro = selVendedor.value;
    const mFiltro = selMes.value;
    const aFiltro = selAno.value;

    listaCorpo.innerHTML = "";

    dadosFinanceiro.forEach(d => {
        const dataObjeto = d.dataCadastro?.seconds ? new Date(d.dataCadastro.seconds * 1000) : null;
        const anoVenda = dataObjeto ? dataObjeto.getFullYear().toString() : "";

        const vBate = vFiltro === "todos" || d.vendedor === vFiltro;
        const mBate = mFiltro === "todos" || d.primeiroPagamentoMes === mFiltro;
        const aBate = aFiltro === "todos" || anoVenda === aFiltro;

        if (vBate && mBate && aBate) {
            const dataVendaF = dataObjeto ? dataObjeto.toLocaleDateString('pt-BR') : "---";
            const status = d.statusFinanceiro || "Pendente";
            const classeStatus = status === "Pago" ? "pago" : "pendente";

            listaCorpo.innerHTML += `
                <tr>
                    <td style="font-size: 0.8rem; color: #888;">${dataVendaF}</td>
                    <td>${d.vendedor || '-'}</td>
                    <td style="font-weight: bold;">${d.cliente || '-'}</td>
                    <td>${d.telefone || '-'}</td>
                    <td style="color: var(--accent); font-weight: bold;">${d.valorTotal || d.mensalidadePlano || 'R$ 0,00'}</td>
                    <td>${d.valorEntrada || d.pagamentoInicial || 'R$ 0,00'}</td>
                    <td>${d.formaEntrada || d.formaPagamento || '-'}</td>
                    <td>
                        <button class="badge-status ${classeStatus}" onclick="alternarStatusPagamento('${d.id}', '${status}')">
                            ${status}
                        </button>
                    </td>
                </tr>
            `;
        }
    });
};

onSnapshot(query(collection(db, "vendas"), orderBy("dataCadastro", "desc")), (snap) => {
    dadosFinanceiro = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderizarFinanceiro();
});

selVendedor.addEventListener('change', renderizarFinanceiro);
selMes.addEventListener('change', renderizarFinanceiro);
selAno.addEventListener('change', renderizarFinanceiro);