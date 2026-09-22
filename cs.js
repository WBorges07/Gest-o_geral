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

const listaCSCorpo = document.getElementById('listaCSCorpo');
const filtroVendedorCS = document.getElementById('filtroVendedorCS');
const filtroMesCS = document.getElementById('filtroMesCS');
const filtroAnoCS = document.getElementById('filtroAnoCS');

let vendasCSCache = [];

const aplicarClasseMaterial = (selectEl, valor) => {
    selectEl.classList.remove('entregue', 'revisao', 'aprovado');
    if (valor === "Entregue") selectEl.classList.add('entregue');
    if (valor === "Em Revisão") selectEl.classList.add('revisao');
    if (valor === "Aprovado") selectEl.classList.add('aprovado');
};

const renderizarTabelaCS = () => {
    const selVendedor = filtroVendedorCS.value;
    const selMes = filtroMesCS.value;
    const selAno = filtroAnoCS.value;

    listaCSCorpo.innerHTML = "";

    const filtrados = vendasCSCache.filter(venda => {
        let matchVendedor = (selVendedor === "todos" || venda.vendedor === selVendedor);
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

        const dataOnboarding = venda.dataOnboarding || "";
        const horarioOnboarding = venda.horarioOnboarding || "";
        const onboardingAconteceu = venda.onboardingAconteceu || "Não";
        const squad = venda.squad || "";
        const statusMaterial = venda.statusMaterial || "Em Revisão";
        const tesesCS = venda.tesesCS || "";
        const observacoesCS = venda.observacoesCS || "";

        const site = venda.siteLandingPage || "-";
        const siteExibicao = site !== "-" && !site.startsWith("http") ? `https://${site}` : site;
        const linkSite = site !== "-" ? `<a href="${siteExibicao}" target="_blank" style="color: var(--accent); text-decoration: underline;">${site}</a>` : "-";

        tr.innerHTML = `
            <td>${venda.dataPgtoInicial || '-'}</td>
            <td>${venda.vendedor || '-'}</td>
            <td>${venda.nomeCliente || '-'}</td>
            <td>${venda.telefone || '-'}</td>
            <td>
                <input type="text" class="input-data-cs" data-id="${venda.id}" value="${dataOnboarding}" placeholder="DD/MM/AAAA" style="width: 100px; padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--input); color: var(--text);">
            </td>
            <td>
                <input type="text" class="input-hora-cs" data-id="${venda.id}" value="${horarioOnboarding}" placeholder="00:00" style="width: 70px; padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--input); color: var(--text);">
            </td>
            <td>
                <select class="select-onboarding" data-id="${venda.id}" style="padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--input); color: var(--text);">
                    <option value="Sim" ${onboardingAconteceu === "Sim" ? "selected" : ""}>Sim</option>
                    <option value="Não" ${onboardingAconteceu === "Não" ? "selected" : ""}>Não</option>
                </select>
            </td>
            <td>
                <select class="select-squad" data-id="${venda.id}" style="padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--input); color: var(--text);">
                    <option value="" ${squad === "" ? "selected" : ""}>Selecione...</option>
                    <option value="Squad Black Mamba" ${squad === "Squad Black Mamba" ? "selected" : ""}>Squad Black Mamba</option>
                    <option value="Squad Titans" ${squad === "Squad Titans" ? "selected" : ""}>Squad Titans</option>
                </select>
            </td>
            <td>${venda.area || '-'}</td>
            <td>${linkSite}</td>
            <td>${venda.plataformaInicio || '-'}</td>
            <td>${venda.regiaoAnunciar || '-'}</td>
            <td>
                <select class="select-material" data-id="${venda.id}">
                    <option value="Entregue" ${statusMaterial === "Entregue" ? "selected" : ""}>Entregue</option>
                    <option value="Em Revisão" ${statusMaterial === "Em Revisão" ? "selected" : ""}>Em Revisão</option>
                    <option value="Aprovado" ${statusMaterial === "Aprovado" ? "selected" : ""}>Aprovado</option>
                </select>
            </td>
            <td>
                <textarea class="input-textarea-cs input-teses" data-id="${venda.id}" placeholder="Digitar teses...">${tesesCS}</textarea>
            </td>
            <td>
                <textarea class="input-textarea-cs input-obs" data-id="${venda.id}" placeholder="Digitar observações...">${observacoesCS}</textarea>
            </td>
        `;

        listaCSCorpo.appendChild(tr);
    });

    // Máscaras e Eventos
    document.querySelectorAll('.input-data-cs').forEach(input => {
        if (window.IMask) IMask(input, { mask: '00/00/0000' });
        input.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { dataOnboarding: val });
        });
    });

    document.querySelectorAll('.input-hora-cs').forEach(input => {
        if (window.IMask) IMask(input, { mask: '00:00' });
        input.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { horarioOnboarding: val });
        });
    });

    document.querySelectorAll('.select-onboarding').forEach(select => {
        select.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { onboardingAconteceu: val });
        });
    });

    document.querySelectorAll('.select-squad').forEach(select => {
        select.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { squad: val });
        });
    });

    document.querySelectorAll('.select-material').forEach(select => {
        aplicarClasseMaterial(select, select.value);
        select.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            aplicarClasseMaterial(e.target, val);
            await updateDoc(doc(db, "vendas", id), { statusMaterial: val });
        });
    });

    document.querySelectorAll('.input-teses').forEach(textarea => {
        textarea.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { tesesCS: val });
        });
    });

    document.querySelectorAll('.input-obs').forEach(textarea => {
        textarea.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { observacoesCS: val });
        });
    });
};

filtroVendedorCS.addEventListener('change', renderizarTabelaCS);
filtroMesCS.addEventListener('change', renderizarTabelaCS);
filtroAnoCS.addEventListener('change', renderizarTabelaCS);

const q = query(collection(db, "vendas"), orderBy("dataCadastro", "desc"));
onSnapshot(q, (snapshot) => {
    vendasCSCache = [];
    snapshot.forEach((doc) => {
        vendasCSCache.push({ id: doc.id, ...doc.data() });
    });
    renderizarTabelaCS();
});