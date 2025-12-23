// ==================== CONFIGURATION & STATE ====================
const CONFIG = {
    typingSpeed: 10,       // ms per char
    typingSpeedFast: 1,    // ms per char for long texts
    bootSequence: true,    // enable/disable boot fake sequence
    soundEnabled: true     // mute/unmute
};

const STATE = {
    lang: null,
    currentScreen: 'lang-screen',
    commandHistory: [],
    historyIndex: -1
};

// ==================== ASSETS ====================
const ASSETS = {
    skull: {
        desktop: `            @@@%%%%%%%%%@@          
         @@@%%%%%%%%%#######%@@     
       @@@@%%%%%%%######?######%@   
      @@@@%%%%%%%#######:########%@ 
    @@@@@%%%%%%#########:??#######% 
    @@@%%%%%####???###?+:??####?###@
   @@@%%%%%%#?+???###?:+?##??###?##@
 @??%@%%%##????????++:;+?+????????#@
 #  ;?%#?+; ..::+?+ ::;++++++?+???# 
 %  :?%;;;:  ....:#+ :;+++????+???@ 
 #;;+??+++:   ...;##: ;;;++???++?%  
 %#%+::++?#+;:::;?##+ ;;;;++??++#   
 %?% : :???+?++???######?+;;+??#    
 @%# ; ;??;;+ ;???+;;:..::.:+?%     
  @???;;?+;;;+ ;:;;......;;;#@      
  %##?++?+++;+ ??% @%%@@@@          
  @_:?_:+_:_:#%`,
        mobile: `     .ed"""" """$$$$be.
   -"           ^""**$$$e.
 ."                   '$$$c
/                      "4$$b
d  3                      $$$$
$  *                   .$$$$$$
$  .           .4$$$$$$$$$$$$$
$  3          $$$*$$$$$$$$$$$$
$   .        $$$  $$$$$$$$$$$$
$   3      .$$$   $$$$$$$$$$$$
$    .    .$$$$   $$$$$$$$$$$$
$    3.  .$$$$$   $$$$$$$$$$$$`
    },

    asciiTitle: `
╔══════════════════════════════════════════════════════╗
║                                                      ║
║              LANGUAGE / IDIOMA                       ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
`
};

// ==================== CORE FUNCTIONS ====================

// --- DOM UTILS ---
const $ = (id) => document.getElementById(id);
const show = (id) => $(id).classList.add('active');
const hide = (id) => $(id).classList.remove('active');
const hideAll = () => document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

// --- TYPING EFFECT ---
class TypeWriter {
    constructor(elementId, speed = CONFIG.typingSpeed) {
        this.element = $(elementId) || elementId; // Can pass ID or element
        this.speed = speed;
        this.queue = [];
        this.isTyping = false;
    }

    type(html, speedOverride = null, callback = null) {
        // Simple HTML appending for complex blocks (like tables/pre) to avoid breaking markup
        // For text-heavy content, we could process char by char, but for this portfolio, 
        // appending complete HTML blocks with a slight delay feels "terminal-like" enough 
        // without breaking color spans.

        // Implementing a realistic char-by-char typer for HTML is complex. 
        // We will simulate "line by line" or "block by block" appearance.

        const delay = speedOverride || this.speed;

        // Create a wrapper div for the new content to handle smooth entry
        const div = document.createElement('div');
        div.style.opacity = '0';
        div.style.transition = 'opacity 0.1s';
        div.innerHTML = html;
        this.element.appendChild(div);

        // Scroll to bottom
        this.element.scrollTop = this.element.scrollHeight;

        // "Type" it in (fade in quickly)
        setTimeout(() => {
            div.style.opacity = '1';
            if (callback) callback();
        }, delay);
    }

    // Simulates deleting text from input
    static async deleteChars(inputElement) {
        const text = inputElement.value;
        for (let i = text.length; i >= 0; i--) {
            inputElement.value = text.substring(0, i);
            await new Promise(r => setTimeout(r, 20));
        }
    }
}

// ==================== SOUND SYSTEM ====================
class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = CONFIG.soundEnabled;
    }

    playTone(freq, type, duration, vol = 0.1) {
        if (!this.enabled) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playKeystroke() {
        // Subtle crisp click
        this.playTone(600, 'square', 0.05, 0.03);
    }

    playEnter() {
        // Success chirp
        this.playTone(1000, 'sine', 0.1, 0.1);
        setTimeout(() => this.playTone(1500, 'sine', 0.1, 0.1), 50);
    }

    playError() {
        // Low buzz
        this.playTone(150, 'sawtooth', 0.2, 0.1);
    }
}

