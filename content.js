// adicinar novos roteadores. 

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

let fluxoExecutado = false; // Garante que não vai rodar duas vezes ao mesmo tempo

// Clique "de verdade": dispara mousedown -> mouseup -> click, em vez de só
// chamar .click() (alguns roteadores só reagem a eventos reais de mouse).
function clicarComMouse(elemento) {
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

function localizarBotaoLogin() {
    // PRIORIDADE 1: ids/classes conhecidas de botão de login em roteadores já vistos
    let alvo = document.querySelector(
        '#LoginId, .submitBtn, #loginBtn, .loginBtn, [id*="login" i][id*="btn" i], [class*="login" i][class*="btn" i]'
    );
    
    // Ajuste para o ZTE: Se o alvo for uma DIV, pega o botão real dentro dela
    if (alvo && (alvo.tagName === 'DIV' || alvo.tagName === 'SPAN')) {
        const subBotao = alvo.querySelector('input[type="submit"], input[type="button"], button');
        if (subBotao) {
            alvo = subBotao;
        }
    }

    if (alvo && alvo.type !== 'hidden' && alvo.offsetParent !== null) {
        return alvo;
    }

    // PRIORIDADE 2: loop genérico por texto/valor
    const todosElementos = document.querySelectorAll('button, input, div, span, a');
    for (let elemento of todosElementos) {
        if (elemento.type === 'hidden') continue;
        if (elemento.offsetParent === null) continue;

        const texto = elemento.innerText ? elemento.innerText.trim().toLowerCase() : '';
        const valor = elemento.value ? elemento.value.trim().toLowerCase() : '';
        if (texto === 'login' || texto === 'acessar' || texto === 'entrar' || valor === 'login' || valor === 'acessar') {
            return elemento;
        }
    }
    return null;
}

function identificarModeloRoteador() {
    const textoPagina = document.body ? document.body.innerText : "";
    const tituloPagina = document.title || "";
    const conteudoCompleto = (textoPagina + " " + tituloPagina);

    if (conteudoCompleto.includes("H3601P") || conteudoCompleto.includes("ZTE")) {
        return "ZTE_H3601P";
    } 
    
    // ORDEM CRÍTICA DA DATACOM: Checa primeiro as versões específicas para não confundir
    if (conteudoCompleto.includes("DM985-424 HW2") || conteudoCompleto.includes("DM985")) {
        return "DM985-424 HW2";
    }
    if (conteudoCompleto.includes("DM986-414") || conteudoCompleto.includes("414")) {
        return "DM986-414";
    }
    if (conteudoCompleto.includes("DM986-416") || conteudoCompleto.includes("DM986") || conteudoCompleto.toLowerCase().includes("datacom")) {
        return "DM986_416";
    }

    return null;
}

// Trata a tela de erro específica do 414
function checarETratarTelaErro() {
    const textoPagina = document.body ? document.body.innerText.toUpperCase() : "";
    if (textoPagina.includes("ERROR: BAD PASSWORD!") || textoPagina.includes("BAD PASSWORD")) {
        const botoes = document.querySelectorAll('button, input[type="button"], input[type="submit"]');
        for (let botao of botoes) {
            if (botao.value.toUpperCase() === "OK" || botao.innerText.toUpperCase() === "OK") {
                setTimeout(() => { clicarComMouse(botao); }, 1000);
                return true;
            }
        }
    }
    return false;
}

function executarFluxoLogin(modelo, tentativaIndex = 0) {
    const credenciaisDoModelo = bancoDeCredenciais[modelo];
    
    if (!credenciaisDoModelo || tentativaIndex >= credenciaisDoModelo.length) {
        const campoUsuario = document.querySelector('input[type="text"], input[name*="user"], input[id*="user"], input[name*="username"], input[id*="username"], input[name*="login"]');
        const campoSenha = document.querySelector('input[type="password"], input[name*="pass"], input[id*="pass"], input[name*="pwd"]');
        if (campoUsuario) campoUsuario.value = "";
        if (campoSenha) campoSenha.value = "";

        sessionStorage.removeItem(`autologin_tentativa_${modelo}`);
        alert("Tentativas automáticas esgotadas. Por favor, insira os dados manualmente.");
        return;
    }

    const credencialAtual = credenciaisDoModelo[tentativaIndex];
    const campoUsuario = document.querySelector('input[type="text"], input[name*="user"], input[id*="user"], input[name*="username"], input[id*="username"], input[name*="login"]');
    const campoSenha = document.querySelector('input[type="password"], input[name*="pass"], input[id*="pass"], input[name*="pwd"]');

    if (campoUsuario && campoSenha) {
        fluxoExecutado = true; // Bloqueia o observer enquanto preenche
        console.log(`[Diag] Tentativa ${tentativaIndex + 1}/${credenciaisDoModelo.length} — modelo: ${modelo}`);

        sessionStorage.setItem(`autologin_tentativa_${modelo}`, String(tentativaIndex + 1));
        
        campoUsuario.value = credencialAtual.usuario;
        campoSenha.value = credencialAtual.senha;
        
        const eventos = ['input', 'change'];
        eventos.forEach(ev => {
            campoUsuario.dispatchEvent(new Event(ev, { bubbles: true }));
            campoSenha.dispatchEvent(new Event(ev, { bubbles: true }));
        });

        setTimeout(() => {
            const botao = localizarBotaoLogin();
            let clicou = false;

            if (botao) {
                clicarComMouse(botao);
                clicou = true;
            }

            if (!clicou) {
                const eventoEnter = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, keyCode: 13, key: 'Enter' });
                campoSenha.dispatchEvent(eventoEnter);
            }

            setTimeout(() => {
                const aindaNaPaginaLogin = document.querySelector('input[type="password"]');
                if (aindaNaPaginaLogin) {
                    fluxoExecutado = false;
                    executarFluxoLogin(modelo, tentativaIndex + 1);
                } else {
                    sessionStorage.removeItem(`autologin_tentativa_${modelo}`);
                    observador.disconnect();
                }
            }, 3000); 

        }, 800);
    }
}

const observador = new MutationObserver((mutations) => {
    if (fluxoExecutado) return;

    // Se bater na tela de erro do 414, clica no OK para voltar
    if (checarETratarTelaErro()) {
        fluxoExecutado = true;
        return;
    }

    const modelo = identificarModeloRoteador();
    const campoSenha = document.querySelector('input[type="password"]');

    if (modelo && campoSenha) {
        const chaveTentativa = `autologin_tentativa_${modelo}`;
        const tentativaSalva = parseInt(sessionStorage.getItem(chaveTentativa) || '0', 10);
        executarFluxoLogin(modelo, tentativaSalva);
    }
});

observador.observe(document.documentElement, {
    childList: true,
    subtree: true
});