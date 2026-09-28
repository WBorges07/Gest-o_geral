/* =========================================================
   TALISMÃ CRM — Funções compartilhadas
   ========================================================= */

// Evita XSS ao inserir dados do Firestore em innerHTML
export const escapeHTML = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

// Garante http(s):// em links digitados pelo usuário
export const urlSegura = (v) => {
    const s = String(v).trim();
    return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

// dataCadastro pode ser string ISO (app.js) ou Timestamp do Firestore
export const dataCadastroMs = (v) => {
    if (!v) return 0;
    if (typeof v === 'object' && typeof v.seconds === 'number') return v.seconds * 1000;
    const t = new Date(v).getTime();
    return isNaN(t) ? 0 : t;
};

// Lê todas as vendas (inclusive as sem "dataCadastro") e ordena da mais nova para a mais antiga.
// Substitui o orderBy("dataCadastro"), que escondia documentos sem esse campo.
export const docsOrdenados = (snapshot) =>
    snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => dataCadastroMs(b.dataCadastro) - dataCadastroMs(a.dataCadastro));

// Adia o redesenho da tabela enquanto o usuário digita em um campo dela,
// para o onSnapshot não fazer o cursor/máscara sumirem no meio da digitação.
export const renderAdiavel = (container, renderFn) => {
    let pendente = false;
    const editando = () => {
        const a = document.activeElement;
        return !!a && container.contains(a) && /^(INPUT|TEXTAREA)$/.test(a.tagName);
    };
    container.addEventListener('focusout', () => {
        if (!pendente) return;
        setTimeout(() => {
            if (!editando()) { pendente = false; renderFn(); }
        }, 0);
    });
    return () => {
        if (editando()) { pendente = true; return; }
        renderFn();
    };
};