const soundManager = new SoundManager();
const terminalOutput = new TypeWriter('output');

// ==================== SCREEN LOGIC ====================

function showScreen(screenId) {
    hideAll();
    show(screenId);
    STATE.currentScreen = screenId;

    // Auto-focus input if terminal
    if (screenId === 'terminal-screen') {
        $('cmd-input').focus();
        setupMobileQuickCommands();
    }
}

// --- SCREEN 1: LANGUAGE ---
function initLanguageScreen() {
    $('ascii-title').innerHTML = ASSETS.asciiTitle;
}

function selectLanguage(langCode) {
    STATE.lang = langCode;
    showSplash();
}

// --- SCREEN 2: SPLASH ---
async function showSplash() {
    // Check screen size to choose ASCII art
    const isMobile = window.innerWidth <= 768;
    const skullArt = isMobile ? ASSETS.skull.mobile : ASSETS.skull.desktop;

    const info = STATE.lang === 'es' ? {
        user: 'Usuario:', alias: 'Alias:', role: 'Rol:', location: 'Ubicación:', github: 'GitHub:',
        press: '[Presiona ENTER o Toca para continuar...]'
    } : {
        user: 'User:', alias: 'Alias:', role: 'Role:', location: 'Location:', github: 'GitHub:',
        press: '[Press ENTER or Tap to continue...]'
    };

    $('skull-art').textContent = skullArt;

    // Update Neofetch info with typing simulation (instant pop-in for now is cleaner for layout)
    $('neofetch-info').innerHTML = `
        <div style="color: #00FFFF;">alonsomota@Alonsos-MacBook-Air.local</div>
        <div style="color: #FFF; margin-bottom: 1rem;">——————————————————————————————————————</div>
        <div><span style="color: #FFFF00;">${info.user}</span> José Alonso Mota Ríos</div>
        <div><span style="color: #FFFF00;">${info.alias}</span> Spooky17</div>
        <div><span style="color: #FFFF00;">${info.role}</span> Data Scientist</div>
        <div><span style="color: #FFFF00;">${info.location}</span> México</div>
        <div><span style="color: #FFFF00;">${info.github}</span> github.com/spooky1703</div>
    `;

    $('splash-msg').textContent = info.press;

    showScreen('splash-screen');

    // Wait for interaction
    const proceed = () => {
        document.removeEventListener('keydown', keyHandler);
        document.removeEventListener('click', clickHandler);
        document.removeEventListener('touchstart', clickHandler);
        showTerminal();
    };

    const keyHandler = (e) => { if (e.key === 'Enter') proceed(); };
    const clickHandler = () => proceed();

    document.addEventListener('keydown', keyHandler);
    document.addEventListener('click', clickHandler);
    document.addEventListener('touchstart', clickHandler);

    // Auto-proceed backup
    setTimeout(proceed, 5000); // Increased time to read
}

// --- SCREEN 3: TERMINAL ---
function showTerminal() {
    const welcome = STATE.lang === 'es'
        ? 'Bienvenido. Escribe "help" para ver comandos.'
        : 'Welcome. Type "help" to see commands.';

    terminalOutput.type(`<div style="color: #FFFF00; margin-bottom: 1rem;">${welcome}</div>`);
    showScreen('terminal-screen');

    // Bind events
    const input = $('cmd-input');

    input.addEventListener('keydown', function (e) {
        soundManager.playKeystroke();

        if (e.key === 'Enter') {
            e.preventDefault();
            soundManager.playEnter();
            const cmd = input.value.trim();
            handleCommand(cmd);
            input.value = '';
        }

        // Tab Autocomplete
        if (e.key === 'Tab') {
            e.preventDefault();
            const current = input.value.toLowerCase();
            if (!current) return;

            const allCmds = ['help', 'about', 'skills', 'projects', 'omi', 'tree', 'contact', 'github', 'neofetch', 'clear', 'cv'];
            const matches = allCmds.filter(c => c.startsWith(current));

            if (matches.length === 1) {
                input.value = matches[0];
            } else if (matches.length > 1) {
                // Show possibilities? For now just cycle or ignore
                // Simple implementation: complete common prefix or just first match
                input.value = matches[0];
            }
        }

        // History navigation could be added here (Up/Down arrows)
    });

    // Keep focus
    document.addEventListener('click', (e) => {
        // Don't focus if clicking buttons
        if (!e.target.closest('button') && !e.target.closest('a')) {
            input.focus();
        }
    });

    // Mobile prompt adjustment logic
    if (Number(window.innerWidth) < 400) {
        document.querySelector('.prompt').innerText = '$';
    }
}

