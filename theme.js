/* =========================================================
   TALISMÃ CRM — Alternador de tema (escuro / claro)
   Incluir no <head> de cada página: <script src="theme.js"></script>
   ========================================================= */
(function () {
    var CHAVE = 'crm-tema';

    function lerTema() {
        try { return localStorage.getItem(CHAVE) === 'light' ? 'light' : 'dark'; }
        catch (e) { return 'dark'; }
    }

    function salvarTema(t) {
        try { localStorage.setItem(CHAVE, t); } catch (e) { /* ignora */ }
    }

    var ICONE_SOL =
        '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="4.2"/>' +
        '<path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>';

    var ICONE_LUA =
        '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.8 6.8 0 0 0 9.8 9.8z"/></svg>';

    // aplica o tema o mais cedo possível (evita "piscar" ao carregar a página)
    var temaAtual = lerTema();
    document.documentElement.setAttribute('data-theme', temaAtual);

    function atualizarBotao(btn) {
        var claro = temaAtual === 'light';
        // no tema escuro mostra o sol (vai para o claro); no claro mostra a lua (vai para o escuro)
        btn.innerHTML = claro ? ICONE_LUA : ICONE_SOL;
        var rotulo = claro ? 'Ativar tema escuro' : 'Ativar tema claro';
        btn.setAttribute('aria-label', rotulo);
        btn.setAttribute('title', rotulo);
    }

    function criarBotao() {
        if (document.getElementById('btnTema')) return;
        var btn = document.createElement('button');
        btn.id = 'btnTema';
        btn.type = 'button';
        btn.className = 'theme-toggle';
        atualizarBotao(btn);

        btn.addEventListener('click', function () {
            temaAtual = temaAtual === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', temaAtual);
            salvarTema(temaAtual);
            atualizarBotao(btn);
            // avisa scripts que dependem das cores (ex.: gráficos do B.I)
            window.dispatchEvent(new CustomEvent('temaAlterado', { detail: temaAtual }));
        });

        document.body.appendChild(btn);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', criarBotao);
    } else {
        criarBotao();
    }
})();
