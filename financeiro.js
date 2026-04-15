import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth(app);

// Verifica se o usuário está logado
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Se não estiver logado, manda de volta para o login
        window.location.href = "login.html";
    }
});
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const listaCorpo = document.getElementById('listaFinanceiroCorpo');
const selVendedor = document.getElementById('filtroVendedorFin');
const selMes = document.getElementById('filtroMesFin');
const selAno = document.getElementById('filtroAnoFin');

let dadosFinanceiro = [];

// Função para atualizar as vezes/parcelas
window.atualizarVezes = async (id, valor) => {
    try {
        await updateDoc(doc(db, "vendas", id), { vezes: valor });
    } catch (error) {
        console.error("Erro ao atualizar parcelas:", error);
    }
};

// Função para atualizar o status de pagamento
window.atualizarStatusPago = async (id, status) => {
    try {
        await updateDoc(doc(db, "vendas", id), { pago: status });
    } catch (error) {
        console.error("Erro ao atualizar status de pagamento:", error);
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
            const dataF = dataObjeto ? dataObjeto.toLocaleDateString('pt-BR') : "---";
            
            let optionsVezes = "";
            for (let i = 1; i <= 12; i++) {
                const selected = d.vezes == i ? "selected" : "";
                optionsVezes += `<option value="${i}" ${selected}>${i}x</option>`;
            }

            const isChecked = d.pago === true ? "checked" : "";

            listaCorpo.innerHTML += `
                <tr>
                    <td style="font-size: 0.8rem; color: #888;">${dataF}</td>
                    <td>${d.vendedor}</td>
                    <td style="font-weight: bold;">${d.cliente}</td>
                    <td>${d.telefone}</td>
                    <td>${d.vigencia}</td>
                    <td>${d.dataPgtoInicial || "---"}</td>
                    <td style="color: var(--accent);">${d.mensalidadePlano || "---"}</td>
                    <td>${d.pagamentoInicial || "---"}</td>
                    <td style="text-align: center;">
                        <input type="checkbox" ${isChecked} onchange="atualizarStatusPago('${d.id}', this.checked)" style="cursor:pointer; transform: scale(1.2);">
                    </td>
                    <td>${d.formaPagamento}</td>
                    <td>
                        <select onchange="atualizarVezes('${d.id}', this.value)" style="padding: 5px; font-size: 0.8rem;">
                            ${optionsVezes}
                        </select>
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