function handleCommand(cmdRaw) {
    const cmd = cmdRaw.toLowerCase().trim();

    // Echo command
    //$('output').innerHTML += `<div><span style="color: #00FF00;">spooky17@datascience:~$</span> <span style="color: #00FFFF;">${cmdRaw}</span></div>`;
    terminalOutput.type(`<div><span style="color: #00FF00;">spooky17@datascience:~$</span> <span style="color: #00FFFF;">${cmdRaw}</span></div>`, 0);

    if (!cmd) return;

    const response = getCommandResponse(cmd);
    if (response) {
        terminalOutput.type(`<div style="margin-bottom: 1rem;">${response}</div>`, 10);
    }
}

// ==================== COMMANDS DATA ====================
function getCommandResponse(cmd) {
    const isEs = STATE.lang === 'es';

    switch (cmd) {
        case 'help':
            return isEs ? `<pre style="color: #00FF00; line-height: 1.8;">
Comandos disponibles:

<span style="color: #00FFFF;">NAVEGACIÓN:</span>
  ls                  - listar archivos
  tree                - estructura
  clear               - limpiar pantalla

<span style="color: #00FFFF;">INFORMACIÓN:</span>
  about               - información personal
  skills              - habilidades técnicas
  projects            - portfolio de proyectos
  contact             - contacto
  github              - perfil y repositorios

<span style="color: #00FFFF;">ESPECIALES:</span>
  omi                 - logros programación
  neofetch            - info del sistema
  hack                - ???
  lang                - cambiar idioma
  cv                  - descargar currículum
</pre>` : `<pre style="color: #00FF00; line-height: 1.8;">
Available commands:

<span style="color: #00FFFF;">NAVIGATION:</span>
  ls                  - list files
  tree                - file structure
  clear               - clear screen

<span style="color: #00FFFF;">INFORMATION:</span>
  about               - personal information
  skills              - technical skills
  projects            - project portfolio
  contact             - contact info
  github              - profile and repos

<span style="color: #00FFFF;">SPECIAL:</span>
  omi                 - programming achievements
  neofetch            - system info
  hack                - ???
  lang                - change language
  cv                  - download resume
</pre>`;

        case 'about':
            return isEs ? `<pre style="color: #00FF00; line-height: 1.6;">
<span style="color: #00FFFF;">=== INFORMACIÓN PERSONAL ===</span>

<span style="color: #00FF00;">Nombre:</span> José Alonso Mota Ríos
<span style="color: #00FF00;">Alias:</span>  Spooky17
<span style="color: #00FF00;">Ubicación:</span> México

<span style="color: #FFFF00;">[+]</span> 8 años de experiencia
<span style="color: #FFFF00;">[+]</span> Representante Estatal OMI
<span style="color: #FFFF00;">[+]</span> Estudiante Ciencia de Datos IPN
<span style="color: #FFFF00;">[+]</span> Especialista ML y Analytics

Con una pasión por la Ciencia de Datos
y la Analítica Avanzada.
</pre>` : `<pre style="color: #00FF00; line-height: 1.6;">
<span style="color: #00FFFF;">=== PERSONAL INFORMATION ===</span>

<span style="color: #00FF00;">Name:</span> José Alonso Mota Ríos
<span style="color: #00FF00;">Alias:</span>  Spooky17
<span style="color: #00FF00;">Location:</span> México

<span style="color: #FFFF00;">[+]</span> 8 years of experience
<span style="color: #FFFF00;">[+]</span> OMI State Representative
<span style="color: #FFFF00;">[+]</span> Data Science Student IPN
<span style="color: #FFFF00;">[+]</span> ML & Analytics Specialist

Passionate about Data Science and 
Advanced Analytics.
</pre>`;

        case 'skills':
            return isEs ? `<pre style="color: #00FF00; line-height: 1.6;">
<span style="color: #00FFFF;">>>> HABILIDADES <<<</span>

<span style="color: #FFFF00;">LENGUAJES:</span>
<span style="color: #00FF00;">C++</span>    [95%] - Programación Competitiva
<span style="color: #00FF00;">Python</span> [95%] - ML, Data Science
<span style="color: #00FF00;">R</span>      [85%] - Estadística

<span style="color: #FFFF00;">HERRAMIENTAS:</span>
Git, Docker, AWS, SQL, Linux/Mac

<span style="color: #FFFF00;">FOCUS:</span>
Data Science, Machine Learning,
Complex Problem Solving.
</pre>` : `<pre style="color: #00FF00; line-height: 1.6;">
<span style="color: #00FFFF;">>>> SKILLS <<<</span>

<span style="color: #FFFF00;">LANGUAGES:</span>
<span style="color: #00FF00;">C++</span>    [95%] - Competitive Programming
<span style="color: #00FF00;">Python</span> [95%] - ML, Data Science
<span style="color: #00FF00;">R</span>      [85%] - Statistics

<span style="color: #FFFF00;">TOOLS:</span>
Git, Docker, AWS, SQL, Linux/Mac

<span style="color: #FFFF00;">FOCUS:</span>
Data Science, Machine Learning,
Complex Problem Solving.
</pre>`;

        case 'projects':
            // Simplified for mobile reading but keeping links
            return isEs ? `<pre style="color: #00FF00; line-height: 1.6;">
<span style="color: #00FFFF;">=== PROYECTOS ===</span>

<span style="color: #FFFF00;">[1] Music Downloader</span>
    Python, Matplotlib. Gestión de música.
    <a href="https://github.com/spooky1703/SoundcloudDWN" target="_blank">[Ver Código]</a>

<span style="color: #FFFF00;">[2] Black Hole Simulator</span>
    C++, ML Supervisado.
    <a href="https://github.com/spooky1703/blackHole_Simulator" target="_blank">[Ver Código]</a>

<span style="color: #FFFF00;">[3] OMEGAUP Soluciones</span>
    C++, Algoritmos Avanzados.
    <a href="https://github.com/spooky1703/OMEGAUP" target="_blank">[Ver Código]</a>

<span style="color: #FFFF00;">[4] Virtual Board</span>
    Python, OpenCV.
    <a href="https://github.com/spooky1703/Virtual_Paint2" target="_blank">[Ver Código]</a>
</pre>` : `<pre style="color: #00FF00; line-height: 1.6;">
<span style="color: #00FFFF;">=== PROJECTS ===</span>

<span style="color: #FFFF00;">[1] Music Downloader</span>
    Python, Matplotlib. Music manager.
    <a href="https://github.com/spooky1703/SoundcloudDWN" target="_blank">[View Code]</a>

<span style="color: #FFFF00;">[2] Black Hole Simulator</span>
    C++, Supervised ML.
    <a href="https://github.com/spooky1703/blackHole_Simulator" target="_blank">[View Code]</a>

<span style="color: #FFFF00;">[3] OMEGAUP Solutions</span>
    C++, Advanced Algorithms.
    <a href="https://github.com/spooky1703/OMEGAUP" target="_blank">[View Code]</a>

<span style="color: #FFFF00;">[4] Virtual Board</span>
    Python, OpenCV.
    <a href="https://github.com/spooky1703/Virtual_Paint2" target="_blank">[View Code]</a>
</pre>`;

        case 'contact':
        case 'email':
            setTimeout(() => { if (cmd === 'email') window.location.href = 'mailto:ryverz.alonso@gmail.com'; }, 1000);
            return isEs ? `<span style="color: #FFFF00;">Email:</span> <a href="mailto:ryverz.alonso@gmail.com">ryverz.alonso@gmail.com</a>`
                : `<span style="color: #FFFF00;">Email:</span> <a href="mailto:ryverz.alonso@gmail.com">ryverz.alonso@gmail.com</a>`;

        case 'github':
            setTimeout(() => { window.open('https://github.com/spooky1703', '_blank'); }, 1000);
            return isEs ? `Abriendo GitHub...` : `Opening GitHub...`;

        case 'neofetch':
            // Reuse the splash function but inline
            const isMobile = window.innerWidth <= 768;
            const skull = isMobile ? ASSETS.skull.mobile : ASSETS.skull.desktop;
            return `<pre style="color: #00FF00; font-size: ${isMobile ? '8px' : '12px'};">${skull}</pre>`;

        case 'ls':
            return isEs ? `<span style="color:#00FFFF;">total 5</span><br><span style="color:#00FF00;">drwx</span> about/<br><span style="color:#00FF00;">drwx</span> skills/<br><span style="color:#00FF00;">drwx</span> projects/`
                : `<span style="color:#00FFFF;">total 5</span><br><span style="color:#00FF00;">drwx</span> about/<br><span style="color:#00FF00;">drwx</span> skills/<br><span style="color:#00FF00;">drwx</span> projects/`;

        case 'clear':
            $('output').innerHTML = '';
            return null;

        case 'hack':
            return triggerHackEffect(isEs);

        case 'omi':
            return isEs ? `<pre style="color: #00FF00; line-height: 1.6;">
<span style="color: #FFFF00;">[+] EXPERIENCIA COMPETITIVA [+]</span>

<span style="color: #00FFFF;">>>> OLIMPIADA MEXICANA DE INFORMÁTICA <<<</span>

<span style="color: #00FF00;">Status:</span> REPRESENTANTE ESTATAL
<span style="color: #00FF00;">Nivel:</span>  COMPETENCIA NACIONAL

La Olimpiada Mexicana de Informática (OMI) es la 
competencia nacional más prestigiosa de programación 
algorítmica en México.

<span style="color: #FFFF00;">HABILIDADES:</span>
<span style="color: #00FF00;">[*]</span> Algoritmos Avanzados
<span style="color: #00FF00;">[*]</span> Estructuras de Datos
<span style="color: #00FF00;">[*]</span> Optimización
</pre>` : `<pre style="color: #00FF00; line-height: 1.6;">
<span style="color: #FFFF00;">[+] COMPETITIVE EXPERIENCE [+]</span>

<span style="color: #00FFFF;">>>> MEXICAN INFORMATICS OLYMPIAD <<<</span>

<span style="color: #00FF00;">Status:</span> STATE REPRESENTATIVE
<span style="color: #00FF00;">Level:</span>  NATIONAL COMPETITION

The Mexican Informatics Olympiad (OMI) is the most 
prestigious national video programming competition 
in Mexico.

<span style="color: #FFFF00;">SKILLS:</span>
<span style="color: #00FF00;">[*]</span> Advanced Algorithms
<span style="color: #00FF00;">[*]</span> Data Structures
<span style="color: #00FF00;">[*]</span> Optimization
</pre>`;

        case 'tree':
            return `<pre style="color: #00FF00;">
<span style="color: #00FF00;">.</span>
├── about/
│   ├── bio.txt
│   ├── education.txt
│   └── experience.txt
├── skills/
│   ├── languages.txt
│   ├── tools.txt
│   └── specializations.txt
├── projects/
│   ├── data_science/
│   ├── competitive/
│   └── research/
├── achievements/
│   └── omi.txt
├── contact/
│   └── info.txt
└── README.md
</pre>`;

        case 'whoami':
            return '<span style="color: #00FF00;">spooky17</span>';

        case 'pwd':
            return '<span style="color: #00FF00;">/home/spooky17</span>';

        case 'cd':
            return isEs
                ? '<span style="color: #FFFF00;">Navegación simulada. Usa "ls" o "cat" (broma).</span>'
                : '<span style="color: #FFFF00;">Simulated navigation. Use "ls" or "cat" (joke).</span>';

        case 'cv':
        case 'curriculum':
            return isEs
                ? `<span style="color: #00FF00;">Generando PDF...</span><br><span style="color: #FFFF00;">[!] Error: No CV found on server. Please email me.</span>`
                : `<span style="color: #00FF00;">Generating PDF...</span><br><span style="color: #FFFF00;">[!] Error: No CV found on server. Please email me.</span>`;

        case 'lang':
            STATE.lang = isEs ? 'en' : 'es';
            return isEs ? 'Language changed to English.' : 'Idioma cambiado a Español.';

        default:
            return isEs ? `<span style="color: #FF0000;">comando no encontrado: ${cmd}</span>`
                : `<span style="color: #FF0000;">command not found: ${cmd}</span>`;
    }
}

