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

// Verifica se o usuário está logado
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    }
});

const listaCorpo = document.getElementById('listaCSCorpo');
const selVendedor = document.getElementById('filtroVendedorCS');
const selMes = document.getElementById('filtroMesCS');
const selAno = document.getElementById('filtroAnoCS');

let dadosCS = [];

// Função para atualizar campos em tempo real no Firebase
window.atualizarCampoCS = async (id, campo, valor) => {
    try {
        await updateDoc(doc(db, "vendas", id), { [campo]: valor });
    } catch (error) {
        console.error("Erro ao atualizar campo CS:", error);
    }
};

// Função para alternar as classes de cor do select de Material
window.atualizarCorMaterial = (selectElement, id) => {
    const valor = selectElement.value;
    selectElement.className = "select-material";
    
    if (valor === "Material entregue") {
        selectElement.classList.add("entregue");
    } else if (valor === "Material em revisão") {
        selectElement.classList.add("revisao");
    } else if (valor === "Material aprovado") {
        selectElement.classList.add("aprovado");
    }

    atualizarCampoCS(id, 'statusMaterial', valor);
};

const renderizarCS = () => {
    const vFiltro = selVendedor.value;
    const mFiltro = selMes.value;
    const aFiltro = selAno.value;
    
    listaCorpo.innerHTML = "";

    dadosCS.forEach(d => {
        const dataObjeto = d.dataCadastro?.seconds ? new Date(d.dataCadastro.seconds * 1000) : null;
        const anoVenda = dataObjeto ? dataObjeto.getFullYear().toString() : "";

        const vBate = vFiltro === "todos" || d.vendedor === vFiltro;
        const mBate = mFiltro === "todos" || d.primeiroPagamentoMes === mFiltro;
        const aBate = aFiltro === "todos" || anoVenda === aFiltro;

        if (vBate && mBate && aBate) {
            const dataVendaF = dataObjeto ? dataObjeto.toLocaleDateString('pt-BR') : "---";
            const onAconteceu = d.onboardingAconteceu === true ? "checked" : "";
            const squadAtual = d.squad || "";
            const materialAtual = d.statusMaterial || "";

            let classeCor = "";
            if (materialAtual === "Material entregue") classeCor = "entregue";
            else if (materialAtual === "Material em revisão") classeCor = "revisao";
            else if (materialAtual === "Material aprovado") classeCor = "aprovado";

            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="font-size: 0.8rem; color: #888;">${dataVendaF}</td>
                <td>${d.vendedor}</td>
                <td style="font-weight: bold;">${d.cliente}</td>
                <td>${d.telefone}</td>
                <td>
                    <input type="text" class="mask-date" value="${d.dataOnboarding || ''}" 
                        onblur="atualizarCampoCS('${d.id}', 'dataOnboarding', this.value)" 
                        placeholder="DD/MM/AAAA" style="width: 100px;">
                </td>
                <td>
                    <input type="text" class="mask-time" value="${d.horarioOnboarding || ''}" 
                        onblur="atualizarCampoCS('${d.id}', 'horarioOnboarding', this.value)" 
                        placeholder="00:00" style="width: 60px;">
                </td>
                <td style="text-align: center;">
                    <input type="checkbox" ${onAconteceu} 
                        onchange="atualizarCampoCS('${d.id}', 'onboardingAconteceu', this.checked)" 
                        style="cursor:pointer; transform: scale(1.2);">
                </td>
                <td>
                    <select onchange="atualizarCampoCS('${d.id}', 'squad', this.value)" style="padding: 5px;">
                        <option value="">Selecione...</option>
                        <option value="Squad Black Mamba" ${squadAtual === "Squad Black Mamba" ? "selected" : ""}>Squad Black Mamba</option>
                        <option value="Squad Titans" ${squadAtual === "Squad Titans" ? "selected" : ""}>Squad Titans</option>
                    </select>
                </td>
                <td><span class="badge-area">${d.areaAtuacao || "Não Inf."}</span></td>
                <td>
                    <select class="select-material ${classeCor}" onchange="atualizarCorMaterial(this, '${d.id}')">
                        <option value="">Selecione...</option>
                        <option value="Material entregue" ${materialAtual === "Material entregue" ? "selected" : ""}>Material entregue</option>
                        <option value="Material em revisão" ${materialAtual === "Material em revisão" ? "selected" : ""}>Material em revisão</option>
                        <option value="Material aprovado" ${materialAtual === "Material aprovado" ? "selected" : ""}>Material aprovado</option>
                    </select>
                </td>
                <td>
                    <textarea class="input-textarea-cs" onblur="atualizarCampoCS('${d.id}', 'teses', this.value)" 
                        placeholder="Estratégia...">${d.teses || ""}</textarea>
                </td>
                <td>
                    <textarea class="input-textarea-cs" onblur="atualizarCampoCS('${d.id}', 'observacoes', this.value)" 
                        placeholder="Notas...">${d.observacoes || ""}</textarea>
                </td>
            `;
            listaCorpo.appendChild(row);

            // Aplicar máscaras nos inputs de data e hora
            const dateInput = row.querySelector('.mask-date');
            const timeInput = row.querySelector('.mask-time');

            if (typeof IMask !== "undefined") {
                IMask(dateInput, {
                    mask: Date,
                    pattern: 'd/m/Y',
                    blocks: {
                        d: { mask: IMask.MaskedRange, from: 1, to: 31, maxLength: 2 },
                        m: { mask: IMask.MaskedRange, from: 1, to: 12, maxLength: 2 },
                        Y: { mask: IMask.MaskedRange, from: 1900, to: 2100, maxLength: 4 }
                    }
                });

                IMask(timeInput, {
                    mask: 'HH:MM',
                    blocks: {
                        HH: { mask: IMask.MaskedRange, from: 0, to: 23 },
                        MM: { mask: IMask.MaskedRange, from: 0, to: 59 }
                    }
                });
            }
        }
    });
};

onSnapshot(query(collection(db, "vendas"), orderBy("dataCadastro", "desc")), (snap) => {
    dadosCS = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderizarCS();
});

selVendedor.addEventListener('change', renderizarCS);
selMes.addEventListener('change', renderizarCS);
selAno.addEventListener('change', renderizarCS);