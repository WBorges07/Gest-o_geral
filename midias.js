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
const subTabsEl = document.getElementById('subTabsStatus');
const thObs = document.getElementById('thObs');
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

/* ---------- Abas e submenus de status ---------- */
const STATUS_MIDIA = [
    "Para fazer",
    "Em andamento",
    "Copy em aprovação",
    "Criativos em aprovação",
    "Aprovado",
    "Copy em alteração",
    "Criativo em alteração",
    "Agendado"
];

// Cada aba de trabalho guarda o seu próprio status e o seu próprio histórico de observações no cliente (campos no Firestore)
const ABAS = {
    gerenciamento: { rotulo: "Gerenciamento de mídias", campo: "statusGerenciamentoMidias", campoObs: "observacoesGerenciamento" },
    repaginacao:   { rotulo: "Repaginação",             campo: "statusRepaginacao",         campoObs: "observacoesRepaginacao" }
};

const tabBtns = document.querySelectorAll('.tab-btn');

let vendasMidiasCache = [];
let abaAtual = "todos";          // todos | gerenciamento | repaginacao
let statusAtual = STATUS_MIDIA[0];

// Status do cliente na aba; sem valor salvo = "Para fazer"
const statusDe = (venda, aba) => venda[ABAS[aba].campo] || STATUS_MIDIA[0];

// Histórico de observações do cliente na aba (lista de { texto, data, autor })
const obsDe = (venda, aba) => {
    const lista = venda[ABAS[aba].campoObs];
    return Array.isArray(lista) ? lista : [];
};

// Clientes que entram na aba (onboarding feito; Repaginação exige "Repag. do Instagram" = Sim)
const clientesDaAba = (aba) => vendasMidiasCache.filter(venda => {
    if (venda.onboardingAconteceu !== "Sim") return false;
    if (aba === "repaginacao" && venda.repagInstagram !== "Sim") return false;
    return true;
});

tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        tabBtns.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        abaAtual = e.currentTarget.getAttribute('data-aba');
        statusAtual = STATUS_MIDIA[0];
        renderizarTabelaMidias();
    });
});

subTabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.subtab-btn');
    if (!btn) return;
    statusAtual = btn.getAttribute('data-status');
    renderizarTabelaMidias();
});

const renderizarSubTabs = () => {
    if (abaAtual === "todos") {
        subTabsEl.style.display = "none";
        subTabsEl.innerHTML = "";
        return;
    }

    const clientes = clientesDaAba(abaAtual);
    subTabsEl.style.display = "flex";
    subTabsEl.innerHTML = STATUS_MIDIA.map(st => {
        const qtd = clientes.filter(v => statusDe(v, abaAtual) === st).length;
        return `<button type="button" class="subtab-btn ${st === statusAtual ? 'active' : ''}" data-status="${escapeHTML(st)}">${escapeHTML(st)} <span class="contador">${qtd}</span></button>`;
    }).join('');
};

/* ---------- Caderneta de observações (janela flutuante) ---------- */
const ICONE_CADERNETA =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M5 3.5h12.5A1.5 1.5 0 0 1 19 5v15a1.5 1.5 0 0 1-1.5 1.5H5z"/>' +
    '<path d="M5 3.5v18"/>' +
    '<path d="M9 8h6M9 12h6M9 16h4"/>' +
    '<path d="M3 7.5h3M3 12h3M3 16.5h3"/></svg>';

const obsOverlay = document.getElementById('obsOverlay');
const obsTitulo = document.getElementById('obsTitulo');
const obsTexto = document.getElementById('obsTexto');
const obsLista = document.getElementById('obsLista');
const obsSalvarBtn = document.getElementById('obsSalvar');
const obsFecharBtn = document.getElementById('obsFechar');

// Cliente e aba que estão abertos na janela no momento
let obsAlvo = null; // { id, aba }

const formatarDataHora = (iso) => {
    const dt = new Date(iso);
    return isNaN(dt.getTime()) ? "" : dt.toLocaleString('pt-BR');
};

