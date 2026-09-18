import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

// Verifica se o utilizador está autenticado
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    }
});

const listaCorpo = document.getElementById('listaFinanceiroCorpo');
const selVendedor = document.getElementById('filtroVendedorFin');
const selMes = document.getElementById('filtroMesFin');
const selAno = document.getElementById('filtroAnoFin');

let dadosFinanceiro = [];

// Funções globais para atualizar os campos de pagamento no Firebase
window.atualizarStatusPago = async (id, status) => {
    try {
        await updateDoc(doc(db, "vendas", id), { pago: status });
    } catch (error) {
        console.error("Erro ao atualizar status de pagamento:", error);
    }
};

window.atualizarVezes = async (id, quantidade) => {
    try {
        await updateDoc(doc(db, "vendas", id), { vezes: quantidade });
    } catch (error) {
        console.error("Erro ao atualizar quantidade de vezes:", error);
    }
};

const renderizarFinanceiro = () => {
    const mesFiltro = selMes.value;
    const anoFiltro = selAno.value;
    const vendedorFiltro = selVendedor.value;

    listaCorpo.innerHTML = "";

    dadosFinanceiro.forEach(d => {
        // Filtros combinados de Mês, Ano e Vendedor
        const condMes = mesFiltro === "todos" || d.primeiroPagamentoMes === mesFiltro;
        const condAno = anoFiltro === "todos" || d.primeiroPagamentoAno === anoFiltro;
        const condVend = vendedorFiltro === "todos" || d.vendedor === vendedorFiltro;

        if (condMes && condAno && condVend) {
            const isChecked = d.pago ? "checked" : "";
            const dataF = d.dataCadastro?.seconds ? new Date(d.dataCadastro.seconds * 1000).toLocaleDateString('pt-BR') : "--/--/----";
            
            listaCorpo.innerHTML += `
                <tr>
                    <td>${dataF}</td>
                    <td>${d.vendedor || '---'}</td>
                    <td><b>${d.cliente || '---'}</b></td>
                    <td>${d.telefone || '---'}</td>
                    <td>${d.vigencia || '---'}</td>
                    <td>${d.dataPgtoInicial || "---"}</td>
                    <td style="color: var(--accent);">${d.mensalidadePlano || "---"}</td>
                    <td>${d.pagamentoInicial || "---"}</td>
                    <td style="text-align: center;">
                        <input type="checkbox" ${isChecked} onchange="atualizarStatusPago('${d.id}', this.checked)">
                    </td>
                    <td>${d.formaPagamento || '---'}</td>
                    <td>
                        <select onchange="atualizarVezes('${d.id}', this.value)">
                            <option value="1" ${d.vezes == "1" ? "selected" : ""}>1x</option>
                            <option value="2" ${d.vezes == "2" ? "selected" : ""}>2x</option>
                            <option value="3" ${d.vezes == "3" ? "selected" : ""}>3x</option>
                        </select>
                    </td>
                </tr>
            `;
        }
    });
};

// Escuta em tempo real a coleção de vendas
onSnapshot(query(collection(db, "vendas"), orderBy("dataCadastro", "desc")), (snap) => {
    dadosFinanceiro = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderizarFinanceiro();
});

// Event Listeners dos Filtros
selVendedor.addEventListener('change', renderizarFinanceiro);
selMes.addEventListener('change', renderizarFinanceiro);
selAno.addEventListener('change', renderizarFinanceiro);