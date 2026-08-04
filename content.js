const bancoDeCredenciais = {
    "ZTE_H3601P": [
        { usuario: "multipro", senha: "0nucl!ck!P" },
        { usuario: "multipro", senha: "Onucl1ck1p" }
    ],
    "DM986_416": [
        { usuario: "user", senha: "0nucl!ck!P" }
    ],
    "DM985-424 HW2": [
        { usuario: "support", senha: "onuclickip" },
        { usuario: "support", senha: "0nucl!ck!P" } 
    ],
    "DM986-414": [
        { usuario: "user", senha: "onuclickip" },
        { usuario: "user", senha: "0nucl!ck!P" } 
    ]             
};

let fluxoExecutado = false; 

// ------------------------------------------------------------------
// GERENCIAMENTO DA URL E RECARREGAMENTO (F5 / LOGOUT)
// ------------------------------------------------------------------

// Salva a URL HTTPS/HTTP limpa do roteador (sem parâmetros temporários de sessão)
function salvarUrlRoteador() {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        const urlLimpa = window.location.origin + window.location.pathname;
        chrome.storage.local.set({ "url_roteador_salva": urlLimpa });
    }
}

// Escuta eventos de clique para identificar ação manual de Logout
document.addEventListener('click', (event) => {
    const alvo = event.target;
    const texto = (alvo.innerText || alvo.value || '').toLowerCase();
    const ehLogout = ['logout', 'sair', 'desconectar', 'exit', 'log out'].some(t => texto.includes(t)) ||
                     (alvo.id && alvo.id.toLowerCase().includes('logout')) ||
                     (alvo.className && typeof alvo.className === 'string' && alvo.className.toLowerCase().includes('logout'));

    if (ehLogout) {
        sessionStorage.setItem('autologin_acao_logout', 'true');
        // Trava específica para o DM985-424 HW2 não entrar em loop ao redirecionar no Logout
        sessionStorage.setItem('autologin_logout_dm985', 'true');
    }
}, true);

// Verifica se a tela foi atualizada por F5/Recarregar
function verificarEResetarSeFoiF5() {
    let foiReload = false;
    const entries = performance.getEntriesByType("navigation");
    if (entries.length > 0) {
        foiReload = entries[0].type === "reload";
    } else if (performance.navigation) {
        foiReload = performance.navigation.type === 1; // Fallback para navegadores antigos
    }

    const veioDeLogout = sessionStorage.getItem('autologin_acao_logout') === 'true';

    // Se pressionou F5/Reload e NÃO foi acionado por um botão de Logout
    if (foiReload && !veioDeLogout) {
        console.log('[AutoLogin] F5 detectado! Apagando dados de sessão e reiniciando automação...');
        sessionStorage.clear(); // Reseta todas as travas e memórias da sessão
        fluxoExecutado = false;
    }

    // Limpa a flag temporária de transição de logout após a verificação
    sessionStorage.removeItem('autologin_acao_logout');
}

// Executa verificação inicial de F5 e armazena a URL
verificarEResetarSeFoiF5();
salvarUrlRoteador();

// ------------------------------------------------------------------
// FUNÇÕES AUXILIARES DE INTERAÇÃO COM ELEMENTOS
// ------------------------------------------------------------------

function estaRealmenteVisivel(elemento) {
    if (!elemento || elemento.offsetParent === null) return false;
    const rect = elemento.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    const estilo = window.getComputedStyle(elemento);
    if (estilo.visibility === 'hidden' || estilo.display === 'none' || parseFloat(estilo.opacity) === 0) {
        return false;
    }
    return true;
}

function clicarComMouse(elemento) {
    if (!elemento) return;
    const rect = elemento.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    ['mousedown', 'mouseup', 'click'].forEach(tipo => {
        elemento.dispatchEvent(new MouseEvent(tipo, {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: x,
            clientY: y,
            button: 0
        }));
    });
}

function preencherCampo(campo, valor) {
    if (!campo) return;
    campo.focus();
    campo.value = valor;
    ['input', 'change', 'blur'].forEach(tipo => {
        campo.dispatchEvent(new Event(tipo, { bubbles: true, cancelable: true }));
    });
}

function localizarCampoUsuario() {
    let campo = document.querySelector(
        'input[id*="user" i], input[name*="user" i], input[id*="login" i], input[name*="login" i], input[type="text"]'
    );
    if (campo && campo.offsetParent !== null) {
        return campo;
    }
    const campoSenha = document.querySelector('input[type="password"], input[data-autologin-pass]');
    if (campoSenha) {
        const todosInputs = Array.from(document.querySelectorAll('input'));
        const idxSenha = todosInputs.indexOf(campoSenha);
        if (idxSenha > 0) {
            for (let i = idxSenha - 1; i >= 0; i--) {
                if (todosInputs[i].type !== 'hidden' && todosInputs[i].offsetParent !== null) {
                    return todosInputs[i];
                }
            }
        }
    }
    return null;
}

