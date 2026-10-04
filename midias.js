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
const thEntrega = document.getElementById('thEntrega');
const TAMANHO_MAXIMO_MB = 50;
const SOCIAL_MIDIAS = ["Carol", "Kailany", "Nathalia"];
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
    gerenciamento: { rotulo: "Gerenciamento de mídias", campo: "statusGerenciamentoMidias", campoObs: "observacoesGerenciamento", campoEntrega: "dataEntregaGerenciamento" },
    repaginacao:   { rotulo: "Repaginação",             campo: "statusRepaginacao",         campoObs: "observacoesRepaginacao",   campoEntrega: "dataEntregaRepaginacao" }
};

const tabBtns = document.querySelectorAll('.tab-btn');

let vendasMidiasCache = [];
let abaAtual = "trafego";        // trafego | gerenciamento | repaginacao
let statusAtual = STATUS_MIDIA[0];

// Status do cliente na aba; sem valor salvo = "Para fazer"
const statusDe = (venda, aba) => venda[ABAS[aba].campo] || STATUS_MIDIA[0];

// Data para entrega do cliente na aba (texto DD/MM/AAAA); sem valor salvo = vazio
const entregaDe = (venda, aba) => venda[ABAS[aba].campoEntrega] || "";

// Valida se a data DD/MM/AAAA existe de verdade (a máscara aceita "99/99/2026")
const dataValida = (txt) => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(txt || "");
    if (!m) return false;
    const d = +m[1], mo = +m[2], a = +m[3];
    const dt = new Date(a, mo - 1, d);
    return dt.getFullYear() === a && dt.getMonth() === mo - 1 && dt.getDate() === d;
};

// Histórico de observações do cliente na aba (lista de { texto, data, autor, anexos })
const obsDe = (venda, aba) => {
    const lista = venda[ABAS[aba].campoObs];
    return Array.isArray(lista) ? lista : [];
};

// Cliente cadastrado SEM "Gerenciamento de mídias" (campo do cadastro de vendas).
// Clientes antigos, sem esse campo salvo, continuam sendo tratados como COM gerenciamento.
const semGerenciamento = (venda) => venda.gerenciamentoMidias === "Não";

