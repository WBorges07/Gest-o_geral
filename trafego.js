import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

const listaTrafegoCorpo = document.getElementById('listaTrafegoCorpo');
const tabBtns = document.querySelectorAll('.tab-btn');

let vendasTrafegoCache = [];
let squadFiltro = "todos";

tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        tabBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        squadFiltro = e.target.getAttribute('data-squad');
        renderizarTabelaTrafego();
    });
});

const aplicarClasseStatus = (selectEl, valor) => {
    selectEl.classList.remove('subindo', 'ativo', 'pausado');
    if (valor === "Subindo Campanha") selectEl.classList.add('subindo');
    if (valor === "Ativo") selectEl.classList.add('ativo');
    if (valor === "Pausado") selectEl.classList.add('pausado');
};

const aplicarClasseTendencia = (selectEl, valor) => {
    selectEl.classList.remove('subir', 'manter', 'descer');
    if (valor === "Subir") selectEl.classList.add('subir');
    if (valor === "Manter") selectEl.classList.add('manter');
    if (valor === "Descer") selectEl.classList.add('descer');
};

const aplicarClasseSatisfacao = (selectEl, valor) => {
    selectEl.classList.remove('satisfeito', 'alerta', 'insatisfeito');
    if (valor === "Satisfeito") selectEl.classList.add('satisfeito');
    if (valor === "Alerta") selectEl.classList.add('alerta');
    if (valor === "Insatisfeito") selectEl.classList.add('insatisfeito');
};

