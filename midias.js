import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { escapeHTML, urlSegura, docsOrdenados, renderAdiavel } from "./util.js";

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
const storage = getStorage(app);

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
const fileInputGlobal = document.getElementById('fileInputGlobal');
const TAMANHO_MAXIMO_MB = 50;
let clienteAlvoUpload = null;
let botaoAlvoUpload = null;

// Mostra só o nome do arquivo (remove a URL longa do Firebase Storage); links antigos continuam como estavam
const nomeArquivo = (arq) => {
    try {
        const u = new URL(arq);
        if (u.hostname.includes('firebasestorage')) {
            const caminho = decodeURIComponent((u.pathname.split('/o/')[1] || ''));
            const nome = caminho.split('/').pop().replace(/^\d+_/, '');
            if (nome) return nome;
        }
    } catch (e) { /* não é URL válida: mostra como veio */ }
    return arq;
};

const ehArquivoDoStorage = (arq) => {
    try { return new URL(arq).hostname.includes('firebasestorage'); }
    catch (e) { return false; }
};
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
                listaArquivosHTML += `
                    <li class="item-arquivo">
                        <a href="${escapeHTML(urlSegura(arq))}" target="_blank" rel="noopener noreferrer">🔗 ${escapeHTML(nomeArquivo(arq))}</a>
                        <button class="btn-remover-arq" data-id="${escapeHTML(venda.id)}" data-index="${index}">✕</button>
                    </li>
                `;
            });
            listaArquivosHTML += `</ul>`;
        } else {
            listaArquivosHTML = `<span style="color: #666; font-size: 0.8rem;">Nenhum arquivo.</span>`;
        }

        tr.innerHTML = `
            <td style="font-weight: bold;">${escapeHTML(venda.nomeCliente || '-')}</td>
            <td><span style="background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border);">${escapeHTML(venda.squad || 'Não atribuído')}</span></td>
            <td>
                <select class="select-social-midia" data-id="${escapeHTML(venda.id)}">
                    <option value="" ${socialMidia === "" ? "selected" : ""}>Selecione...</option>
                    <option value="Kailany" ${socialMidia === "Kailany" ? "selected" : ""}>Kailany</option>
                    <option value="Nathalia" ${socialMidia === "Nathalia" ? "selected" : ""}>Nathalia</option>
                </select>
            </td>
            <td>
                <button class="btn-clip btn-anexar" data-id="${escapeHTML(venda.id)}">📎 Adicionar Arquivo</button>
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

    // Abre apenas o seletor de arquivos do dispositivo (sem digitar link)
    document.querySelectorAll('.btn-anexar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            clienteAlvoUpload = e.currentTarget.getAttribute('data-id');
            botaoAlvoUpload = e.currentTarget;
            fileInputGlobal.value = "";
            fileInputGlobal.click();
        });
    });

    document.querySelectorAll('.btn-remover-arq').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            const index = parseInt(e.target.getAttribute('data-index'));

            const venda = vendasMidiasCache.find(v => v.id === id);
            const valor = venda && venda.arquivosMidia ? venda.arquivosMidia[index] : undefined;
            if (valor !== undefined) {
                await updateDoc(doc(db, "vendas", id), { arquivosMidia: arrayRemove(valor) });
                // Se o arquivo estiver no Storage, apaga também de lá
                if (ehArquivoDoStorage(valor)) {
                    try { await deleteObject(ref(storage, valor)); }
                    catch (err) { console.warn("Não foi possível apagar o arquivo do Storage:", err); }
                }
            }
        });
    });
};

const renderSeguro = renderAdiavel(listaMidiasCorpo, renderizarTabelaMidias);
onSnapshot(collection(db, "vendas"), (snapshot) => {
    vendasMidiasCache = docsOrdenados(snapshot);
    renderSeguro();
});

// Envia os arquivos escolhidos no dispositivo para o Firebase Storage e salva o link no cliente
fileInputGlobal.addEventListener('change', async () => {
    const arquivos = Array.from(fileInputGlobal.files || []);
    const id = clienteAlvoUpload;
    const botao = botaoAlvoUpload;
    if (!id || arquivos.length === 0) return;

    const textoOriginal = botao ? botao.textContent : "";
    if (botao) botao.disabled = true;

    const urls = [];
    const falhas = [];

    for (let i = 0; i < arquivos.length; i++) {
        const arquivo = arquivos[i];

        if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
            falhas.push(`${arquivo.name}: maior que ${TAMANHO_MAXIMO_MB} MB`);
            continue;
        }

        if (botao) botao.textContent = `⏳ Enviando ${i + 1}/${arquivos.length}...`;

        try {
            const nomeSeguro = arquivo.name.replace(/[^\w.\-]+/g, '_');
            const caminho = `midias/${id}/${Date.now()}_${nomeSeguro}`;
            const arquivoRef = ref(storage, caminho);
            await uploadBytes(arquivoRef, arquivo);
            urls.push(await getDownloadURL(arquivoRef));
        } catch (err) {
            console.error("Erro ao enviar arquivo:", err);
            falhas.push(`${arquivo.name}: ${err.code || err.message || err}`);
        }
    }

    try {
        if (urls.length > 0) {
            await updateDoc(doc(db, "vendas", id), { arquivosMidia: arrayUnion(...urls) });
        }
    } catch (err) {
        console.error("Erro ao salvar arquivos no cliente:", err);
        falhas.push("Falha ao salvar no cadastro: " + (err.code || err.message || err));
    }

    if (botao && document.body.contains(botao)) {
        botao.disabled = false;
        botao.textContent = textoOriginal;
    }
    fileInputGlobal.value = "";

    if (falhas.length > 0) {
        alert("Alguns arquivos não foram enviados:\n\n" + falhas.join("\n"));
    }
});