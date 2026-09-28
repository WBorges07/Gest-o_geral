import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { escapeHTML, docsOrdenados, renderAdiavel } from "./util.js";
import { botaoOlhoHTML, ativarOlhos } from "./detalhes.js";

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

const listaCSCorpo = document.getElementById('listaCSCorpo');
const filtroVendedorCS = document.getElementById('filtroVendedorCS');
const filtroMesCS = document.getElementById('filtroMesCS');
const filtroAnoCS = document.getElementById('filtroAnoCS');

let vendasCSCache = [];

// Ícone de olho -> abre a janela flutuante com todas as informações do cliente
ativarOlhos(listaCSCorpo, (id) => vendasCSCache.find(v => v.id === id));

const aplicarClasseStatusCS = (selectEl, valor) => {
    selectEl.classList.remove('agendado', 'realizado', 'cancelado');
    if (valor === "Sim") selectEl.classList.add('realizado');
    if (valor === "Não") selectEl.classList.add('cancelado');
};

const renderizarTabelaCS = () => {
    const selVendedor = filtroVendedorCS.value;
    const selMes = filtroMesCS.value;
    const selAno = filtroAnoCS.value;

    listaCSCorpo.innerHTML = "";

    const filtrados = vendasCSCache.filter(venda => {
        let matchVendedor = (selVendedor === "todos" || venda.vendedor === selVendedor || (venda.vendedor || "").startsWith(selVendedor));
        let matchMes = (selMes === "todos" || venda.pagamentoMes === selMes);

        let matchAno = true;
        if (selAno !== "todos" && venda.dataPgtoInicial) {
            const partes = venda.dataPgtoInicial.split('/');
            if (partes.length === 3) {
                matchAno = (partes[2] === selAno);
            }
        }

        return matchVendedor && matchMes && matchAno;
    });

    filtrados.forEach(venda => {
        const tr = document.createElement('tr');

        const jaInvestia = venda.jaInvestia || "Não";
        const nomeEscritorio = venda.nomeEscritorio || "";
        const telefoneCampanha = venda.telefoneCampanha || "";
        const dataOnboarding = venda.dataOnboarding || "";
        const horarioOnboarding = venda.horarioOnboarding || "";
        const squad = venda.squad || "";
        const instagram = venda.instagram || "";
        const enderecoCompleto = venda.enderecoCompleto || "-";
        const cep = venda.cep || "-";
        const onboardingAconteceu = venda.onboardingAconteceu || "Não";
        const anotacoesCS = venda.anotacoesCS || "";

        tr.innerHTML = `
            <td>${botaoOlhoHTML(venda.id)}</td>
            <td>${escapeHTML(venda.dataPgtoInicial || '-')}</td>
            <td>
                <select class="select-jainvestiu-cs" data-id="${escapeHTML(venda.id)}" style="padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--input); color: var(--text);">
                    <option value="Sim" ${jaInvestia === "Sim" ? "selected" : ""}>Sim</option>
                    <option value="Não" ${jaInvestia === "Não" ? "selected" : ""}>Não</option>
                </select>
            </td>
            <td>${escapeHTML(venda.vendedor || '-')}</td>
            <td>${escapeHTML(venda.nomeCliente || '-')}</td>
            <td>
                <input type="text" class="input-escritorio-cs" data-id="${escapeHTML(venda.id)}" value="${escapeHTML(nomeEscritorio)}" placeholder="Nome do escritório" style="width: 140px; padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--input); color: var(--text);">
            </td>
            <td>${escapeHTML(venda.telefone || '-')}</td>
            <td>
                <input type="text" class="input-tel-campanha-cs" data-id="${escapeHTML(venda.id)}" value="${escapeHTML(telefoneCampanha)}" placeholder="(00) 00000-0000" style="width: 130px; padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--input); color: var(--text);">
            </td>
            <td>
                <input type="date" class="input-data-onboarding" data-id="${escapeHTML(venda.id)}" value="${escapeHTML(dataOnboarding)}" style="padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--input); color: var(--text);">
            </td>
            <td>
                <input type="time" class="input-horario-onboarding" data-id="${escapeHTML(venda.id)}" value="${escapeHTML(horarioOnboarding)}" style="padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--input); color: var(--text);">
            </td>
            <td>
                <select class="select-squad-cs" data-id="${escapeHTML(venda.id)}" style="padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--input); color: var(--text);">
                    <option value="" ${squad === "" ? "selected" : ""}>Selecione...</option>
                    <option value="Squad Black Mamba" ${squad === "Squad Black Mamba" ? "selected" : ""}>Squad Black Mamba</option>
                    <option value="Squad Titans" ${squad === "Squad Titans" ? "selected" : ""}>Squad Titans</option>
                </select>
            </td>
            <td>
                <input type="text" class="input-instagram-cs" data-id="${escapeHTML(venda.id)}" value="${escapeHTML(instagram)}" placeholder="@usuario" style="width: 110px; padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--input); color: var(--text);">
            </td>
            <td>${escapeHTML(enderecoCompleto)}</td>
            <td>${escapeHTML(cep)}</td>
            <td>
                <select class="select-status-cs" data-id="${escapeHTML(venda.id)}">
                    <option value="Sim" ${onboardingAconteceu === "Sim" ? "selected" : ""}>Sim</option>
                    <option value="Não" ${onboardingAconteceu === "Não" ? "selected" : ""}>Não</option>
                </select>
            </td>
            <td>${escapeHTML(venda.plano || '-')}</td>
            <td>${escapeHTML(venda.repagInstagram || '-')}</td>
            <td>
                <textarea class="input-textarea-cs input-anotacoes-cs" data-id="${escapeHTML(venda.id)}" placeholder="Digitar anotações...">${escapeHTML(anotacoesCS)}</textarea>
            </td>
        `;

        listaCSCorpo.appendChild(tr);
    });

    // Eventos e Máscaras
    document.querySelectorAll('.select-jainvestiu-cs').forEach(select => {
        select.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { jaInvestia: val });
        });
    });

    document.querySelectorAll('.input-escritorio-cs').forEach(input => {
        input.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { nomeEscritorio: val });
        });
    });

    document.querySelectorAll('.input-tel-campanha-cs').forEach(input => {
        if (window.IMask) IMask(input, { mask: '(00) 00000-0000' });
        input.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { telefoneCampanha: val });
        });
    });

    document.querySelectorAll('.input-data-onboarding').forEach(input => {
        input.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { dataOnboarding: val });
        });
    });

    document.querySelectorAll('.input-horario-onboarding').forEach(input => {
        input.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { horarioOnboarding: val });
        });
    });

    document.querySelectorAll('.select-squad-cs').forEach(select => {
        select.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { squad: val });
        });
    });

    document.querySelectorAll('.input-instagram-cs').forEach(input => {
        input.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { instagram: val });
        });
    });

    document.querySelectorAll('.select-status-cs').forEach(select => {
        aplicarClasseStatusCS(select, select.value);
        select.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            aplicarClasseStatusCS(e.target, val);
            await updateDoc(doc(db, "vendas", id), { onboardingAconteceu: val });
        });
    });

    document.querySelectorAll('.input-anotacoes-cs').forEach(textarea => {
        textarea.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { anotacoesCS: val });
        });
    });
};

filtroVendedorCS.addEventListener('change', renderizarTabelaCS);
filtroMesCS.addEventListener('change', renderizarTabelaCS);
filtroAnoCS.addEventListener('change', renderizarTabelaCS);

const renderSeguro = renderAdiavel(listaCSCorpo, renderizarTabelaCS);
onSnapshot(collection(db, "vendas"), (snapshot) => {
    vendasCSCache = docsOrdenados(snapshot);
    renderSeguro();
});