const renderizarTabelaTrafego = () => {
    listaTrafegoCorpo.innerHTML = "";

    // Filtra apenas clientes onde Onboarding aconteceu = "Sim"
    const filtrados = vendasTrafegoCache.filter(venda => {
        const matchOnboarding = venda.onboardingAconteceu === "Sim";
        const matchSquad = squadFiltro === "todos" || venda.squad === squadFiltro;
        return matchOnboarding && matchSquad;
    });

    filtrados.forEach(venda => {
        const tr = document.createElement('tr');

        const telefoneCliente = venda.telefoneCliente || venda.telefone || "-";
        const gestorTrafego = venda.gestorTrafego || "";
        const statusCampanha = venda.statusCampanha || "Subindo Campanha";
        const cplTrafego = venda.cplTrafego || "";
        const tendenciaTrafego = venda.tendenciaTrafego || "Manter";
        const orcamentoTrafego = venda.orcamentoTrafego || "";
        const saldoRestanteTrafego = venda.saldoRestanteTrafego || "";
        const satisfacao = venda.satisfacao || "Satisfeito";
        const estrategiaTrafego = venda.estrategiaTrafego || "";
        const observacoesTrafego = venda.observacoesTrafego || "";

        tr.innerHTML = `
            <td style="font-weight: bold;">${venda.nomeCliente || '-'}</td>
            <td>${telefoneCliente}</td>
            <td><span style="background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border);">${venda.squad || 'Não atribuído'}</span></td>
            <td>
                <input type="text" class="input-gestor" data-id="${venda.id}" value="${gestorTrafego}" placeholder="Nome do Gestor..." style="width: 100%; padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--input); color: var(--text);">
            </td>
            <td style="color: var(--accent); font-weight: bold;">${venda.investimento || 'R$ 0,00'}</td>
            <td>${venda.plataformaInicio || '-'}</td>
            <td>
                <select class="select-status-trafego" data-id="${venda.id}">
                    <option value="Subindo Campanha" ${statusCampanha === "Subindo Campanha" ? "selected" : ""}>Subindo Campanha</option>
                    <option value="Ativo" ${statusCampanha === "Ativo" ? "selected" : ""}>Ativo</option>
                    <option value="Pausado" ${statusCampanha === "Pausado" ? "selected" : ""}>Pausado</option>
                </select>
            </td>
            <td>
                <input type="text" class="input-moeda-trafego input-cpl" data-id="${venda.id}" value="${cplTrafego}" placeholder="R$ 0,00">
            </td>
            <td>
                <select class="select-tendencia" data-id="${venda.id}">
                    <option value="Subir" ${tendenciaTrafego === "Subir" ? "selected" : ""}>⬆️ Subir</option>
                    <option value="Manter" ${tendenciaTrafego === "Manter" ? "selected" : ""}>➡ Manter</option>
                    <option value="Descer" ${tendenciaTrafego === "Descer" ? "selected" : ""}>⬇️ Descer</option>
                </select>
            </td>
            <td>
                <input type="text" class="input-moeda-trafego input-orcamento" data-id="${venda.id}" value="${orcamentoTrafego}" placeholder="R$ 0,00">
            </td>
            <td>
                <input type="text" class="input-moeda-trafego input-saldo" data-id="${venda.id}" value="${saldoRestanteTrafego}" placeholder="R$ 0,00">
            </td>
            <td>
                <select class="select-satisfacao" data-id="${venda.id}">
                    <option value="Satisfeito" ${satisfacao === "Satisfeito" ? "selected" : ""}>Satisfeito</option>
                    <option value="Alerta" ${satisfacao === "Alerta" ? "selected" : ""}>Alerta</option>
                    <option value="Insatisfeito" ${satisfacao === "Insatisfeito" ? "selected" : ""}>Insatisfeito</option>
                </select>
            </td>
            <td>
                <textarea class="input-textarea-trafego input-estrategia" data-id="${venda.id}" placeholder="Digitar estratégia...">${estrategiaTrafego}</textarea>
            </td>
            <td>
                <textarea class="input-textarea-trafego input-obs-trafego" data-id="${venda.id}" placeholder="Digitar observações...">${observacoesTrafego}</textarea>
            </td>
        `;

        listaTrafegoCorpo.appendChild(tr);
    });

    // Eventos e Máscaras de Moeda
    const maskMoedaOptions = {
        mask: 'R$ num',
        blocks: {
            num: {
                mask: Number,
                thousandsSeparator: '.',
                radix: ',',
                mapToRadix: ['.']
            }
        }
    };

    // Máscara CPL
    document.querySelectorAll('.input-cpl').forEach(input => {
        if (window.IMask) IMask(input, maskMoedaOptions);
        input.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { cplTrafego: val });
        });
    });

    // Máscara Orçamento
    document.querySelectorAll('.input-orcamento').forEach(input => {
        if (window.IMask) IMask(input, maskMoedaOptions);
        input.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { orcamentoTrafego: val });
        });
    });

    // Máscara Saldo Restante
    document.querySelectorAll('.input-saldo').forEach(input => {
        if (window.IMask) IMask(input, maskMoedaOptions);
        input.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { saldoRestanteTrafego: val });
        });
    });

    // Gestor
    document.querySelectorAll('.input-gestor').forEach(input => {
        input.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { gestorTrafego: val });
        });
    });

    // Status da Campanha
    document.querySelectorAll('.select-status-trafego').forEach(select => {
        aplicarClasseStatus(select, select.value);
        select.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            aplicarClasseStatus(e.target, val);
            await updateDoc(doc(db, "vendas", id), { statusCampanha: val });
        });
    });

    // Tendência
    document.querySelectorAll('.select-tendencia').forEach(select => {
        aplicarClasseTendencia(select, select.value);
        select.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            aplicarClasseTendencia(e.target, val);
            await updateDoc(doc(db, "vendas", id), { tendenciaTrafego: val });
        });
    });

    // Satisfação
    document.querySelectorAll('.select-satisfacao').forEach(select => {
        aplicarClasseSatisfacao(select, select.value);
        select.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            aplicarClasseSatisfacao(e.target, val);
            await updateDoc(doc(db, "vendas", id), { satisfacao: val });
        });
    });

    // Estratégia
    document.querySelectorAll('.input-estrategia').forEach(textarea => {
        textarea.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { estrategiaTrafego: val });
        });
    });

    // Observações
    document.querySelectorAll('.input-obs-trafego').forEach(textarea => {
        textarea.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { observacoesTrafego: val });
        });
    });
};

const q = query(collection(db, "vendas"), orderBy("dataCadastro", "desc"));
onSnapshot(q, (snapshot) => {
    vendasTrafegoCache = [];
    snapshot.forEach((doc) => {
        vendasTrafegoCache.push({ id: doc.id, ...doc.data() });
    });
    renderizarTabelaTrafego();
});