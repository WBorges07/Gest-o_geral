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

const listaCorpo = document.getElementById('listaTrafegoCorpo');
const selVendedor = document.getElementById('filtroVendedorTrafego');
const selMes = document.getElementById('filtroMesTrafego');
const selAno = document.getElementById('filtroAnoTrafego');

let dadosTrafego = [];

window.atualizarCampoTrafego = async (id, campo, valor) => {
    try {
        await updateDoc(doc(db, "vendas", id), { [campo]: valor });
    } catch (error) {
        console.error("Erro ao atualizar gestão de tráfego:", error);
    }
};

const renderizarTrafego = () => {
    const vFiltro = selVendedor.value;
    const mFiltro = selMes.value;
    const aFiltro = selAno.value;
    
    listaCorpo.innerHTML = "";

    dadosTrafego.forEach(d => {
        // Exibe apenas se o Onboarding foi ticado na página CS
        if (d.onboardingAconteceu === true) {
            
            const dataObjeto = d.dataCadastro?.seconds ? new Date(d.dataCadastro.seconds * 1000) : null;
            const anoVenda = dataObjeto ? dataObjeto.getFullYear().toString() : "";

            const vBate = vFiltro === "todos" || d.vendedor === vFiltro;
            const mBate = mFiltro === "todos" || d.primeiroPagamentoMes === mFiltro;
            const aBate = aFiltro === "todos" || anoVenda === aFiltro;

            if (vBate && mBate && aBate) {
                const dataVendaF = dataObjeto ? dataObjeto.toLocaleDateString('pt-BR') : "---";
                const socialOpcaoSim = d.socialMidia === "Sim" ? "selected" : "";
                const socialOpcaoNao = d.socialMidia === "Não" ? "selected" : "";

                listaCorpo.innerHTML += `
                    <tr>
                        <td style="font-size: 0.8rem; color: #888;">${dataVendaF}</td>
                        <td>${d.vendedor}</td>
                        <td style="font-weight: bold;">${d.cliente}</td>
                        <td>${d.telefone}</td>
                        <td><span class="badge-area">${d.areaAtuacao || "Não Inf."}</span></td>
                        <td>
                            <textarea readonly style="width: 100%; min-height: 40px; background: rgba(255,255,255,0.05); border: 1px solid #444; color: #ccc; cursor: not-allowed;">${d.teses || "Sem teses cadastradas"}</textarea>
                        </td>
                        <td>
                            <textarea readonly style="width: 100%; min-height: 40px; background: rgba(255,255,255,0.05); border: 1px solid #444; color: #ccc; cursor: not-allowed;">${d.observacoes || "Sem observações"}</textarea>
                        </td>
                        <td>
                            <select onchange="atualizarCampoTrafego('${d.id}', 'socialMidia', this.value)" style="padding: 5px;">
                                <option value="">Escolha...</option>
                                <option value="Sim" ${socialOpcaoSim}>Sim</option>
                                <option value="Não" ${socialOpcaoNao}>Não</option>
                            </select>
                        </td>
                    </tr>
                `;
            }
        }
    });
};

onSnapshot(query(collection(db, "vendas"), orderBy("dataCadastro", "desc")), (snap) => {
    dadosTrafego = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderizarTrafego();
});

selVendedor.addEventListener('change', renderizarTrafego);
selMes.addEventListener('change', renderizarTrafego);
selAno.addEventListener('change', renderizarTrafego);