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

// Verifica se o usuário está logado
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    }
});

// Ação de Logout
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

const listaCorpo = document.getElementById('listaTrafegoCorpo');
const selVendedor = document.getElementById('filtroVendedorTrafego');
const selMes = document.getElementById('filtroMesTrafego');
const selAno = document.getElementById('filtroAnoTrafego');
const tabBtns = document.querySelectorAll('.tab-btn');

let dadosTrafego = [];
let squadFiltroAtivo = "todos";

// Alternar entre as abas de Squad
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        squadFiltroAtivo = btn.getAttribute('data-squad');
        renderizarTrafego();
    });
});

window.atualizarCampoTrafego = async (id, campo, valor) => {
    try {
        await updateDoc(doc(db, "vendas", id), { [campo]: valor });
    } catch (error) {
        console.error("Erro ao atualizar gestão de tráfego:", error);
    }
};

// Formatação dinâmica para moeda Real (R$)
window.formatarEAtualizarMoeda = (input, id, campo) => {
    let valor = input.value.replace(/\D/g, "");
    if (!valor) {
        input.value = "";
        atualizarCampoTrafego(id, campo, "");
        return;
    }
    valor = (parseFloat(valor) / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
    input.value = valor;
    atualizarCampoTrafego(id, campo, valor);
};

// Atualizar cores do campo Campanha
window.atualizarCorCampanha = (selectElement, id) => {
    const valor = selectElement.value;
    selectElement.className = "select-status";
    
    if (valor === "Rodando") {
        selectElement.classList.add("rodando");
    } else if (valor === "Pausada") {
        selectElement.classList.add("pausada");
    } else if (valor === "Encerrada") {
        selectElement.classList.add("encerrada");
    }

    atualizarCampoTrafego(id, 'statusCampanha', valor);
};

// Atualizar cores do campo Satisfação
window.atualizarCorSatisfacao = (selectElement, id) => {
    const valor = selectElement.value;
    selectElement.className = "select-status";
    
    if (valor === "Satisfeito") {
        selectElement.classList.add("satisfeito");
    } else if (valor === "Alerta") {
        selectElement.classList.add("alerta");
    } else if (valor === "Insatisfeito") {
        selectElement.classList.add("insatisfeito");
    }

    atualizarCampoTrafego(id, 'statusSatisfacao', valor);
};

// Atualizar cores do campo Tendência
window.atualizarCorTendencia = (selectElement, id) => {
    const valor = selectElement.value;
    selectElement.className = "select-status";
    
    if (valor === "Subir") {
        selectElement.classList.add("subir");
    } else if (valor === "Manter") {
        selectElement.classList.add("manter");
    } else if (valor === "Descer") {
        selectElement.classList.add("descer");
    }

    atualizarCampoTrafego(id, 'statusTendencia', valor);
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
            const squadBate = squadFiltroAtivo === "todos" || d.squad === squadFiltroAtivo;

            if (vBate && mBate && aBate && squadBate) {
                const dataVendaF = dataObjeto ? dataObjeto.toLocaleDateString('pt-BR') : "---";
                const socialOpcaoSim = d.socialMidia === "Sim" ? "selected" : "";
                const socialOpcaoNao = d.socialMidia === "Não" ? "selected" : "";

                const campanhaAtual = d.statusCampanha || "";
                let classeCampanha = "";
                if (campanhaAtual === "Rodando") classeCampanha = "rodando";
                else if (campanhaAtual === "Pausada") classeCampanha = "pausada";
                else if (campanhaAtual === "Encerrada") classeCampanha = "encerrada";

                const satisfacaoAtual = d.statusSatisfacao || "";
                let classeSatisfacao = "";
                if (satisfacaoAtual === "Satisfeito") classeSatisfacao = "satisfeito";
                else if (satisfacaoAtual === "Alerta") classeSatisfacao = "alerta";
                else if (satisfacaoAtual === "Insatisfeito") classeSatisfacao = "insatisfeito";

                const tendenciaAtual = d.statusTendencia || "";
                let classeTendencia = "";
                if (tendenciaAtual === "Subir") classeTendencia = "subir";
                else if (tendenciaAtual === "Manter") classeTendencia = "manter";
                else if (tendenciaAtual === "Descer") classeTendencia = "descer";

                listaCorpo.innerHTML += `
                    <tr>
                        <td style="font-size: 0.8rem; color: #888;">${dataVendaF}</td>
                        <td>${d.vendedor}</td>
                        <td style="font-weight: bold;">${d.cliente}</td>
                        <td>${d.telefone}</td>
                        <td>
                            <select class="select-status ${classeCampanha}" onchange="atualizarCorCampanha(this, '${d.id}')">
                                <option value="">Selecione...</option>
                                <option value="Rodando" ${campanhaAtual === "Rodando" ? "selected" : ""}>Rodando</option>
                                <option value="Pausada" ${campanhaAtual === "Pausada" ? "selected" : ""}>Pausada</option>
                                <option value="Encerrada" ${campanhaAtual === "Encerrada" ? "selected" : ""}>Encerrada</option>
                            </select>
                        </td>
                        <td>
                            <select class="select-status ${classeSatisfacao}" onchange="atualizarCorSatisfacao(this, '${d.id}')">
                                <option value="">Selecione...</option>
                                <option value="Satisfeito" ${satisfacaoAtual === "Satisfeito" ? "selected" : ""}>Satisfeito</option>
                                <option value="Alerta" ${satisfacaoAtual === "Alerta" ? "selected" : ""}>Alerta</option>
                                <option value="Insatisfeito" ${satisfacaoAtual === "Insatisfeito" ? "selected" : ""}>Insatisfeito</option>
                            </select>
                        </td>
                        <td>
                            <input type="text" class="input-real-trafego" value="${d.cpl || ''}" 
                                placeholder="R$ 0,00" onblur="formatarEAtualizarMoeda(this, '${d.id}', 'cpl')">
                        </td>
                        <td>
                            <select class="select-status ${classeTendencia}" onchange="atualizarCorTendencia(this, '${d.id}')">
                                <option value="">Selecione...</option>
                                <option value="Subir" ${tendenciaAtual === "Subir" ? "selected" : ""}>⬆ Subir</option>
                                <option value="Manter" ${tendenciaAtual === "Manter" ? "selected" : ""}>➡ Manter</option>
                                <option value="Descer" ${tendenciaAtual === "Descer" ? "selected" : ""}>⬇ Descer</option>
                            </select>
                        </td>
                        <td>
                            <input type="text" class="input-real-trafego" value="${d.orcamento || ''}" 
                                placeholder="R$ 0,00" onblur="formatarEAtualizarMoeda(this, '${d.id}', 'orcamento')">
                        </td>
                        <td>
                            <input type="text" class="input-real-trafego" value="${d.saldoRestante || ''}" 
                                placeholder="R$ 0,00" onblur="formatarEAtualizarMoeda(this, '${d.id}', 'saldoRestante')">
                        </td>
                        <td><span class="badge-area">${d.areaAtuacao || "Não Inf."}</span></td>
                        <td>
                            <textarea class="input-textarea-trafego" onblur="atualizarCampoTrafego('${d.id}', 'teses', this.value)" 
                                placeholder="Estratégia...">${d.teses || ""}</textarea>
                        </td>
                        <td>
                            <textarea class="input-textarea-trafego" onblur="atualizarCampoTrafego('${d.id}', 'observacoes', this.value)" 
                                placeholder="Notas...">${d.observacoes || ""}</textarea>
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