function localizarBotaoLogin() {
    let alvo = document.querySelector(
        '#LoginId, .submitBtn, #loginBtn, .loginBtn, [id*="login" i][id*="btn" i], [class*="login" i][class*="btn" i]'
    );
    if (alvo && (alvo.tagName === 'DIV' || alvo.tagName === 'SPAN')) {
        const subBotao = alvo.querySelector('input[type="submit"], input[type="button"], button');
        if (subBotao) alvo = subBotao;
    }
    if (alvo && alvo.type !== 'hidden' && estaRealmenteVisivel(alvo)) {
        return alvo;
    }
    const todosElementos = document.querySelectorAll('button, input, div, span, a');
    for (let elemento of todosElementos) {
        if (elemento.type === 'hidden' || !estaRealmenteVisivel(elemento)) continue;
        const texto = (elemento.innerText || elemento.value || '').trim().toLowerCase();
        if (['login', 'acessar', 'entrar'].includes(texto)) {
            return elemento;
        }
    }
    return null;
}

function identificarModeloRoteador() {
    const textoPagina = document.body ? document.body.innerText : "";
    const tituloPagina = document.title || "";
    const conteudoCompleto = (textoPagina + " " + tituloPagina).toUpperCase();
    if (conteudoCompleto.includes("H3601P") || conteudoCompleto.includes("ZTE")) {
        return "ZTE_H3601P";
    } 
    if (conteudoCompleto.includes("DM985-424 HW2") || conteudoCompleto.includes("DM985")) {
        return "DM985-424 HW2";
    }
    if (conteudoCompleto.includes("DM986-414") || conteudoCompleto.includes("414")) {
        return "DM986-414";
    }
    if (conteudoCompleto.includes("DM986-416") || conteudoCompleto.includes("DM986") || conteudoCompleto.includes("DATACOM")) {
        return "DM986_416";
    }
    return null;
}

function estaBloqueadoPorTempo() {
    const textoPagina = document.body ? document.body.innerText.toLowerCase() : "";
    const bloqueiosConhecidos = [
        "try again a minute later",
        "wrong username or password",
        "please try again later",
        "secs",
        "locked"
    ];
    return bloqueiosConhecidos.some(msg => textoPagina.includes(msg));
}

function checarETratarTelaErro() {
    const textoPagina = document.body ? document.body.innerText.toUpperCase() : "";
    if (textoPagina.includes("ERROR: BAD PASSWORD!") || textoPagina.includes("BAD PASSWORD")) {
        const botoes = document.querySelectorAll('button, input[type="button"], input[type="submit"]');
        for (let botao of botoes) {
            if ((botao.value || botao.innerText || "").toUpperCase().trim() === "OK") {
                setTimeout(() => { 
                    clicarComMouse(botao);
                    fluxoExecutado = false; 
                }, 1000);
                return true;
            }
        }
    }
    return false;
}

function executarFluxoLogin(modelo, tentativaIndex = 0) {
    if (estaBloqueadoPorTempo()) {
        fluxoExecutado = true;
        return;
    }
    const credenciaisDoModelo = bancoDeCredenciais[modelo];
    if (!credenciaisDoModelo || tentativaIndex >= credenciaisDoModelo.length) {
        const campoUsuario = localizarCampoUsuario();
        const campoSenha = document.querySelector('input[type="password"], input[data-autologin-pass]');
        if (campoUsuario) campoUsuario.value = "";
        if (campoSenha) campoSenha.value = "";
        sessionStorage.removeItem(`autologin_tentativa_${modelo}`);
        sessionStorage.setItem(`autologin_esgotado_${modelo}`, 'true');
        fluxoExecutado = true;
        alert("Tentativas automáticas esgotadas. Por favor, insira os dados manualmente.");
        return;
    }
    const credencialAtual = credenciaisDoModelo[tentativaIndex];
    const campoUsuario = localizarCampoUsuario();
    let campoSenha = document.querySelector('input[type="password"], input[data-autologin-pass]');
    if (campoUsuario && campoSenha) {
        fluxoExecutado = true; 
        sessionStorage.setItem(`autologin_tentativa_${modelo}`, String(tentativaIndex + 1));
        sessionStorage.setItem(`autologin_tentativa_ts_${modelo}`, String(Date.now()));
        preencherCampo(campoUsuario, credencialAtual.usuario);
        preencherCampo(campoSenha, credencialAtual.senha);
        setTimeout(() => {
            if (modelo === "DM986-414") {
                campoSenha.setAttribute('data-autologin-pass', 'true');
                campoSenha.type = 'text';
            }
            const botao = localizarBotaoLogin();
            if (botao) {
                clicarComMouse(botao);
            } else {
                const form = campoSenha.closest('form');
                if (form) {
                    form.submit();
                } else {
                    const eventoEnter = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, keyCode: 13, key: 'Enter' });
                    campoSenha.dispatchEvent(eventoEnter);
                }
            }
            setTimeout(() => {
                if (estaBloqueadoPorTempo()) {
                    return;
                }
                const aindaNaPaginaLogin = document.querySelector('input[type="password"], input[data-autologin-pass]');
                if (aindaNaPaginaLogin && estaRealmenteVisivel(aindaNaPaginaLogin)) {
                    if (modelo === "DM986-414") aindaNaPaginaLogin.type = 'password';
                    fluxoExecutado = false; 
                    executarFluxoLogin(modelo, tentativaIndex + 1);
                } else {
                    sessionStorage.removeItem(`autologin_tentativa_${modelo}`);
                    sessionStorage.removeItem(`autologin_tentativa_ts_${modelo}`);
                    sessionStorage.setItem(`autologin_logado_${modelo}`, 'true');
                    
                    if (modelo === "DM985-424 HW2") {
                        sessionStorage.setItem(`autologin_bloqueio_loop_dm985_${window.location.hostname}`, 'true');
                    }

                    if (typeof observador !== 'undefined') observador.disconnect();
                }
            }, 4500); 
        }, 800);
    }
}

