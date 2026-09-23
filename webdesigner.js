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

const listaWebCorpo = document.getElementById('listaWebCorpo');
let vendasCache = [];
let designerSelecionado = "Lucas";

const cards = document.querySelectorAll('.designer-card');
cards.forEach(card => {
    card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        designerSelecionado = card.getAttribute('data-designer');
        renderizarTabelaWeb();
    });
});

const renderizarTabelaWeb = () => {
    listaWebCorpo.innerHTML = "";

    const filtrados = vendasCache.filter(venda => {
        // Só aparece se "Repag. do Instagram" = "Sim" (Vendas) E "On. aconteceu?" = "Sim" (CS)
        if (venda.repagInstagram !== "Sim" || venda.onboardingAconteceu !== "Sim") return false;

        const resp = venda.webDesignerResponsavel || "Lucas";
        return resp === designerSelecionado;
    });

    filtrados.forEach(venda => {
        const tr = document.createElement('tr');
        const statusProj = venda.statusWebDesigner || "Pendente";
        const linkProj = venda.linkProjetoWeb || "";

        tr.innerHTML = `
            <td>${venda.nomeCliente || '-'}</td>
            <td>${venda.plano || '-'}</td>
            <td>${venda.siteLandingPage || '-'}</td>
            <td>
                <select class="select-status-web select-designer-resp" data-id="${venda.id}">
                    <option value="Lucas" ${designerSelecionado === "Lucas" ? "selected" : ""}>Lucas</option>
                    <option value="Phelippe" ${designerSelecionado === "Phelippe" ? "selected" : ""}>Phelippe</option>
                </select>
            </td>
            <td>
                <select class="select-status-web select-status-proj" data-id="${venda.id}">
                    <option value="Pendente" ${statusProj === "Pendente" ? "selected" : ""}>Pendente</option>
                    <option value="Em Andamento" ${statusProj === "Em Andamento" ? "selected" : ""}>Em Andamento</option>
                    <option value="Concluído" ${statusProj === "Concluído" ? "selected" : ""}>Concluído</option>
                </select>
            </td>
            <td>
                <input type="text" class="input-link-proj" data-id="${venda.id}" value="${linkProj}" placeholder="https://..." style="width: 180px; padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--input); color: var(--text);">
            </td>
        `;

        listaWebCorpo.appendChild(tr);
    });

    document.querySelectorAll('.select-designer-resp').forEach(select => {
        select.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { webDesignerResponsavel: val });
        });
    });

    document.querySelectorAll('.select-status-proj').forEach(select => {
        select.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { statusWebDesigner: val });
        });
    });

    document.querySelectorAll('.input-link-proj').forEach(input => {
        input.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { linkProjetoWeb: val });
        });
    });
};

const q = query(collection(db, "vendas"), orderBy("dataCadastro", "desc"));
onSnapshot(q, (snapshot) => {
    vendasCache = [];
    snapshot.forEach((doc) => {
        vendasCache.push({ id: doc.id, ...doc.data() });
    });
    renderizarTabelaWeb();
});