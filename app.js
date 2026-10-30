
// ==========================================
// FIGHT CLUB TIMER - CRONÔMETRO DE TREINO
// ==========================================

// ELEMENTOS HTML
const timerDisplay = document.getElementById("timer");
const phaseDisplay = document.getElementById("phase");
const currentRoundDisplay = document.getElementById("currentRound");
const totalRoundsDisplay = document.getElementById("totalRounds");
const progressBar = document.getElementById("progressBar");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const saveBtn = document.getElementById("saveBtn");
const loadBtn = document.getElementById("loadBtn");

const workTimeInput = document.getElementById("workTime");
const restTimeInput = document.getElementById("restTime");
const roundsInput = document.getElementById("rounds");
const savedWorkoutsSelect = document.getElementById("savedWorkouts");
const volumeInput = document.getElementById("volume");

// ==========================================
// VARIÁVEIS
// ==========================================

let workTime = 30;
let restTime = 15;
let totalRounds = 5;
let currentRound = 1;

let phase = "ready";
let remaining = workTime;
let running = false;
let deadline = 0;
let interval = null;

let countdownNumber = 3;
let lastBeepSecond = null;

let audioContext = null;

// ==========================================
// CONFIGURAÇÕES
// ==========================================

function readSettings() {
    workTime = Math.max(1, Number(workTimeInput.value) || 30);
    restTime = Math.max(0, Number(restTimeInput.value) || 0);
    totalRounds = Math.max(1, Number(roundsInput.value) || 1);
}

function getVolume() {
    return volumeInput ? Number(volumeInput.value) : 0.85;
}

// ==========================================
// ÁUDIO
// ==========================================

async function unlockAudio() {
    const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    if (!audioContext) {
        audioContext = new AudioContextClass();
    }

    if (audioContext.state === "suspended") {
        await audioContext.resume();
    }
}

function playBeep(frequency = 900, duration = 0.18) {
    if (!audioContext || audioContext.state !== "running") return;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(0.001, audioContext.currentTime);

    gain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, getVolume() * 0.7),
        audioContext.currentTime + 0.02
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
}

function speak(message) {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const voice = new SpeechSynthesisUtterance(message);

    voice.lang = "pt-BR";
    voice.rate = 0.95;
    voice.pitch = 1;
    voice.volume = getVolume();

    window.speechSynthesis.speak(voice);
}

// ==========================================
// FORMATAÇÃO DO TEMPO
// ==========================================

