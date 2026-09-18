import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

// Verifica o estado de autenticação
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "login.html";
});

const vendaForm = document.getElementById('vendaForm');
if (vendaForm) {
    vendaForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const campoAno = document.getElementById('filtroAno');
        const anoParaSalvar = (campoAno && campoAno.value !== "todos") ? campoAno.value : "2026";

        const novaVenda = {
            // Campos de identificação e contato
            vendedor: document.getElementById('vendedor').value,
            cliente: document.getElementById('nomeCliente').value,
            telefone: document.getElementById('telefone').value,
            
            // Campos do Plano
            plano: document.getElementById('plano').value,
            vigencia: document.getElementById('vigencia').value,
            mensalidadePlano: document.getElementById('mensalidadePlano').value,
            
            // Campos Financeiros (Enviados diretamente para leitura no financeiro.js)
            pagamentoInicial: document.getElementById('pagamentoInicial').value,
            dataPgtoInicial: document.getElementById('dataPgtoInicial').value,
            primeiroPagamentoMes: document.getElementById('pagamentoMes').value,
            primeiroPagamentoAno: anoParaSalvar,
            formaPagamento: document.getElementById('formaPagamento').value,
            pago: false,
            vezes: "1",

            // Campos de Operação (CS/Tráfego)
            areaAtuacao: document.getElementById('area').value,
            perfilCliente: document.getElementById('perfil').value,
            tipoCampanha: document.getElementById('tipoCampanha').value,
            investimentoMensal: document.getElementById('investimento').value,
            instagramCliente: document.getElementById('instagram').value,
            jaInvestia: document.getElementById('jaInvestia').value,
            onboarding: false,
            dataCadastro: serverTimestamp()
        };

        try {
            await addDoc(collection(db, "vendas"), novaVenda);
            alert("Venda cadastrada e enviada ao financeiro!");
            vendaForm.reset();
        } catch (error) {
            console.error("Erro ao salvar a venda:", error);
            alert("Erro ao salvar dados.");
        }
    });
}

// Listagem na página inicial (Vendas)
const listaCorpo = document.getElementById('listaVendasCorpo');
if (listaCorpo) {
    onSnapshot(query(collection(db, "vendas"), orderBy("dataCadastro", "desc")), (snap) => {
        listaCorpo.innerHTML = "";
        snap.forEach(docSnap => {
            const d = docSnap.data();
            const dataF = d.dataCadastro ? d.dataCadastro.toDate().toLocaleDateString('pt-BR') : "--/--/----";
            listaCorpo.innerHTML += `
                <tr>
                    <td>${dataF}</td>
                    <td>${d.cliente || ''}</td>
                    <td>${d.vendedor || ''}</td>
                    <td>${d.plano || ''}</td>
                    <td>${d.mensalidadePlano || ''}</td>
                    <td>${d.pagamentoInicial || ''}</td>
                    <td>${d.telefone || ''}</td>
                    <td><button onclick="excluirVenda('${docSnap.id}')" style="color:var(--danger); background:none; border:none; cursor:pointer;">Excluir</button></td>
                </tr>`;
        });
    });
}

// Função global para excluir vendas
window.excluirVenda = async (id) => {
    if (confirm("Tem certeza que deseja excluir esta venda?")) {
        try {
            await deleteDoc(doc(doc(db, "vendas", id)));
        } catch (error) {
            console.error("Erro ao excluir venda:", error);
        }
    }
};

// Função global para Logout
window.btnLogout = () => signOut(auth).then(() => window.location.href = "login.html");