const renderizarHistoricoObs = () => {
    if (!obsAlvo) return;
    const venda = vendasMidiasCache.find(v => v.id === obsAlvo.id);
    const lista = venda ? obsDe(venda, obsAlvo.aba) : [];

    if (lista.length === 0) {
        obsLista.innerHTML = `<div class="obs-vazio">Nenhuma observação registrada ainda.</div>`;
        return;
    }

    // Mais recentes primeiro; guarda a posição original para poder excluir a observação certa
    const itens = lista
        .map((obs, index) => ({ obs, index }))
        .sort((a, b) => new Date(b.obs.data).getTime() - new Date(a.obs.data).getTime());

    obsLista.innerHTML = itens.map(({ obs, index }) => `
        <div class="obs-item">
            <div class="obs-item-topo">
                <span>🕒 ${escapeHTML(formatarDataHora(obs.data))}${obs.autor ? ' · ' + escapeHTML(obs.autor) : ''}</span>
                <button type="button" class="btn-obs-excluir" data-index="${index}" title="Excluir observação" aria-label="Excluir observação">🗑</button>
            </div>
            <div class="obs-item-texto">${escapeHTML(obs.texto)}</div>
        </div>
    `).join('');
};

const abrirCaderneta = (id, aba) => {
    const venda = vendasMidiasCache.find(v => v.id === id);
    if (!venda) return;

    obsAlvo = { id, aba };
    obsTitulo.innerHTML = `📓 ${escapeHTML(venda.nomeCliente || 'Cliente')}<small>Observações · ${escapeHTML(ABAS[aba].rotulo)}</small>`;
    obsTexto.value = "";
    renderizarHistoricoObs();
    obsOverlay.classList.add('aberto');
    document.body.style.overflow = 'hidden';
    setTimeout(() => obsTexto.focus(), 50);
};

const fecharCaderneta = () => {
    obsOverlay.classList.remove('aberto');
    document.body.style.overflow = '';
    obsAlvo = null;
};

const salvarObservacao = async () => {
    if (!obsAlvo) return;
    const texto = obsTexto.value.trim();
    if (!texto) {
        obsTexto.focus();
        return;
    }

    const { id, aba } = obsAlvo;
    const nova = {
        texto,
        data: new Date().toISOString(),
        autor: (auth.currentUser && auth.currentUser.email) || ""
    };

    obsSalvarBtn.disabled = true;
    try {
        await updateDoc(doc(db, "vendas", id), { [ABAS[aba].campoObs]: arrayUnion(nova) });
        obsTexto.value = "";
        obsTexto.focus();
    } catch (err) {
        console.error("Erro ao salvar observação:", err);
        alert("Erro ao salvar a observação.\n\nMotivo: " + (err.code || err.message || err));
    } finally {
        obsSalvarBtn.disabled = false;
    }
};

obsSalvarBtn.addEventListener('click', salvarObservacao);

obsTexto.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        salvarObservacao();
    }
});

obsFecharBtn.addEventListener('click', fecharCaderneta);
obsOverlay.addEventListener('click', (e) => {
    if (e.target === obsOverlay) fecharCaderneta();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && obsOverlay.classList.contains('aberto')) fecharCaderneta();
});

// Excluir uma observação do histórico
obsLista.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-obs-excluir');
    if (!btn || !obsAlvo) return;

    const index = parseInt(btn.getAttribute('data-index'));
    const venda = vendasMidiasCache.find(v => v.id === obsAlvo.id);
    const obs = venda ? obsDe(venda, obsAlvo.aba)[index] : undefined;
    if (!obs) return;

    if (!confirm("Excluir esta observação do histórico?")) return;

    try {
        await updateDoc(doc(db, "vendas", obsAlvo.id), { [ABAS[obsAlvo.aba].campoObs]: arrayRemove(obs) });
    } catch (err) {
        console.error("Erro ao excluir observação:", err);
        alert("Erro ao excluir a observação.\n\nMotivo: " + (err.code || err.message || err));
    }
});

// Clique no ícone de caderneta da tabela (delegação de eventos)
listaMidiasCorpo.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-caderneta');
    if (!btn) return;
    if (abaAtual === "todos") return;
    abrirCaderneta(btn.getAttribute('data-id'), abaAtual);
});

