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
const filtroVendedorTrafego = document.getElementById('filtroVendedorTrafego');
const filtroMesTrafego = document.getElementById('filtroMesTrafego');
const filtroAnoTrafego = document.getElementById('filtroAnoTrafego');

let vendasTrafegoCache = [];

const aplicarClasseSatisfacao = (selectEl, valor) => {
    selectEl.classList.remove('satisfeito', 'alerta', 'insatisfeito');
    if (valor === "Satisfeito") selectEl.classList.add('satisfeito');
    if (valor === "Alerta") selectEl.classList.add('alerta');
    if (valor === "Insatisfeito") selectEl.classList.add('insatisfeito');
};

const renderizarTabelaTrafego = () => {
    const selVendedor = filtroVendedorTrafego.value;
    const selMes = filtroMesTrafego.value;
    const selAno = filtroAnoTrafego.value;

    listaTrafegoCorpo.innerHTML = "";

    const filtrados = vendasTrafegoCache.filter(venda => {
        // Só aparece após "On. aconteceu?" = "Sim" na aba CS
        if (venda.onboardingAconteceu !== "Sim") return false;

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

        const nomeEscritorio = venda.nomeEscritorio || "";
        const telefoneCampanha = venda.telefoneCampanha || "";
        const squad = venda.squad || "";
        const enderecoCompleto = venda.enderecoCompleto || "-";
        const cep = venda.cep || "-";
        const instagram = venda.instagram || "";
        const gestorTrafego = venda.gestorTrafego || "";
        const jaInvestia = venda.jaInvestia || "Não";
        const satisfacao = venda.satisfacao || "Satisfeito";
        const linkGerenciador = venda.linkGerenciador || "";
        const observacoesTrafego = venda.observacoesTrafego || "";

        tr.innerHTML = `
            <td>${venda.dataPgtoInicial || '-'}</td>
            <td>${venda.vendedor || '-'}</td>
            <td>${venda.nomeCliente || '-'}</td>
            <td>
                <input type="text" class="input-escritorio-trafego" data-id="${venda.id}" value="${nomeEscritorio}" placeholder="Nome do escritório" style="width: 140px; padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--input); color: var(--text);">
            </td>
            <td>${venda.telefone || '-'}</td>
            <td>
                <input type="text" class="input-tel-campanha" data-id="${venda.id}" value="${telefoneCampanha}" placeholder="(00) 00000-0000" style="width: 130px; padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--input); color: var(--text);">
            </td>
            <td>
                <select class="select-squad-trafego" data-id="${venda.id}" style="padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--input); color: var(--text);">
                    <option value="" ${squad === "" ? "selected" : ""}>Selecione...</option>
                    <option value="Squad Black Mamba" ${squad === "Squad Black Mamba" ? "selected" : ""}>Squad Black Mamba</option>
                    <option value="Squad Titans" ${squad === "Squad Titans" ? "selected" : ""}>Squad Titans</option>
                </select>
            </td>
            <td>${enderecoCompleto}</td>
            <td>${cep}</td>
            <td>
                <input type="text" class="input-instagram-trafego" data-id="${venda.id}" value="${instagram}" placeholder="@usuario" style="width: 110px; padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--input); color: var(--text);">
            </td>
            <td>${venda.repagInstagram || '-'}</td>
            <td>
                <input type="text" class="input-gestor-trafego" data-id="${venda.id}" value="${gestorTrafego}" placeholder="Nome do gestor" style="width: 120px; padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--input); color: var(--text);">
            </td>
            <td>
                <select class="select-jainvestiu-trafego" data-id="${venda.id}" style="padding: 6px; border-radius: 6px; border: 1px solid var(--border); background: var(--input); color: var(--text);">
                    <option value="Sim" ${jaInvestia === "Sim" ? "selected" : ""}>Sim</option>
                    <option value="Não" ${jaInvestia === "Não" ? "selected" : ""}>Não</option>
                </select>
            </td>
            <td>${venda.investimento || '-'}</td>
            <td>${venda.plano || '-'}</td>
            <td>
                <select class="select-satisfacao" data-id="${venda.id}">
                    <option value="Satisfeito" ${satisfacao === "Satisfeito" ? "selected" : ""}>Satisfeito</option>
                    <option value="Alerta" ${satisfacao === "Alerta" ? "selected" : ""}>Alerta</option>
                    <option value="Insatisfeito" ${satisfacao === "Insatisfeito" ? "selected" : ""}>Insatisfeito</option>
                </select>
            </td>
            <td>
                <textarea class="input-textarea-trafego input-link-gerenciador" data-id="${venda.id}" placeholder="Cole o link aqui...">${linkGerenciador}</textarea>
            </td>
            <td>
                <textarea class="input-textarea-trafego input-obs-trafego" data-id="${venda.id}" placeholder="Digitar observações...">${observacoesTrafego}</textarea>
            </td>
        `;

        listaTrafegoCorpo.appendChild(tr);
    });

    // Eventos e Aplicação da Máscara de Telefone
    document.querySelectorAll('.input-escritorio-trafego').forEach(input => {
        input.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { nomeEscritorio: val });
        });
    });

    document.querySelectorAll('.input-tel-campanha').forEach(input => {
        if (window.IMask) IMask(input, { mask: '(00) 00000-0000' });
        input.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { telefoneCampanha: val });
        });
    });

    document.querySelectorAll('.select-squad-trafego').forEach(select => {
        select.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { squad: val });
        });
    });

    document.querySelectorAll('.input-instagram-trafego').forEach(input => {
        input.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { instagram: val });
        });
    });

    document.querySelectorAll('.input-gestor-trafego').forEach(input => {
        input.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { gestorTrafego: val });
        });
    });

    document.querySelectorAll('.select-jainvestiu-trafego').forEach(select => {
        select.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { jaInvestia: val });
        });
    });

    document.querySelectorAll('.select-satisfacao').forEach(select => {
        aplicarClasseSatisfacao(select, select.value);
        select.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            aplicarClasseSatisfacao(e.target, val);
            await updateDoc(doc(db, "vendas", id), { satisfacao: val });
        });
    });

    document.querySelectorAll('.input-link-gerenciador').forEach(textarea => {
        textarea.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { linkGerenciador: val });
        });
    });

    document.querySelectorAll('.input-obs-trafego').forEach(textarea => {
        textarea.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            await updateDoc(doc(db, "vendas", id), { observacoesTrafego: val });
        });
    });
};

filtroVendedorTrafego.addEventListener('change', renderizarTabelaTrafego);
filtroMesTrafego.addEventListener('change', renderizarTabelaTrafego);
filtroAnoTrafego.addEventListener('change', renderizarTabelaTrafego);

const q = query(collection(db, "vendas"), orderBy("dataCadastro", "desc"));
onSnapshot(q, (snapshot) => {
    vendasTrafegoCache = [];
    snapshot.forEach((doc) => {
        vendasTrafegoCache.push({ id: doc.id, ...doc.data() });
    });
    renderizarTabelaTrafego();
});
