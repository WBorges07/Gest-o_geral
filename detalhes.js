/* =========================================================
   TALISMÃ CRM — Janela flutuante de detalhes do cliente
   Uso: import { botaoOlhoHTML, ativarOlhos } from "./detalhes.js";
   ========================================================= */

const escapeHTML = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

const ICONE_OLHO =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12z"/>' +
    '<circle cx="12" cy="12" r="3.2"/></svg>';

export const botaoOlhoHTML = (id) =>
    `<button type="button" class="btn-olho" data-id="${escapeHTML(id)}" title="Ver todas as informações" aria-label="Ver todas as informações do cliente">${ICONE_OLHO}</button>`;

/* ---------- Estilos (injetados uma única vez) ---------- */
const injetarEstilos = () => {
    if (document.getElementById('detalhes-cliente-css')) return;
    const style = document.createElement('style');
    style.id = 'detalhes-cliente-css';
    style.textContent = `
        .btn-olho {
            background: rgba(0, 255, 136, 0.12);
            color: var(--accent, #00ff88);
            border: 1px solid var(--accent, #00ff88);
            width: 34px;
            height: 34px;
            border-radius: 8px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            transition: all 0.2s ease;
        }
        .btn-olho:hover {
            background: var(--accent, #00ff88);
            color: #06110b;
            transform: scale(1.06);
        }
        .btn-olho svg { pointer-events: none; }

        .detalhes-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.65);
            backdrop-filter: blur(3px);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
        }
        .detalhes-overlay.aberto { display: flex; }

        .detalhes-modal {
            background: var(--card, var(--input, #161b22));
            color: var(--text, #c9d1d9);
            border: 1px solid var(--border, #30363d);
            border-radius: 14px;
            width: 100%;
            max-width: 860px;
            max-height: 88vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.55);
            animation: detalhesEntrada 0.2s ease;
        }
        @keyframes detalhesEntrada {
            from { opacity: 0; transform: translateY(10px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .detalhes-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 18px 22px;
            border-bottom: 1px solid var(--border, #30363d);
        }
        .detalhes-header h3 { margin: 0; font-size: 1.15rem; }
        .detalhes-header small { display: block; opacity: 0.65; font-weight: 400; margin-top: 3px; font-size: 0.8rem; }
        .detalhes-fechar {
            background: transparent;
            color: inherit;
            border: 1px solid var(--border, #30363d);
            width: 34px;
            height: 34px;
            border-radius: 8px;
            font-size: 1.05rem;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .detalhes-fechar:hover { background: #ff4444; border-color: #ff4444; color: #fff; }

        .detalhes-body {
            padding: 18px 22px 24px;
            overflow-y: auto;
        }
        .detalhes-secao { margin-bottom: 22px; }
        .detalhes-secao:last-child { margin-bottom: 0; }
        .detalhes-secao h4 {
            margin: 0 0 10px;
            font-size: 0.82rem;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--accent, #00ff88);
        }
        .detalhes-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
            gap: 10px;
        }
        .detalhes-item {
            background: rgba(128, 128, 128, 0.09);
            border: 1px solid var(--border, #30363d);
            border-radius: 8px;
            padding: 9px 12px;
            min-width: 0;
        }
        .detalhes-item.largo { grid-column: 1 / -1; }
        .detalhes-item span {
            display: block;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            opacity: 0.65;
            margin-bottom: 3px;
        }
        .detalhes-item div {
            font-size: 0.92rem;
            word-break: break-word;
            white-space: pre-wrap;
        }
        .detalhes-item a { color: var(--accent, #00ff88); text-decoration: none; }
        .detalhes-item a:hover { text-decoration: underline; }
        .detalhes-vazio { opacity: 0.45; }
    `;
    document.head.appendChild(style);
};

/* ---------- Estrutura dos campos exibidos ---------- */
// [rótulo, chave no Firestore, tipo opcional: 'link' | 'texto' | 'lista' | 'data']
const SECOES = [
    {
        titulo: '🧾 Dados da Venda',
        campos: [
            ['Cliente', 'nomeCliente'],
            ['Vendedor', 'vendedor'],
            ['Telefone', 'telefone'],
            ['Plano contratado', 'plano'],
            ['Repag. do Instagram', 'repagInstagram'],
            ['Vigência', 'vigencia'],
            ['Área de atuação', 'area'],
            ['Perfil do cliente', 'perfil'],
            ['Tipo de campanha', 'tipoCampanha'],
            ['Data do cadastro', 'dataCadastro', 'data']
        ]
    },
    {
        titulo: '💰 Pagamento',
        campos: [
            ['Primeiro pagamento (mês)', 'pagamentoMes'],
            ['Data pgto inicial', 'dataPgtoInicial'],
            ['Investimento mensal', 'investimento'],
            ['Mensalidade do plano', 'mensalidadePlano'],
            ['Pagamento inicial (entrada)', 'pagamentoInicial'],
            ['Forma de pagamento', 'formaPagamento'],
            ['Status financeiro', 'statusFinanceiro']
        ]
    },
    {
        titulo: '📣 Campanha e Contato',
        campos: [
            ['Nome do escritório', 'nomeEscritorio'],
            ['Telefone de campanha', 'telefoneCampanha'],
            ['Instagram', 'instagram'],
            ['Já investia em tráfego?', 'jaInvestia'],
            ['Site / Landing page', 'siteLandingPage', 'link'],
            ['Plataforma de início', 'plataformaInicio'],
            ['Região para anunciar', 'regiaoAnunciar'],
            ['Endereço completo', 'enderecoCompleto', 'texto'],
            ['CEP', 'cep']
        ]
    },
    {
        titulo: '🎧 Customer Success (CS)',
        campos: [
            ['Data de onboarding', 'dataOnboarding', 'data'],
            ['Horário', 'horarioOnboarding'],
            ['On. aconteceu?', 'onboardingAconteceu'],
            ['Anotações de onboarding', 'anotacoesCS', 'texto']
        ]
    },
    {
        titulo: '🚦 Gestão de Tráfego',
        campos: [
            ['Squad', 'squad'],
            ['Gestor de tráfego', 'gestorTrafego'],
            ['Grau de satisfação', 'satisfacao'],
            ['Link do gerenciador / conta', 'linkGerenciador', 'link'],
            ['Observações de tráfego', 'observacoesTrafego', 'texto']
        ]
    },
    {
        titulo: '📎 Mídias',
        campos: [
            ['Social mídia', 'socialMidia'],
            ['Links / arquivos', 'arquivosMidia', 'lista']
        ]
    },
    {
        titulo: '🎨 Web Designer',
        campos: [
            ['Responsável', 'webDesignerResponsavel'],
            ['Status do projeto', 'statusWebDesigner'],
            ['Link do projeto', 'linkProjetoWeb', 'link']
        ]
    }
];

