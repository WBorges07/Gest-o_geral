import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { botaoOlhoHTML, ativarOlhos } from "./detalhes.js";

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

// Máscaras de entrada
if (window.IMask) {
    const telInput = document.getElementById('telefone');
    if (telInput) {
        IMask(telInput, { mask: '(00) 00000-0000' });
    }

    const dataInput = document.getElementById('dataPgtoInicial');
    if (dataInput) {
        IMask(dataInput, { mask: '00/00/0000' });
    }

    const maskMoedaOptions = {
        mask: 'R$ num',
        blocks: {
            num: {
                mask: Number,
                thousandsSeparator: '.',
                radix: ',',
                mapToRadix: ['.']
            }
        }
    };

    const invInput = document.getElementById('investimento');
    if (invInput) IMask(invInput, maskMoedaOptions);

    const mensInput = document.getElementById('mensalidadePlano');
    if (mensInput) IMask(mensInput, maskMoedaOptions);

    const pagInput = document.getElementById('pagamentoInicial');
    if (pagInput) IMask(pagInput, maskMoedaOptions);

    const cepInput = document.getElementById('cep');
    if (cepInput) IMask(cepInput, { mask: '00000-000' });
}

const vendaForm = document.getElementById('vendaForm');
const listaVendasCorpo = document.getElementById('listaVendasCorpo');
const filtroVendedor = document.getElementById('filtroVendedor');
const filtroMes = document.getElementById('filtroMes');
const filtroAno = document.getElementById('filtroAno');
const btnSalvar = document.getElementById('btnSalvar');

let vendasCache = [];

// Ícone de olho -> abre a janela flutuante com todas as informações do cliente
ativarOlhos(listaVendasCorpo, (id) => vendasCache.find(v => v.id === id));

// Lê o valor de um campo do formulário sem quebrar caso o campo não exista
const valorCampo = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : "";
};

vendaForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const novaVenda = {
        vendedor: valorCampo('vendedor'),
        nomeCliente: valorCampo('nomeCliente'),
        telefone: valorCampo('telefone'),
        plano: valorCampo('plano'),
        repagInstagram: valorCampo('repagInstagram'),
        vigencia: valorCampo('vigencia'),
        area: valorCampo('area'),
        perfil: valorCampo('perfil'),
        pagamentoMes: valorCampo('pagamentoMes'),
        tipoCampanha: valorCampo('tipoCampanha'),
        investimento: valorCampo('investimento'),
        mensalidadePlano: valorCampo('mensalidadePlano'),
        pagamentoInicial: valorCampo('pagamentoInicial'),
        dataPgtoInicial: valorCampo('dataPgtoInicial'),
        formaPagamento: valorCampo('formaPagamento'),
        instagram: valorCampo('instagram'),
        jaInvestia: valorCampo('jaInvestia'),
        siteLandingPage: valorCampo('siteLandingPage'),
        plataformaInicio: valorCampo('plataformaInicio'),
        regiaoAnunciar: valorCampo('regiaoAnunciar'),
        enderecoCompleto: valorCampo('enderecoCompleto'),
        cep: valorCampo('cep'),
        dataCadastro: new Date().toISOString()
    };

    if (btnSalvar) btnSalvar.disabled = true;

    try {
        await addDoc(collection(db, "vendas"), novaVenda);
        alert("Venda salva com sucesso!");
        vendaForm.reset();
    } catch (error) {
        console.error("Erro ao salvar venda: ", error);
        // Mostra o motivo real (ex.: permission-denied = regras do Firestore bloqueando)
        alert("Erro ao salvar a venda.\n\nMotivo: " + (error.code || error.message || error));
    } finally {
        if (btnSalvar) btnSalvar.disabled = false;
    }
});

const parseMoeda = (val) => {
    if (!val) return 0;
    const limpo = val.replace("R$", "").replace(/\./g, "").replace(",", ".").trim();
    return parseFloat(limpo) || 0;
};

const formatarMoeda = (val) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const renderizarTabela = () => {
    const selVendedor = filtroVendedor.value;
    const selMes = filtroMes.value;
    const selAno = filtroAno.value;

    listaVendasCorpo.innerHTML = "";

    let totalMens = 0;
    let totalEnt = 0;

    const filtrados = vendasCache.filter(venda => {
        // "Victor Gestor" (cadastro) também é encontrado ao filtrar por "Victor"
        let matchVendedor = (
            selVendedor === "todos" ||
            venda.vendedor === selVendedor ||
            (venda.vendedor || "").startsWith(selVendedor)
        );
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
        totalMens += parseMoeda(venda.mensalidadePlano);
        totalEnt += parseMoeda(venda.pagamentoInicial);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${botaoOlhoHTML(venda.id)}</td>
            <td>${venda.dataPgtoInicial || '-'}</td>
            <td>${venda.nomeCliente || '-'}</td>
            <td>${venda.vendedor || '-'}</td>
            <td>${venda.plano || '-'}</td>
            <td>${venda.mensalidadePlano || '-'}</td>
            <td>${venda.pagamentoInicial || '-'}</td>
            <td>${venda.telefone || '-'}</td>
            <td>
                <button class="btn-deletar" data-id="${venda.id}" style="background-color: var(--danger, #e74c3c); color: #fff; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Excluir</button>
            </td>
        `;
        listaVendasCorpo.appendChild(tr);
    });

    document.getElementById('totalMensalidades').innerText = formatarMoeda(totalMens);
    document.getElementById('totalEntradas').innerText = formatarMoeda(totalEnt);

    document.querySelectorAll('.btn-deletar').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if (confirm("Tem certeza que deseja excluir esta venda?")) {
                try {
                    await deleteDoc(doc(db, "vendas", id));
                } catch (err) {
                    console.error("Erro ao deletar:", err);
                    alert("Erro ao excluir a venda.\n\nMotivo: " + (err.code || err.message || err));
                }
            }
        });
    });
};

filtroVendedor.addEventListener('change', renderizarTabela);
filtroMes.addEventListener('change', renderizarTabela);
filtroAno.addEventListener('change', renderizarTabela);

let avisouErroListagem = false;

const q = query(collection(db, "vendas"), orderBy("dataCadastro", "desc"));
onSnapshot(q, (snapshot) => {
    vendasCache = [];
    snapshot.forEach((docSnap) => {
        vendasCache.push({ id: docSnap.id, ...docSnap.data() });
    });
    renderizarTabela();
}, (error) => {
    // Sem isso, se o Firestore recusar a leitura a lista simplesmente fica vazia, sem aviso
    console.error("Erro ao carregar vendas:", error);
    if (!avisouErroListagem) {
        avisouErroListagem = true;
        alert("Não foi possível carregar a lista de vendas.\n\nMotivo: " + (error.code || error.message || error));
    }
});
