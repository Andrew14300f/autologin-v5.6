

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
                    if (typeof observador !== 'undefined') observador.disconnect();
                }
            }, 4500); 
        }, 800);
    }
}

// ------------------------------------------------------------------
// Nova função central que unifica a lógica de processamento da página
// ------------------------------------------------------------------
function processarPagina() {
    // Evita execução concorrente
    if (fluxoExecutado) return;

    // Verifica bloqueio temporário
    if (estaBloqueadoPorTempo()) {
        fluxoExecutado = true;
        return;
    }

    // Trata pop-up de erro de senha
    if (checarETratarTelaErro()) {
        fluxoExecutado = true;
        return;
    }

    const modelo = identificarModeloRoteador();
    const campoSenha = document.querySelector('input[type="password"], input[data-autologin-pass]');

    // DETECÇÃO DE SUCESSO POR NAVEGAÇÃO (quando a página sai da tela de login)
    if (modelo && document.readyState === 'complete') {
        const tentativaEmAndamento = sessionStorage.getItem(`autologin_tentativa_${modelo}`);
        const aindaEhTelaDeLogin = campoSenha && estaRealmenteVisivel(campoSenha) && localizarBotaoLogin();
        if (tentativaEmAndamento && !aindaEhTelaDeLogin) {
            sessionStorage.removeItem(`autologin_tentativa_${modelo}`);
            sessionStorage.removeItem(`autologin_tentativa_ts_${modelo}`);
            sessionStorage.setItem(`autologin_logado_${modelo}`, 'true');
            // Desconecta o observer para não mais interferir
            if (typeof observador !== 'undefined') observador.disconnect();
            return;
        }
    }

    // Se já logou com sucesso nessa sessão, não faz nada
    if (modelo && sessionStorage.getItem(`autologin_logado_${modelo}`) === 'true') {
        return;
    }

    // Se já esgotou as tentativas, não faz nada
    if (modelo && sessionStorage.getItem(`autologin_esgotado_${modelo}`) === 'true') {
        return;
    }

    // Condição para iniciar o fluxo de login: modelo identificado, campo de senha visível e botão de login presente
    if (modelo && campoSenha && estaRealmenteVisivel(campoSenha) && localizarBotaoLogin()) {
        const chaveTentativa = `autologin_tentativa_${modelo}`;
        const chaveTimestamp = `autologin_tentativa_ts_${modelo}`;
        let tentativaSalva = parseInt(sessionStorage.getItem(chaveTentativa) || '0', 10);

        // Expira contagem salva após 20 segundos (evita reciclagem indevida)
        const timestampSalvo = parseInt(sessionStorage.getItem(chaveTimestamp) || '0', 10);
        if (tentativaSalva > 0 && Date.now() - timestampSalvo > 20000) {
            tentativaSalva = 0;
        }

        // Se for a PRIMEIRA tentativa e a página ainda não está completamente carregada,
        // aguarda o evento 'load' para garantir que bibliotecas externas (ex: crypto-js) estejam prontas.
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

        // Executa o fluxo de login com a tentativa atual (pode ser 0 ou mais)
        executarFluxoLogin(modelo, tentativaSalva);
    }
}

// ------------------------------------------------------------------
// Configuração do MutationObserver e execução inicial
// ------------------------------------------------------------------
const observador = new MutationObserver(processarPagina);
observador.observe(document.documentElement, { childList: true, subtree: true });

// Executa a verificação inicial imediatamente se a página já estiver em estado interativo ou completo
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // Pequeno delay para garantir que elementos dinâmicos sejam renderizados
    setTimeout(processarPagina, 200);
} else {
    // Se ainda estiver carregando, aguarda o evento 'load'
    window.addEventListener('load', processarPagina);
}

// Log de diagnóstico para confirmar que o script foi injetado
console.log('[AutoLogin] Content script carregado e observador ativo.');