const renderizarTabelaMidias = () => {
    listaMidiasCorpo.innerHTML = "";
    renderizarSubTabs();

    // A coluna "Obs." só existe nas abas de trabalho
    const mostrarObs = abaAtual !== "todos";
    thObs.style.display = mostrarObs ? "" : "none";
    const totalColunas = mostrarObs ? 8 : 7;

    let filtrados = clientesDaAba(abaAtual);
    if (abaAtual !== "todos") {
        filtrados = filtrados.filter(venda => statusDe(venda, abaAtual) === statusAtual);
    }

    if (filtrados.length === 0) {
        listaMidiasCorpo.innerHTML = `<tr><td colspan="${totalColunas}" style="text-align:center; color:#888; padding:20px;">Nenhum cliente${abaAtual !== "todos" ? ` em "${escapeHTML(statusAtual)}"` : ""}.</td></tr>`;
        return;
    }

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

        // Coluna Status: seletor editável nas abas de trabalho; resumo (somente leitura) em "Todos"
        let statusHTML = "";
        if (abaAtual === "todos") {
            statusHTML = `<span class="badge-status-midia">Gerenciamento: ${escapeHTML(statusDe(venda, "gerenciamento"))}</span>`;
            if (venda.repagInstagram === "Sim") {
                statusHTML += `<span class="badge-status-midia">Repaginação: ${escapeHTML(statusDe(venda, "repaginacao"))}</span>`;
            }
        } else {
            const atual = statusDe(venda, abaAtual);
            statusHTML = `
                <select class="select-status-midia" data-id="${escapeHTML(venda.id)}" data-campo="${escapeHTML(ABAS[abaAtual].campo)}">
                    ${STATUS_MIDIA.map(st => `<option value="${escapeHTML(st)}" ${atual === st ? "selected" : ""}>${escapeHTML(st)}</option>`).join('')}
                </select>
            `;
        }

        // Coluna Obs.: ícone de caderneta com a quantidade de observações já registradas
        let obsHTML = "";
        if (mostrarObs) {
            const qtdObs = obsDe(venda, abaAtual).length;
            obsHTML = `
                <td>
                    <button type="button" class="btn-caderneta" data-id="${escapeHTML(venda.id)}" title="Observações" aria-label="Abrir caderneta de observações">
                        ${ICONE_CADERNETA}
                        ${qtdObs > 0 ? `<span class="qtd-obs">${qtdObs}</span>` : ""}
                    </button>
                </td>
            `;
        }

        tr.innerHTML = `
            <td style="font-weight: bold;">${escapeHTML(venda.nomeCliente || '-')}</td>
            <td>${escapeHTML(venda.plano || '-')}</td>
            <td><span style="background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border);">${escapeHTML(venda.squad || 'Não atribuído')}</span></td>
            <td>
                <select class="select-social-midia" data-id="${escapeHTML(venda.id)}">
                    <option value="" ${socialMidia === "" ? "selected" : ""}>Selecione...</option>
                    <option value="Kailany" ${socialMidia === "Kailany" ? "selected" : ""}>Kailany</option>
                    <option value="Nathalia" ${socialMidia === "Nathalia" ? "selected" : ""}>Nathalia</option>
                </select>
            </td>
            <td>${statusHTML}</td>
            <td>
                <button class="btn-clip btn-anexar" data-id="${escapeHTML(venda.id)}">📎 Adicionar Arquivo</button>
            </td>
            <td>
                ${listaArquivosHTML}
            </td>
            ${obsHTML}
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

    // Muda o status do cliente (ele passa para o submenu correspondente)
    document.querySelectorAll('.select-status-midia').forEach(select => {
        select.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const campo = e.target.getAttribute('data-campo');
            const val = e.target.value;
            try {
                await updateDoc(doc(db, "vendas", id), { [campo]: val });
            } catch (err) {
                console.error("Erro ao atualizar status de mídia:", err);
                alert("Erro ao atualizar o status.\n\nMotivo: " + (err.code || err.message || err));
            }
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
    // Mantém o histórico da janela aberta sempre atualizado
    renderizarHistoricoObs();
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