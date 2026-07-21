// adicinar novos roteadores. 

// Base de credenciais organizadas por modelo de equipamento
const bancoDeCredenciais = {
    "ZTE_H3601P": [
        { usuario: "multipro", senha: "Onucl1ck1p" },
        { usuario: "multipro", senha: "0nucl!ck!P" }
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

// Flag de controle para evitar chamadas simultâneas
let fluxoExecutado = false; 

/**
 * Dispara eventos reais de ponteiro para simular o clique do usuário
 */
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

/**
 * Preenche o campo e emite os eventos de formulário necessários
 */
function preencherCampo(campo, valor) {
    if (!campo) return;
    campo.focus();
    campo.value = valor;
    
    ['input', 'change', 'blur'].forEach(tipo => {
        campo.dispatchEvent(new Event(tipo, { bubbles: true, cancelable: true }));
    });
}

/**
 * Busca pelo campo de usuário na página
 */
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

/**
 * Busca pelo botão de ação de login na interface
 */
function localizarBotaoLogin() {
    let alvo = document.querySelector(
        '#LoginId, .submitBtn, #loginBtn, .loginBtn, [id*="login" i][id*="btn" i], [class*="login" i][class*="btn" i], input[type="submit"]'
    );
    
    if (alvo && (alvo.tagName === 'DIV' || alvo.tagName === 'SPAN')) {
        const subBotao = alvo.querySelector('input[type="submit"], input[type="button"], button');
        if (subBotao) alvo = subBotao;
    }

    if (alvo && alvo.type !== 'hidden' && alvo.offsetParent !== null) {
        return alvo;
    }

    const todosElementos = document.querySelectorAll('button, input, div, span, a');
    for (let elemento of todosElementos) {
        if (elemento.type === 'hidden' || elemento.offsetParent === null) continue;

        const texto = (elemento.innerText || elemento.value || '').trim().toLowerCase();
        if (['login', 'acessar', 'entrar'].includes(texto)) {
            return elemento;
        }
    }
    return null;
}

/**
 * Identifica o modelo do equipamento através do conteúdo da página
 */
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

/**
 * Verifica se a interface do roteador está em bloqueio temporário
 */
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

/**
 * Trata o pop-up de 'Bad Password' específico do DM986-414
 */
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

/**
 * Executa as tentativas de login preenchendo o formulário
 */
function executarFluxoLogin(modelo, tentativaIndex = 0) {
    if (estaBloqueadoPorTempo()) {
        console.warn("[Autologin] Bloqueio por tempo detectado. Interrompendo execução.");
        fluxoExecutado = true;
        return;
    }

    const credenciaisDoModelo = bancoDeCredenciais[modelo];
    
    if (!credenciaisDoModelo || tentativaIndex >= credenciaisDoModelo.length) {
        sessionStorage.removeItem(`autologin_tentativa_${modelo}`);
        fluxoExecutado = false;
        console.warn("[Autologin] Limite de tentativas alcançado.");
        return;
    }

    const credencialAtual = credenciaisDoModelo[tentativaIndex];
    const campoUsuario = localizarCampoUsuario();
    let campoSenha = document.querySelector('input[type="password"], input[data-autologin-pass]');

    if (campoUsuario && campoSenha) {
        fluxoExecutado = true; 
        console.log(`[Autologin] Tentativa ${tentativaIndex + 1}/${credenciaisDoModelo.length} | Modelo: ${modelo}`);

        sessionStorage.setItem(`autologin_tentativa_${modelo}`, String(tentativaIndex + 1));
        
        preencherCampo(campoUsuario, credencialAtual.usuario);
        preencherCampo(campoSenha, credencialAtual.senha);

        setTimeout(() => {
            // Prevenção contra o pop-up de 'Salvar Senha' exclusivo do DM986-414
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

            // Intervalo de segurança antes de validar o resultado ou tentar a próxima senha
            setTimeout(() => {
                if (estaBloqueadoPorTempo()) {
                    console.warn("[Autologin] Roteador em tempo de espera. Aguardando...");
                    return;
                }

                const aindaNaPaginaLogin = document.querySelector('input[type="password"], input[data-autologin-pass]');
                if (aindaNaPaginaLogin && aindaNaPaginaLogin.offsetParent !== null) {
                    if (modelo === "DM986-414") aindaNaPaginaLogin.type = 'password';
                    fluxoExecutado = false; 
                    executarFluxoLogin(modelo, tentativaIndex + 1);
                } else {
                    sessionStorage.removeItem(`autologin_tentativa_${modelo}`);
                    if (typeof observador !== 'undefined') observador.disconnect();
                }
            }, 4500); 

        }, 800);
    }
}

// Observador de alterações no DOM para disparo dinâmico
const observador = new MutationObserver(() => {
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

    if (modelo && campoSenha && campoSenha.offsetParent !== null) {
        const chaveTentativa = `autologin_tentativa_${modelo}`;
        const tentativaSalva = parseInt(sessionStorage.getItem(chaveTentativa) || '0', 10);
        
        if (tentativaSalva < bancoDeCredenciais[modelo].length) {
            executarFluxoLogin(modelo, tentativaSalva);
        }
    }
});

observador.observe(document.documentElement, {
    childList: true,
    subtree: true
});