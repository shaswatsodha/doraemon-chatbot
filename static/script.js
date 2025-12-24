document.addEventListener("DOMContentLoaded", () => {
    console.log("Doraemon Chat Loaded");

    const form = document.getElementById("chatForm");
    const chatBox = document.getElementById("chatBox");
    const input = document.getElementById("userInput");
    const micButton = document.getElementById("micButton");
    const voiceToggle = document.getElementById('voiceToggle');
    const quickButtons = document.querySelectorAll('.quick-actions button');

    const actionModal = document.getElementById("actionModal");
    const actionTitle = document.getElementById("actionTitle");
    const actionHint  = document.getElementById("actionHint");
    const actionInput = document.getElementById("actionInput");
    const actionCancel = document.getElementById("actionCancel");
    const actionOk = document.getElementById("actionOk");

    const alarmBar = document.getElementById("alarmBar");
    const alarmStopBtn = document.getElementById("alarmStopBtn");
    const alarmSound = document.getElementById("alarmSound");

    const doraGif = document.getElementById("doraGif");

    window.speechSynthesis.onvoiceschanged = () => {};

    let isVoiceEnabled = true;
    let pendingAction = null;
    let timerTimeoutId = null;

    // ----- Doraemon GIF states -----
    const DORA_STATES = {
        idle: "/static/sitting.gif",
        thinking: "/static/think.gif",
        hello: "/static/hi.gif",
        bye: "/static/bye.gif",
        none: null
    };

    function setDoraState(state, extraClass = null) {
    if (!doraGif) return;
    const src = DORA_STATES[state];

    if (src) {
        doraGif.src = src;
        doraGif.style.visibility = "visible";
    } else {
        // hide image when state is "none"
        doraGif.style.visibility = "hidden";
    }

    doraGif.classList.remove("hello-animate", "bye-animate");
    if (extraClass) {
        doraGif.classList.add(extraClass);
    }
}

    // ----- Voice toggle -----
    if (voiceToggle) {
        voiceToggle.addEventListener('change', () => {
            isVoiceEnabled = voiceToggle.checked;
            if (!isVoiceEnabled) {
                window.speechSynthesis.cancel();
            }
        });
    }

    function speakDoraemon(text) {
        if (!isVoiceEnabled) return;
        if (!("speechSynthesis" in window)) {
            console.warn("Speech Synthesis not supported.");
            return;
        }

        const utter = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const chosen =
            voices.find(v => v.lang === "en-IN" || v.lang === "hi-IN") ||
            voices.find(v => /Rishi|Lekha|Anushka|Vidya|Indian/i.test(v.name)) ||
            voices.find(v => /child|girl|female/i.test(v.name)) ||
            voices[0];

        if (chosen) utter.voice = chosen;

        utter.pitch = 1.4;
        utter.rate = 0.95;
        utter.volume = 1;

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
    }

    // ----- Mic / Speech recognition -----
    if (micButton && "webkitSpeechRecognition" in window) {
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN';

        micButton.addEventListener("click", () => {
            micButton.textContent = '🔴';
            micButton.style.backgroundColor = '#cc0000';
            micButton.disabled = true;
            input.placeholder = "Listening...";

            recognition.start();
        });

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            input.value = transcript;
            form.dispatchEvent(new Event('submit'));
        };

        recognition.onend = () => {
            micButton.textContent = '🎤';
            micButton.style.backgroundColor = '#ff0000';
            micButton.disabled = false;
            input.placeholder = "Type or click the mic to speak...";
        };

        recognition.onerror = (event) => {
            console.error("Speech Recognition Error:", event.error);
            if (event.error !== 'not-allowed') {
                input.placeholder = "Error: Try again.";
            }
            recognition.onend();
        };
    } else if (micButton) {
        micButton.style.display = 'none';
    }

    // ----- Initial Doraemon message -----
    if (chatBox) {
        chatBox.innerHTML = "";
        appendMessage(
            "Hello! I am Doraemon. How can I help you today, Nobita? Dora!",
            "bot"
        );

        // hello GIF then idle
        setDoraState("hello", "hello-animate");
        setTimeout(() => {
            if (doraGif) doraGif.classList.remove("hello-animate");
            setDoraState("idle");
        }, 2000);
    }

    // ----- Alarm helpers -----
    function startAlarm() {
        if (!alarmBar || !alarmSound) return;
        alarmBar.classList.remove("hidden");
        try {
            alarmSound.currentTime = 0;
            alarmSound.play();
        } catch (e) {
            console.warn("Alarm play blocked:", e);
        }
    }

    function stopAlarm() {
        if (!alarmBar || !alarmSound) return;
        alarmBar.classList.add("hidden");
        alarmSound.pause();
        alarmSound.currentTime = 0;
    }

    if (alarmStopBtn) {
        alarmStopBtn.addEventListener("click", stopAlarm);
    }

    function scheduleTimer(seconds) {
        if (timerTimeoutId) {
            clearTimeout(timerTimeoutId);
        }
        if (!seconds || seconds <= 0) return;

        const msg = `Okay Nobita! My Time-Time Clock will ring in ${seconds} seconds!`;
        appendMessage(msg, "bot");
        speakDoraemon(msg);
        setDoraState("idle");

        timerTimeoutId = setTimeout(() => {
            startAlarm();
        }, seconds * 1000);
    }

    // ----- Modal helpers -----
    function openActionModal(action, title, hint, defaultValue, min, max) {
        pendingAction = action;
        actionTitle.textContent = title;
        actionHint.textContent = hint;
        actionInput.type = (action === "weather") ? "text" : "number";
        actionInput.value = defaultValue ?? "";
        actionInput.min = min ?? "";
        actionInput.max = max ?? "";
        actionModal.classList.remove("hidden");
        actionInput.focus();
    }

    function closeActionModal() {
        actionModal.classList.add("hidden");
        pendingAction = null;
        actionInput.value = "";
    }

    if (actionCancel) {
        actionCancel.addEventListener("click", closeActionModal);
    }

    if (actionOk) {
        actionOk.addEventListener("click", () => {
            const val = actionInput.value.trim();
            if (!pendingAction || !val) {
                closeActionModal();
                return;
            }

            let msg = "";

            if (pendingAction === "weather") {
                msg = `weather in ${val}`;
            } else if (pendingAction === "timer") {
                const sec = Number(val);
                if (!Number.isNaN(sec) && sec > 0) {
                    scheduleTimer(sec);
                }
                closeActionModal();
                return;
            } else if (pendingAction === "timer-only") {
                const sec = Number(val);
                if (!Number.isNaN(sec) && sec > 0) {
                    scheduleTimer(sec);
                }
                closeActionModal();
                return;
            } else if (pendingAction === "volume") {
                msg = `set volume to ${val}`;
            } else if (pendingAction === "brightness") {
                msg = `set brightness to ${val}`;
            }

            closeActionModal();

            if (msg) {
                input.value = msg;
                form.dispatchEvent(new Event("submit"));
            }
        });
    }

    // ----- Form submit -> timer and bye handled here, others go to backend -----
    if (form && chatBox && input) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();

            const userMsg = input.value.trim();
            if (!userMsg) return;

            const lower = userMsg.toLowerCase();

            // 1) Nobita just says "timer"
            if (lower === "timer" || lower === "set timer" || lower === "start timer") {
                openActionModal(
                    "timer-only",
                    "Time-Time Clock",
                    "Timer for how many seconds, Nobita?",
                    "10",
                    1,
                    3600
                );
                input.value = "";
                return;
            }

            // 2) "set timer to 10"
            const timerToMatch = lower.match(/set\s+timer\s+to\s+(\d+)\b/);
            if (timerToMatch) {
                const sec = Number(timerToMatch[1]);
                if (!Number.isNaN(sec) && sec > 0) {
                    scheduleTimer(sec);
                    input.value = "";
                    return;
                }
            }

            // 3) "set timer of 10 seconds"
            const timerMatch = lower.match(/timer.*?(\d+)\s*(second|seconds|sec|s)/);
            if (timerMatch) {
                const sec = Number(timerMatch[1]);
                if (!Number.isNaN(sec) && sec > 0) {
                    scheduleTimer(sec);
                    input.value = "";
                    return;
                }
            }

            // 4) BYE handling
            if (/\b(bye|goodbye|see you|see ya)\b/.test(lower)) {
    appendMessage(userMsg, "user");

    const byeLine = "Bye Nobita! I'm going back to the future through my Anywhere Door!";
    appendMessage(byeLine, "bot");
    speakDoraemon(byeLine);

    setDoraState("bye", "bye-animate");

    
    setTimeout(() => {
        if (doraGif) doraGif.classList.remove("bye-animate");
        setDoraState("none");
    }, 2000);  

    input.value = "";
    return;
}


            // All other messages go to backend
            appendMessage(userMsg, "user");

            const loadingRow = appendMessage("Doraemon is thinking...", "bot loading");
            input.disabled = true;
            input.value = "";

            chatBox.scrollTop = chatBox.scrollHeight;

            // thinking GIF
            setDoraState("thinking");

            fetch("/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMsg })
            })
                .then(res => res.json())
                .then(data => {
                    loadingRow.remove();
                    input.disabled = false;

                    const reply = data.reply || "Something went wrong!";
                    appendMessage(reply, "bot");

                    chatBox.scrollTop = chatBox.scrollHeight;

                    speakDoraemon(reply);
                    setDoraState("idle");
                })
                .catch(error => {
                    loadingRow.remove();
                    input.disabled = false;

                    console.error("Error:", error);

                    const fallback = "Arre Nobita! The Anywhere Door got stuck!";
                    appendMessage(fallback, "bot error");

                    speakDoraemon(fallback);
                    setDoraState("idle");
                });
        });
    }

    // ----- Quick action chips -----
    if (quickButtons && form && input) {
        quickButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                const action = btn.dataset.action;

                if (action === "weather") {
                    openActionModal(
                        "weather",
                        "Weather-Weather Umbrella",
                        "Which city, Nobita?",
                        "",
                        null,
                        null
                    );
                } else if (action === "timer") {
                    openActionModal(
                        "timer",
                        "Time-Time Clock",
                        "Timer for how many seconds, Nobita?",
                        "10",
                        1,
                        3600
                    );
                } else if (action === "volume") {
                    openActionModal(
                        "volume",
                        "Sound-Sound Remote",
                        "Volume level (0–100)% ?",
                        "40",
                        0,
                        100
                    );
                } else if (action === "brightness") {
                    openActionModal(
                        "brightness",
                        "Light-Light Slider",
                        "Brightness level (0–100)% ?",
                        "70",
                        0,
                        100
                    );
                }
            });
        });
    }

    // ----- Helper: create avatar + bubble message row -----
    function appendMessage(text, className) {
        const type = className.split(" ")[0]; // "user" or "bot"

        const row = document.createElement("div");
        row.classList.add("message-row");
        row.classList.add(type === "user" ? "user-row" : "bot-row");

        const avatar = document.createElement("div");
        avatar.classList.add("avatar");
        avatar.textContent = (type === "user") ? "N" : "D";

        const bubble = document.createElement("p");
        bubble.classList.add(type);
        if (className.includes("loading")) bubble.classList.add("loading");
        if (className.includes("error")) bubble.classList.add("error");

        bubble.textContent = text;

        row.appendChild(avatar);
        row.appendChild(bubble);
        chatBox.appendChild(row);

        return row;
    }
});
