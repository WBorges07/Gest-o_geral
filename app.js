import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth(app);

// Verifica se o usuário está logado
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Se não estiver logado, manda de volta para o login
        window.location.href = "login.html";
    }
});
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- MÁSCARAS ---
const telInput = document.getElementById('telefone');
IMask(telInput, { mask: '(00) 00000-0000' });

// Máscara para Data DD/MM/AAAA
const dataPgtoInput = document.getElementById('dataPgtoInicial');
const dataPgtoMask = IMask(dataPgtoInput, {
    mask: Date,
    pattern: 'd/m/Y',
    blocks: {
        d: { mask: IMask.MaskedRange, from: 1, to: 31, maxLength: 2 },
        m: { mask: IMask.MaskedRange, from: 1, to: 12, maxLength: 2 },
        Y: { mask: IMask.MaskedRange, from: 1900, to: 2100, maxLength: 4 }
    },
    format: (date) => {
        let day = date.getDate();
        let month = date.getMonth() + 1;
        let year = date.getFullYear();
        if (day < 10) day = '0' + day;
        if (month < 10) month = '0' + month;
        return [day, month, year].join('/');
    },
    parse: (str) => {
        const [d, m, Y] = str.split('/');
        return new Date(Y, m - 1, d);
    }
});

const maskMoneyOptions = {
    mask: 'R$ num',
    blocks: {
        num: {
            mask: Number,
            thousandsSeparator: '.',
            padFractionalZeros: true,
            radix: ',',
            mapToRadix: ['.']
        }
    }
};

const invInput = document.getElementById('investimento');
const invMask = IMask(invInput, maskMoneyOptions);
const mensPlanoMask = IMask(document.getElementById('mensalidadePlano'), maskMoneyOptions);
const pagInicialMask = IMask(document.getElementById('pagamentoInicial'), maskMoneyOptions);

const moneyToNumber = (str) => {
    if (!str) return 0;
    return parseFloat(str.replace("R$ ", "").replace(/\./g, "").replace(",", ".")) || 0;
};

const formatCurrency = (val) => val.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' });

// --- SALVAR ---
const form = document.getElementById('vendaForm');
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const venda = {
        vendedor: document.getElementById('vendedor').value,
        cliente: document.getElementById('nomeCliente').value,
        telefone: telInput.value,
        plano: document.getElementById('plano').value,
        vigencia: document.getElementById('vigencia').value,
        areaAtuacao: document.getElementById('area').value,
        perfil: document.getElementById('perfil').value,
        primeiroPagamentoMes: document.getElementById('pagamentoMes').value,
        tipoCampanha: document.getElementById('tipoCampanha').value,
        investimento: invInput.value,
        mensalidadePlano: document.getElementById('mensalidadePlano').value,
        pagamentoInicial: document.getElementById('pagamentoInicial').value,
        dataPgtoInicial: dataPgtoInput.value,
        formaPagamento: document.getElementById('formaPagamento').value,
        instagram: document.getElementById('instagram').value,
        jaInvestia: document.getElementById('jaInvestia').value,
        dataCadastro: new Date()
    };

    try {
        await addDoc(collection(db, "vendas"), venda);
        alert("Venda salva!");
        form.reset();
        [invMask, mensPlanoMask, pagInicialMask, dataPgtoMask].forEach(m => m.value = '');
    } catch (e) { console.error(e); }
});

// --- EXCLUIR ---
window.excluirCliente = async (id) => {
    if (confirm("Excluir cliente?")) await deleteDoc(doc(db, "vendas", id));
};

// --- FILTROS E LISTAGEM ---
const listaCorpo = document.getElementById('listaVendasCorpo');
const displayMensalidades = document.getElementById('totalMensalidades');
const displayEntradas = document.getElementById('totalEntradas');
const selVendedor = document.getElementById('filtroVendedor');
const selMes = document.getElementById('filtroMes');
const selAno = document.getElementById('filtroAno');

let todosDados = [];

const renderizar = () => {
    const vFiltro = selVendedor.value;
    const mFiltro = selMes.value;
    const aFiltro = selAno.value;

    let somaM = 0;
    let somaE = 0;
    listaCorpo.innerHTML = "";

    todosDados.forEach(d => {
        const dataObjeto = d.dataCadastro?.seconds ? new Date(d.dataCadastro.seconds * 1000) : null;
        const anoVenda = dataObjeto ? dataObjeto.getFullYear().toString() : "";

        const vendedorBate = vFiltro === "todos" || d.vendedor === vFiltro;
        const mesBate = mFiltro === "todos" || d.primeiroPagamentoMes === mFiltro;
        const anoBate = aFiltro === "todos" || anoVenda === aFiltro;

        if (vendedorBate && mesBate && anoBate) {
            somaM += moneyToNumber(d.mensalidadePlano);
            somaE += moneyToNumber(d.pagamentoInicial);

            const dataF = dataObjeto ? dataObjeto.toLocaleDateString('pt-BR') : "";

            listaCorpo.innerHTML += `
                <tr>
                    <td style="color: #888; font-size: 0.8rem;">${dataF}</td>
                    <td>${d.cliente}</td>
                    <td>${d.vendedor}</td>
                    <td>${d.plano}</td>
                    <td>${d.mensalidadePlano || "---"}</td>
                    <td>${d.pagamentoInicial || "---"}</td>
                    <td>${d.telefone}</td>
                    <td><button class="btn-excluir" onclick="excluirCliente('${d.id}')">Excluir</button></td>
                </tr>
            `;
        }
    });

    displayMensalidades.textContent = formatCurrency(somaM);
    displayEntradas.textContent = formatCurrency(somaE);
};

onSnapshot(query(collection(db, "vendas"), orderBy("dataCadastro", "desc")), (snap) => {
    todosDados = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderizar();
});

selVendedor.addEventListener('change', renderizar);
selMes.addEventListener('change', renderizar);
selAno.addEventListener('change', renderizar);