function formatTime(seconds) {
    const safeSeconds = Math.max(0, Math.ceil(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(secs).padStart(2, "0")
    );
}

// ==========================================
// ATUALIZAÇÃO DA TELA
// ==========================================

function updateScreen() {
    timerDisplay.textContent = formatTime(remaining);

    currentRoundDisplay.textContent = currentRound;
    totalRoundsDisplay.textContent = totalRounds;

    if (phase === "ready") {
        phaseDisplay.textContent = "PRONTO PARA TREINAR";
    } else if (phase === "countdown") {
        phaseDisplay.textContent = "PREPARE-SE!";
        timerDisplay.textContent = countdownNumber;
    } else if (phase === "work") {
        phaseDisplay.textContent = "EXERCÍCIO";
    } else if (phase === "rest") {
        phaseDisplay.textContent = "DESCANSO";
    } else if (phase === "done") {
        phaseDisplay.textContent = "TREINO FINALIZADO!";
    }

    let percentage = 0;

    if (phase === "work" && workTime > 0) {
        percentage = ((workTime - remaining) / workTime) * 100;
    } else if (phase === "rest" && restTime > 0) {
        percentage = ((restTime - remaining) / restTime) * 100;
    } else if (phase === "countdown") {
        percentage = ((3 - countdownNumber) / 3) * 100;
    } else if (phase === "done") {
        percentage = 100;
    }

    progressBar.style.width =
        `${Math.min(100, Math.max(0, percentage))}%`;

    // BOTÃO PAUSAR / CONTINUAR
    pauseBtn.textContent = running ? "PAUSAR" : "CONTINUAR";

    // NÃO PERMITE PAUSAR DURANTE A CONTAGEM REGRESSIVA
    pauseBtn.disabled = !(
        phase === "work" || phase === "rest"
    );

    if (
        phase === "ready" ||
        phase === "done" ||
        phase === "countdown"
    ) {
        pauseBtn.textContent = "PAUSAR";
        pauseBtn.disabled = true;
    }
}

// ==========================================
// CONTAGEM REGRESSIVA 3, 2, 1
// ==========================================

function startCountdown() {
    phase = "countdown";
    countdownNumber = 3;
    remaining = 3;

    deadline = Date.now() + 3000;

    speak("3");
    playBeep(700, 0.2);

    updateScreen();
}

// ==========================================
// COMEÇAR EXERCÍCIO
// ==========================================

function startWork() {
    phase = "work";
    remaining = workTime;

    deadline = Date.now() + workTime * 1000;

    lastBeepSecond = null;

    speak("Exercício iniciado!");
    playBeep(1100, 0.4);

    updateScreen();
}

// ==========================================
// COMEÇAR DESCANSO
// ==========================================

function startRest() {
    phase = "rest";
    remaining = restTime;

    deadline = Date.now() + restTime * 1000;

    lastBeepSecond = null;

    speak("Descanso!");
    playBeep(600, 0.4);

    updateScreen();
}

// ==========================================
// FINALIZAR TREINO
// ==========================================

function finishWorkout() {
    running = false;
    phase = "done";
    remaining = 0;

    clearInterval(interval);
    interval = null;

    window.speechSynthesis?.cancel();

    playBeep(1200, 0.8);
    speak("Treino finalizado!");

    updateScreen();
}

// ==========================================
// MUDAR DE FASE
// ==========================================

function nextPhase() {
    if (phase === "work") {
        if (currentRound < totalRounds && restTime > 0) {
            startRest();

        } else if (currentRound < totalRounds) {
            currentRound++;
            startWork();

        } else {
            finishWorkout();
        }

    } else if (phase === "rest") {
        currentRound++;
        startWork();
    }
}

// ==========================================
// INICIAR TREINO
// ==========================================

function startTimer() {
    if (running) return;

    unlockAudio().catch(() => {});

    if (phase === "done") {
        resetTimer();
    }

    if (phase === "ready") {
        readSettings();
        currentRound = 1;

        startCountdown();

    } else if (phase === "countdown") {
        return;

    } else {
        deadline = Date.now() + remaining * 1000;
    }

    running = true;

    clearInterval(interval);
    interval = setInterval(tick, 50);

    updateScreen();
}

// ==========================================
// PAUSAR TREINO
// ==========================================

function pauseTimer() {
    if (!running) return;

    if (phase === "countdown") return;

    remaining = Math.max(
        0,
        Math.ceil((deadline - Date.now()) / 1000)
    );

    running = false;

    clearInterval(interval);
    interval = null;

    window.speechSynthesis?.cancel();

    updateScreen();
}

// ==========================================
// BOTÃO PAUSAR / CONTINUAR
// ==========================================

function togglePause() {
    if (
        phase === "countdown" ||
        phase === "ready" ||
        phase === "done"
    ) {
        return;
    }

    if (running) {
        pauseTimer();

    } else if (phase === "work" || phase === "rest") {
        startTimer();
    }
}

// ==========================================
// REINICIAR
// ==========================================

function resetTimer() {
    running = false;

    clearInterval(interval);
    interval = null;

    window.speechSynthesis?.cancel();

    readSettings();

    phase = "ready";
    currentRound = 1;
    remaining = workTime;
    countdownNumber = 3;
    lastBeepSecond = null;

    progressBar.style.width = "0%";

    updateScreen();
}

// ==========================================
// FUNCIONAMENTO DO CRONÔMETRO
// ==========================================

function tick() {
    if (!running) return;

    const now = Date.now();

    // CONTAGEM REGRESSIVA: 3, 2, 1
    if (phase === "countdown") {
        const secondsLeft = Math.ceil((deadline - now) / 1000);

        if (secondsLeft > 0 && secondsLeft !== countdownNumber) {
            countdownNumber = secondsLeft;
            remaining = secondsLeft;

            speak(String(secondsLeft));
            playBeep(700, 0.2);

            updateScreen();
        }

        if (now >= deadline) {
            startWork();
        }

        return;
    }

    // EXERCÍCIO OU DESCANSO
    remaining = Math.max(
        0,
        Math.ceil((deadline - now) / 1000)
    );

    // BIPES NOS ÚLTIMOS 5 SEGUNDOS
    // TANTO NO EXERCÍCIO QUANTO NO DESCANSO
    if (
        (phase === "work" || phase === "rest") &&
        remaining <= 5 &&
        remaining > 0 &&
        remaining !== lastBeepSecond
    ) {
        lastBeepSecond = remaining;

        if (phase === "work") {
            playBeep(950, 0.18);
        } else {
            playBeep(700, 0.18);
        }
    }

    updateScreen();

    // TEMPO ESGOTADO
    if (now >= deadline) {
        nextPhase();
    }
}

// ==========================================
// SALVAR TREINOS
// ==========================================

function saveWorkout() {
    readSettings();

    const workout = {
        name: `Treino ${workTime}s / ${restTime}s / ${totalRounds} rounds`,
        workTime,
        restTime,
        totalRounds
    };

    const workouts = JSON.parse(
        localStorage.getItem("amTimerWorkouts") || "[]"
    );

    workouts.push(workout);

    localStorage.setItem(
        "amTimerWorkouts",
        JSON.stringify(workouts)
    );

    loadSavedWorkouts();

    alert("Treino salvo com sucesso!");
}

// ==========================================
// CARREGAR TREINOS
// ==========================================

function loadSavedWorkouts() {
    const workouts = JSON.parse(
        localStorage.getItem("amTimerWorkouts") || "[]"
    );

    savedWorkoutsSelect.innerHTML =
        '<option value="">Selecione um treino</option>';

    workouts.forEach((workout, index) => {
        const option = document.createElement("option");

        option.value = index;
        option.textContent = workout.name;

        savedWorkoutsSelect.appendChild(option);
    });
}

function loadWorkout() {
    const index = savedWorkoutsSelect.value;

    if (index === "") {
        alert("Selecione um treino primeiro.");
        return;
    }

    const workouts = JSON.parse(
        localStorage.getItem("amTimerWorkouts") || "[]"
    );

    const workout = workouts[Number(index)];

    if (!workout) return;

    resetTimer();

    workTimeInput.value = workout.workTime;
    restTimeInput.value = workout.restTime;
    roundsInput.value = workout.totalRounds;

    readSettings();

    remaining = workTime;

    updateScreen();

    alert("Treino carregado com sucesso!");
}

// ==========================================
// EVENTOS DOS BOTÕES
// ==========================================

startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", togglePause);
resetBtn.addEventListener("click", resetTimer);
saveBtn.addEventListener("click", saveWorkout);
loadBtn.addEventListener("click", loadWorkout);

// ==========================================
// INICIALIZAÇÃO
// ==========================================

readSettings();

remaining = workTime;

loadSavedWorkouts();

updateScreen();
