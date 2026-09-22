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

const listaMidiasCorpo = document.getElementById('listaMidiasCorpo');
const tabBtns = document.querySelectorAll('.tab-btn');

let vendasMidiasCache = [];
let squadFiltro = "todos";

tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        tabBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        squadFiltro = e.target.getAttribute('data-squad');
        renderizarTabelaMidias();
    });
});

const renderizarTabelaMidias = () => {
    listaMidiasCorpo.innerHTML = "";

    // Filtra apenas clientes onde Onboarding aconteceu = "Sim"
    const filtrados = vendasMidiasCache.filter(venda => {
        const matchOnboarding = venda.onboardingAconteceu === "Sim";
        const matchSquad = squadFiltro === "todos" || venda.squad === squadFiltro;
        return matchOnboarding && matchSquad;
    });

    filtrados.forEach(venda => {
        const tr = document.createElement('tr');

        const socialMidia = venda.socialMidia || "";
        const arquivos = venda.arquivosMidia || [];

        let listaArquivosHTML = "";
        if (arquivos.length > 0) {
            listaArquivosHTML = `<ul class="lista-arquivos">`;
            arquivos.forEach((arq, index) => {
                const linkFormatado = arq.startsWith("http") ? arq : `https://${arq}`;
                listaArquivosHTML += `
                    <li class="item-arquivo">
                        <a href="${linkFormatado}" target="_blank">🔗 ${arq}</a>
                        <button class="btn-remover-arq" data-id="${venda.id}" data-index="${index}">✕</button>
                    </li>
                `;
            });
            listaArquivosHTML += `</ul>`;
        } else {
            listaArquivosHTML = `<span style="color: #666; font-size: 0.8rem;">Nenhum arquivo ou link.</span>`;
        }

        tr.innerHTML = `
            <td style="font-weight: bold;">${venda.nomeCliente || '-'}</td>
            <td><span style="background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border);">${venda.squad || 'Não atribuído'}</span></td>
            <td>
                <select class="select-social-midia" data-id="${venda.id}">
                    <option value="" ${socialMidia === "" ? "selected" : ""}>Selecione...</option>
                    <option value="Kailany" ${socialMidia === "Kailany" ? "selected" : ""}>Kailany</option>
                    <option value="Nathalia" ${socialMidia === "Nathalia" ? "selected" : ""}>Nathalia</option>
                </select>
            </td>
            <td>
                <button class="btn-clip btn-anexar" data-id="${venda.id}">📎 Adicionar Link/Arquivo</button>
            </td>
            <td>
                ${listaArquivosHTML}
            </td>
        `;

        listaMidiasCorpo.appendChild(tr);
    });

    // Eventos
    document.querySelectorAll('.select-social-midia').forEach(select => {
        select.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { socialMidia: val });
        });
    });

    document.querySelectorAll('.btn-anexar').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            const linkOuCaminho = prompt("Insira a URL do arquivo/drive ou o caminho do arquivo local:");
            if (linkOuCaminho && linkOuCaminho.trim() !== "") {
                const venda = vendasMidiasCache.find(v => v.id === id);
                const arquivosAtuais = venda.arquivosMidia || [];
                arquivosAtuais.push(linkOuCaminho.trim());

                await updateDoc(doc(db, "vendas", id), { arquivosMidia: arquivosAtuais });
            }
        });
    });

    document.querySelectorAll('.btn-remover-arq').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            const index = parseInt(e.target.getAttribute('data-index'));

            const venda = vendasMidiasCache.find(v => v.id === id);
            if (venda && venda.arquivosMidia) {
                const novosArquivos = [...venda.arquivosMidia];
                novosArquivos.splice(index, 1);
                await updateDoc(doc(db, "vendas", id), { arquivosMidia: novosArquivos });
            }
        });
    });
};

const q = query(collection(db, "vendas"), orderBy("dataCadastro", "desc"));
onSnapshot(q, (snapshot) => {
    vendasMidiasCache = [];
    snapshot.forEach((doc) => {
        vendasMidiasCache.push({ id: doc.id, ...doc.data() });
    });
    renderizarTabelaMidias();
});