function triggerHackEffect(isEs) {
    const messages = isEs ?
        ['Iniciando...', 'Rompiendo Firewall...', 'Acceso Root...', 'Descargando Datos...', 'JAJAJA Es broma.'] :
        ['Starting...', 'Breaching Firewall...', 'Root Access...', 'Downloading Data...', 'LOL Just kidding.'];

    let i = 0;
    const interval = setInterval(() => {
        if (i >= messages.length) {
            clearInterval(interval);
            return;
        }
        terminalOutput.type(`<div><span style="color: #FF0000;">[!]</span> ${messages[i]}</div>`);
        i++;
    }, 800);

    return `<span style="color: #FFFF00;">${isEs ? 'Ejecutando script...' : 'Running script...'}</span>`;
}

// ==================== MOBILE UTILS ====================
function setupMobileQuickCommands() {
    const quickCmds = ['help', 'about', 'skills', 'projects', 'omi', 'tree', 'cv', 'contact', 'clear'];
    const container = $('quick-commands');
    container.innerHTML = '';

    quickCmds.forEach(cmd => {
        const btn = document.createElement('button');
        btn.className = 'quick-btn';
        btn.textContent = cmd;
        btn.onclick = () => {
            $('cmd-input').value = cmd;
            handleCommand(cmd); // Auto submit
        };
        container.appendChild(btn);
    });
}

// ==================== INIT ====================
window.onload = function () {
    initLanguageScreen();
};
