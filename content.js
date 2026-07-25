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
 * Checagem de visibilidade mais rigorosa que "offsetParent !== null" sozinho.
 * Alguns roteadores mantêm escondido, em TODA página do dashboard, um
 * mini-formulário de "sessão expirada, faça login de novo" — escondido via
 * opacity:0 / visibility:hidden / tamanho zero, em vez de display:none. Só
 * offsetParent não detecta isso (continua não-nulo nesses casos), e o script
 * acabava confundindo esse formulário oculto com a tela de login de verdade,
 * mesmo já estando no dashboard.
 */
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
        // Marca como esgotado pra esse modelo — sem isso, o observer lia a
        // ausência da chave de tentativa como "começar do zero" e reiniciava
        // o ciclo infinitamente, testando as mesmas credenciais sem parar.
        sessionStorage.setItem(`autologin_esgotado_${modelo}`, 'true');
        fluxoExecutado = true; // trava de vez — não deixa o observer reativar
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

    // DETECÇÃO DE SUCESSO ROBUSTA A NAVEGAÇÃO: quando o login dá certo, o
    // roteador costuma navegar pra outra página — o que mata o script no
    // meio do caminho, antes dele conseguir confirmar o sucesso e gravar a
    // trava (o setTimeout que fazia essa confirmação nunca chega ao fim).
    // Por isso, detectamos aqui, de fora: se havia uma tentativa registrada
    // pra esse modelo e a página atual (já carregada por completo) não
    // parece mais ser a tela de login, foi sucesso — grava a trava agora.
    if (modelo && document.readyState === 'complete') {
        const tentativaEmAndamento = sessionStorage.getItem(`autologin_tentativa_${modelo}`);
        const aindaEhTelaDeLogin = campoSenha && estaRealmenteVisivel(campoSenha) && localizarBotaoLogin();
        if (tentativaEmAndamento && !aindaEhTelaDeLogin) {
            sessionStorage.removeItem(`autologin_tentativa_${modelo}`);
            sessionStorage.removeItem(`autologin_tentativa_ts_${modelo}`);
            sessionStorage.setItem(`autologin_logado_${modelo}`, 'true');
        }
    }

    // TRAVA DURA: uma vez que o login já deu certo nessa aba/sessão, o script
    // nunca mais tenta de novo — não importa o que apareça depois na tela
    // (dashboard, modal escondido, etc.). Só um F5 real (que recarrega o
    // content.js do zero) reativa o processo.
    if (modelo && sessionStorage.getItem(`autologin_logado_${modelo}`) === 'true') {
        return;
    }

    // Se já esgotou as tentativas pra esse modelo nessa sessão, não tenta
    // de novo automaticamente — evita reiniciar em loop.
    if (modelo && sessionStorage.getItem(`autologin_esgotado_${modelo}`) === 'true') {
        return;
    }

    if (modelo && campoSenha && estaRealmenteVisivel(campoSenha) && localizarBotaoLogin()) {
        const chaveTentativa = `autologin_tentativa_${modelo}`;
        const chaveTimestamp = `autologin_tentativa_ts_${modelo}`;
        let tentativaSalva = parseInt(sessionStorage.getItem(chaveTentativa) || '0', 10);

        // Expira a contagem salva depois de 20s. Um ciclo normal de tentativas
        // dura poucos segundos; se a tela de login voltar a aparecer bem
        // depois disso (ex: usuário fez logout manual minutos depois de já
        // ter acessado), tratamos como sessão nova em vez de reaproveitar uma
        // contagem antiga que nunca foi limpa (a navegação de sucesso mata o
        // script antes da linha que faria essa limpeza).
        const timestampSalvo = parseInt(sessionStorage.getItem(chaveTimestamp) || '0', 10);
        if (tentativaSalva > 0 && Date.now() - timestampSalvo > 20000) {
            tentativaSalva = 0;
        }

        // Só na PRIMEIRA tentativa: se a página ainda não terminou de carregar
        // todos os recursos (ex: bibliotecas JS externas usadas por alguns
        // roteadores pra criptografar a senha antes de enviar, como o
        // crypto-js do DM985-424 HW2), espera o evento 'load' completar antes
        // de preencher e clicar. Sem isso, o script podia agir rápido demais
        // — mais rápido que um humano digitando — e enviar antes dessas
        // bibliotecas estarem prontas, causando rejeição mesmo com a senha
        // certa (só acontecia no automático, nunca no login manual).
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

        // IMPORTANTE: sempre chama executarFluxoLogin, mesmo se tentativaSalva
        // já tiver estourado o total de credenciais. É essa própria função que
        // detecta o esgotamento e mostra o alerta / limpa os campos — se a
        // gente bloquear a chamada aqui, esse aviso nunca chega a rodar
        // (era exatamente isso que estava fazendo o alerta sumir depois de
        // uma página de erro do roteador recarregar a tela de login).
        //
        // A exigência de localizarBotaoLogin() acima é o que impede isso de
        // disparar em telas de DASHBOARD (que podem ter campo de senha do
        // Wi-Fi, mas nunca têm um botão de login/acessar/entrar) — sem essa
        // trava, uma navegação de sucesso pro dashboard podia reaproveitar
        // a contagem de tentativa antiga (nunca foi limpa, porque a
        // navegação mata o script antes da linha que faria isso) e mostrar
        // "esgotado" mesmo com o login já tendo dado certo.
        executarFluxoLogin(modelo, tentativaSalva);
    }
});

observador.observe(document.documentElement, {
    childList: true,
    subtree: true
});