/* ---------- Formatação dos valores ---------- */
const urlSegura = (v) => {
    const s = String(v).trim();
    return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

const formatarData = (v) => {
    if (!v) return '';
    // Timestamp do Firestore
    if (typeof v === 'object' && v.seconds) {
        return new Date(v.seconds * 1000).toLocaleString('pt-BR');
    }
    // yyyy-mm-dd (input type="date")
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        const [a, m, d] = v.split('-');
        return `${d}/${m}/${a}`;
    }
    // ISO completo
    const dt = new Date(v);
    if (!isNaN(dt.getTime())) return dt.toLocaleString('pt-BR');
    return String(v);
};

const valorHTML = (valor, tipo) => {
    const vazio = valor === undefined || valor === null || valor === '' ||
                  (Array.isArray(valor) && valor.length === 0);
    if (vazio) return '<span class="detalhes-vazio" style="display:inline;font-size:inherit;text-transform:none;letter-spacing:0;margin:0;">—</span>';

    if (tipo === 'link') {
        return `<a href="${escapeHTML(urlSegura(valor))}" target="_blank" rel="noopener noreferrer">🔗 ${escapeHTML(valor)}</a>`;
    }
    if (tipo === 'lista') {
        return (Array.isArray(valor) ? valor : [valor])
            .map((arq) => `<a href="${escapeHTML(urlSegura(arq))}" target="_blank" rel="noopener noreferrer">🔗 ${escapeHTML(arq)}</a>`)
            .join('<br>');
    }
    if (tipo === 'data') return escapeHTML(formatarData(valor));
    return escapeHTML(valor);
};

/* ---------- Modal ---------- */
let overlayEl = null;

const garantirModal = () => {
    if (overlayEl) return overlayEl;
    injetarEstilos();

    overlayEl = document.createElement('div');
    overlayEl.className = 'detalhes-overlay';
    overlayEl.innerHTML = `
        <div class="detalhes-modal" role="dialog" aria-modal="true" aria-labelledby="detalhesTitulo">
            <div class="detalhes-header">
                <h3 id="detalhesTitulo"></h3>
                <button type="button" class="detalhes-fechar" aria-label="Fechar">✕</button>
            </div>
            <div class="detalhes-body"></div>
        </div>
    `;
    document.body.appendChild(overlayEl);

    overlayEl.addEventListener('click', (e) => {
        if (e.target === overlayEl || e.target.closest('.detalhes-fechar')) fecharDetalhesCliente();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlayEl.classList.contains('aberto')) fecharDetalhesCliente();
    });

    return overlayEl;
};

export const fecharDetalhesCliente = () => {
    if (!overlayEl) return;
    overlayEl.classList.remove('aberto');
    document.body.style.overflow = '';
};

export const abrirDetalhesCliente = (venda) => {
    const overlay = garantirModal();

    overlay.querySelector('#detalhesTitulo').innerHTML =
        `👁️ ${escapeHTML(venda.nomeCliente || 'Cliente')}<small>${escapeHTML(venda.plano || '')}${venda.plano && venda.vendedor ? ' · ' : ''}${venda.vendedor ? 'Vendedor: ' + escapeHTML(venda.vendedor) : ''}</small>`;

    overlay.querySelector('.detalhes-body').innerHTML = SECOES.map((secao) => `
        <div class="detalhes-secao">
            <h4>${secao.titulo}</h4>
            <div class="detalhes-grid">
                ${secao.campos.map(([rotulo, chave, tipo]) => `
                    <div class="detalhes-item ${(tipo === 'texto' || tipo === 'lista') ? 'largo' : ''}">
                        <span>${escapeHTML(rotulo)}</span>
                        <div>${valorHTML(venda[chave], tipo)}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    overlay.querySelector('.detalhes-body').scrollTop = 0;
    overlay.classList.add('aberto');
    document.body.style.overflow = 'hidden';
};

/* ---------- Ligação com a tabela (delegação de eventos) ---------- */
export const ativarOlhos = (container, obterVenda) => {
    injetarEstilos();
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-olho');
        if (!btn) return;
        const venda = obterVenda(btn.getAttribute('data-id'));
        if (venda) abrirDetalhesCliente(venda);
    });
};