// ------------------------------------------------------------------
// LÓGICA PRINCIPAL DE PROCESSAMENTO
// ------------------------------------------------------------------
function processarPagina() {
    salvarUrlRoteador();

    if (fluxoExecutado) return;

    if (estaBloqueadoPorTempo()) {
        fluxoExecutado = true;
        return;
    }

    if (checarETratarTelaErro()) {
        fluxoExecutado = true;
        return;
    }

    const modelo = identificarModeloRoteador();
    const campoSenha = document.querySelector('input[type="password"], input[data-autologin-pass]');

    // TRATAMENTO ESPECÍFICO DE LOOP PARA O DM985-424 HW2
    if (modelo === "DM985-424 HW2") {
        const travaHostDM985 = `autologin_bloqueio_loop_dm985_${window.location.hostname}`;
        
        // Se o usuário clicou no logout no DM985, desativa o relogin até pressionar F5
        if (sessionStorage.getItem('autologin_logout_dm985') === 'true') {
            console.log('[AutoLogin - DM985] Logout detectado. Automação pausada até o recarregamento manual (F5).');
            return;
        }

        // Se o login já foi concluído para este IP/Host, ignora mudanças de porta/protocolo
        if (sessionStorage.getItem(travaHostDM985) === 'true' && !campoSenha) {
            return;
        }
    }

    // DETECÇÃO DE SUCESSO POR NAVEGAÇÃO
    if (modelo && document.readyState === 'complete') {
        const tentativaEmAndamento = sessionStorage.getItem(`autologin_tentativa_${modelo}`);
        const aindaEhTelaDeLogin = campoSenha && estaRealmenteVisivel(campoSenha) && localizarBotaoLogin();
        if (tentativaEmAndamento && !aindaEhTelaDeLogin) {
            sessionStorage.removeItem(`autologin_tentativa_${modelo}`);
            sessionStorage.removeItem(`autologin_tentativa_ts_${modelo}`);
            sessionStorage.setItem(`autologin_logado_${modelo}`, 'true');
            
            if (modelo === "DM985-424 HW2") {
                sessionStorage.setItem(`autologin_bloqueio_loop_dm985_${window.location.hostname}`, 'true');
            }

            if (typeof observador !== 'undefined') observador.disconnect();
            return;
        }
    }

    if (modelo && sessionStorage.getItem(`autologin_logado_${modelo}`) === 'true') {
        return;
    }

    if (modelo && sessionStorage.getItem(`autologin_esgotado_${modelo}`) === 'true') {
        return;
    }

    // INÍCIO DO FLUXO DE LOGIN
    if (modelo && campoSenha && estaRealmenteVisivel(campoSenha) && localizarBotaoLogin()) {
        const chaveTentativa = `autologin_tentativa_${modelo}`;
        const chaveTimestamp = `autologin_tentativa_ts_${modelo}`;
        let tentativaSalva = parseInt(sessionStorage.getItem(chaveTentativa) || '0', 10);

        const timestampSalvo = parseInt(sessionStorage.getItem(chaveTimestamp) || '0', 10);
        if (tentativaSalva > 0 && Date.now() - timestampSalvo > 20000) {
            tentativaSalva = 0;
        }

        if (tentativaSalva === 0 && document.readyState !== 'complete') {
            if (!window.__autologinAguardandoLoad) {
                window.__autologinAguardandoLoad = true;
                window.addEventListener('load', () => {
                    window.__autologinAguardandoLoad = false;
                    executarFluxoLogin(modelo, tentativaSalva);
                }, { once: true });
            }
            return;
        }

        executarFluxoLogin(modelo, tentativaSalva);
    }
}

// ------------------------------------------------------------------
// CONFIGURAÇÃO DO OBSERVAÇÃO DE MUTAÇÃO
// ------------------------------------------------------------------
const observador = new MutationObserver(processarPagina);
observador.observe(document.documentElement, { childList: true, subtree: true });

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(processarPagina, 200);
} else {
    window.addEventListener('load', processarPagina);
}

console.log('[AutoLogin] Content script carregado com proteção de loop DM985 e reset via F5.');