// Clientes que entram na aba (onboarding feito):
// - Tráfego: só os cadastrados sem "Gerenciamento de mídias"
// - Gerenciamento de mídias: os que têm gerenciamento
// - Repaginação: exige "Repag. do Instagram" = Sim
const clientesDaAba = (aba) => vendasMidiasCache.filter(venda => {
    if (venda.onboardingAconteceu !== "Sim") return false;
    if (aba === "trafego") return semGerenciamento(venda);
    if (aba === "gerenciamento" && semGerenciamento(venda)) return false;
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
    if (abaAtual === "trafego") {
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
const obsClipBtn = document.getElementById('obsClip');
const obsFileInput = document.getElementById('obsFileInput');
const obsAnexosPendentesEl = document.getElementById('obsAnexosPendentes');

const ICONE_CLIPE =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>';

// Arquivos escolhidos no clipe que ainda serão enviados junto com a próxima observação
let anexosPendentes = [];

const renderizarAnexosPendentes = () => {
    obsAnexosPendentesEl.innerHTML = anexosPendentes.map((arq, index) => `
        <div class="obs-anexo-pendente">
            <span>${ICONE_CLIPE.replace('width="18" height="18"', 'width="14" height="14"')} ${escapeHTML(arq.name)}</span>
            <button type="button" class="btn-obs-anexo-remover" data-index="${index}" title="Remover anexo" aria-label="Remover anexo">✕</button>
        </div>
    `).join('');
};

const limparAnexosPendentes = () => {
    anexosPendentes = [];
    obsFileInput.value = "";
    renderizarAnexosPendentes();
};

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
            ${obs.texto ? `<div class="obs-item-texto">${escapeHTML(obs.texto)}</div>` : ""}
            ${Array.isArray(obs.anexos) && obs.anexos.length > 0 ? `
                <div class="obs-anexos">
                    ${obs.anexos.map(a => `
                        <div class="obs-anexo-link">
                            <a href="${escapeHTML(urlSegura(a.url))}" target="_blank" rel="noopener noreferrer">📎 ${escapeHTML(a.nome || nomeArquivo(a.url))}</a>
                        </div>
                    `).join('')}
                </div>` : ""}
        </div>
    `).join('');
};

const abrirCaderneta = (id, aba) => {
    const venda = vendasMidiasCache.find(v => v.id === id);
    if (!venda) return;

    obsAlvo = { id, aba };
    obsTitulo.innerHTML = `📓 ${escapeHTML(venda.nomeCliente || 'Cliente')}<small>Observações · ${escapeHTML(ABAS[aba].rotulo)}</small>`;
    obsTexto.value = "";
    limparAnexosPendentes();
    renderizarHistoricoObs();
    obsOverlay.classList.add('aberto');
    document.body.style.overflow = 'hidden';
    setTimeout(() => obsTexto.focus(), 50);
};

const fecharCaderneta = () => {
    obsOverlay.classList.remove('aberto');
    document.body.style.overflow = '';
    obsAlvo = null;
    limparAnexosPendentes();
};

const salvarObservacao = async () => {
    if (!obsAlvo) return;
    const texto = obsTexto.value.trim();
    if (!texto && anexosPendentes.length === 0) {
        obsTexto.focus();
        return;
    }

    const { id, aba } = obsAlvo;
    const arquivos = [...anexosPendentes];
    const textoBotao = obsSalvarBtn.textContent;
    const anexos = [];
    const falhas = [];

    obsSalvarBtn.disabled = true;
    obsClipBtn.disabled = true;

    try {
        // Envia os anexos para o Firebase Storage
        for (let i = 0; i < arquivos.length; i++) {
            const arquivo = arquivos[i];

            if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
                falhas.push(`${arquivo.name}: maior que ${TAMANHO_MAXIMO_MB} MB`);
                continue;
            }

            obsSalvarBtn.textContent = `⏳ Enviando ${i + 1}/${arquivos.length}...`;

            try {
                const nomeSeguro = arquivo.name.replace(/[^\w.\-]+/g, '_');
                const caminho = `midias/${id}/obs/${Date.now()}_${i}_${nomeSeguro}`;
                const arquivoRef = ref(storage, caminho);
                await uploadBytes(arquivoRef, arquivo);
                anexos.push({ nome: arquivo.name, url: await getDownloadURL(arquivoRef) });
            } catch (err) {
                console.error("Erro ao enviar anexo:", err);
                falhas.push(`${arquivo.name}: ${err.code || err.message || err}`);
            }
        }

        // Só anexos e todos falharam: não grava uma observação vazia
        if (!texto && anexos.length === 0) {
            alert("Os arquivos não foram enviados:\n\n" + falhas.join("\n"));
            return;
        }

        const nova = {
            texto,
            data: new Date().toISOString(),
            autor: (auth.currentUser && auth.currentUser.email) || ""
        };
        if (anexos.length > 0) nova.anexos = anexos;

        await updateDoc(doc(db, "vendas", id), { [ABAS[aba].campoObs]: arrayUnion(nova) });

        if (obsAlvo && obsAlvo.id === id) {
            obsTexto.value = "";
            limparAnexosPendentes();
            obsTexto.focus();
        }

        if (falhas.length > 0) {
            alert("Observação salva, mas alguns arquivos não foram enviados:\n\n" + falhas.join("\n"));
        }
    } catch (err) {
        console.error("Erro ao salvar observação:", err);
        alert("Erro ao salvar a observação.\n\nMotivo: " + (err.code || err.message || err));
    } finally {
        obsSalvarBtn.disabled = false;
        obsClipBtn.disabled = false;
        obsSalvarBtn.textContent = textoBotao;
    }
};

// Clipe de papel: escolhe os arquivos que seguirão junto com a observação
obsClipBtn.addEventListener('click', () => {
    obsFileInput.value = "";
    obsFileInput.click();
});

obsFileInput.addEventListener('change', () => {
    const novos = Array.from(obsFileInput.files || []);
    anexosPendentes = anexosPendentes.concat(novos);
    obsFileInput.value = "";
    renderizarAnexosPendentes();
});

obsAnexosPendentesEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-obs-anexo-remover');
    if (!btn) return;
    anexosPendentes.splice(parseInt(btn.getAttribute('data-index')), 1);
    renderizarAnexosPendentes();
});

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
        // Apaga também os anexos dessa observação no Storage
        if (Array.isArray(obs.anexos)) {
            for (const a of obs.anexos) {
                if (a && a.url && ehArquivoDoStorage(a.url)) {
                    try { await deleteObject(ref(storage, a.url)); }
                    catch (errArq) { console.warn("Não foi possível apagar o anexo do Storage:", errArq); }
                }
            }
        }
    } catch (err) {
        console.error("Erro ao excluir observação:", err);
        alert("Erro ao excluir a observação.\n\nMotivo: " + (err.code || err.message || err));
    }
});

// Clique no ícone de caderneta da tabela (delegação de eventos)
listaMidiasCorpo.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-caderneta');
    if (!btn) return;
    if (abaAtual === "trafego") return;
    abrirCaderneta(btn.getAttribute('data-id'), abaAtual);
});

const renderizarTabelaMidias = () => {
    listaMidiasCorpo.innerHTML = "";
    renderizarSubTabs();

    // A coluna "Obs." só existe nas abas de trabalho
    const mostrarObs = abaAtual !== "trafego";
    thObs.style.display = mostrarObs ? "" : "none";
    // A coluna "Data para entrega" também só existe nas abas de trabalho
    const mostrarEntrega = abaAtual !== "trafego";
    thEntrega.style.display = mostrarEntrega ? "" : "none";
    const totalColunas = 7 + (mostrarObs ? 1 : 0) + (mostrarEntrega ? 1 : 0);

    let filtrados = clientesDaAba(abaAtual);
    if (abaAtual !== "trafego") {
        filtrados = filtrados.filter(venda => statusDe(venda, abaAtual) === statusAtual);
    }

    if (filtrados.length === 0) {
        listaMidiasCorpo.innerHTML = `<tr><td colspan="${totalColunas}" style="text-align:center; color:#888; padding:20px;">Nenhum cliente${abaAtual !== "trafego" ? ` em "${escapeHTML(statusAtual)}"` : " sem gerenciamento de mídias"}.</td></tr>`;
        return;
    }

    filtrados.forEach(venda => {
        const tr = document.createElement('tr');

        const socialMidia = venda.socialMidia || "";
        // Só "Carol" é oferecida; um valor antigo já salvo (ex.: outro nome) continua visível para não sumir do cadastro
        const opcoesSocial = (socialMidia && !SOCIAL_MIDIAS.includes(socialMidia)) ? [...SOCIAL_MIDIAS, socialMidia] : SOCIAL_MIDIAS;
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

        // Coluna Status: seletor editável nas abas de trabalho; resumo (somente leitura) em "Tráfego"
        let statusHTML = "";
        if (abaAtual === "trafego") {
            // Clientes desta aba não têm gerenciamento de mídias; só mostra a Repaginação, se houver
            if (venda.repagInstagram === "Sim") {
                statusHTML = `<span class="badge-status-midia">Repaginação: ${escapeHTML(statusDe(venda, "repaginacao"))}</span>`;
            } else {
                statusHTML = `<span style="color: #666; font-size: 0.8rem;">-</span>`;
            }
        } else {
            const atual = statusDe(venda, abaAtual);
            statusHTML = `
                <select class="select-status-midia" data-id="${escapeHTML(venda.id)}" data-campo="${escapeHTML(ABAS[abaAtual].campo)}">
                    ${STATUS_MIDIA.map(st => `<option value="${escapeHTML(st)}" ${atual === st ? "selected" : ""}>${escapeHTML(st)}</option>`).join('')}
                </select>
            `;
        }

        // Coluna Data para entrega (DD/MM/AAAA), guardada separadamente em cada aba
        let entregaHTML = "";
        if (mostrarEntrega) {
            entregaHTML = `
                <td>
                    <input type="text" class="input-data-entrega" data-id="${escapeHTML(venda.id)}" data-campo="${escapeHTML(ABAS[abaAtual].campoEntrega)}" value="${escapeHTML(entregaDe(venda, abaAtual))}" placeholder="DD/MM/AAAA" maxlength="10" inputmode="numeric" autocomplete="off">
                </td>
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
                    ${opcoesSocial.map(nome => `<option value="${escapeHTML(nome)}" ${socialMidia === nome ? "selected" : ""}>${escapeHTML(nome)}</option>`).join('')}
                </select>
            </td>
            <td>${statusHTML}</td>
            ${entregaHTML}
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

    // Data para entrega: máscara DD/MM/AAAA, valida data real e salva no cliente (campo da aba atual)
    document.querySelectorAll('.input-data-entrega').forEach(input => {
        if (window.IMask) IMask(input, { mask: '00/00/0000' });
        input.addEventListener('input', () => input.classList.remove('invalida'));
        input.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const campo = e.target.getAttribute('data-campo');
            const val = e.target.value.trim();

            if (val !== "" && !dataValida(val)) {
                e.target.classList.add('invalida');
                alert("Data para entrega inválida. Use DD/MM/AAAA com uma data real.");
                return;
            }

            try {
                await updateDoc(doc(db, "vendas", id), { [campo]: val });
            } catch (err) {
                console.error("Erro ao salvar data de entrega:", err);
                alert("Erro ao salvar a data de entrega.\n\nMotivo: " + (err.code || err.message || err));
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