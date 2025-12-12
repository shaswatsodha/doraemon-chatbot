// ================================
// Doraemon Chat - With Voice Output
// ================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("Doraemon Chat Loaded");

    const form = document.getElementById("chatForm");
    const chatBox = document.getElementById("chatBox");
    const input = document.getElementById("userInput");

    // Needed so Chrome loads voices
    window.speechSynthesis.onvoiceschanged = () => {};

    // -----------------------------
    // VOICE TOGGLE LOGIC
    // -----------------------------
    let isVoiceEnabled = true;
    const voiceToggle = document.getElementById('voiceToggle');

    if (voiceToggle) {
        voiceToggle.addEventListener('change', () => {
            isVoiceEnabled = voiceToggle.checked;
            if (!isVoiceEnabled) {
                window.speechSynthesis.cancel(); // Stop speaking immediately
            }
        });
    }

    // -----------------------------
    // SPEECH FUNCTION (Doraemon Output)
    // -----------------------------
    function speakDoraemon(text) {
        if (!isVoiceEnabled) {
            return;
        }

        if (!("speechSynthesis" in window)) {
            console.warn("Speech Synthesis not supported.");
            return;
        }

        const utter = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();

        // Prioritize Indian Accent & Doraemon-like Voices
        const chosen = 
            // 1. Explicitly check for known Indian/Hindi voices
            voices.find(v => v.lang === "en-IN" || v.lang === "hi-IN") ||
            voices.find(v => /Rishi|Lekha|Anushka|Vidya|Indian/i.test(v.name)) ||
            // 2. Fallback to any friendly/childish voice
            voices.find(v => /child|girl|female/i.test(v.name)) ||
            // 3. Absolute fallback
            voices[0];

        if (chosen) utter.voice = chosen;

        // Doraemon-like tone (playful, friendly, slightly higher pitch)
        utter.pitch = 1.25; 
        utter.rate = 0.95;  
        utter.volume = 1;

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
    }

    // --- SPEECH-TO-TEXT LOGIC (User Input) ---
    const micButton = document.getElementById("micButton");

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
    // ------------------------------------------------

    // -----------------------------
    // MESSAGE SENDING LOGIC
    // -----------------------------
    if (form && chatBox && input) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();

            const userMsg = input.value.trim();
            if (!userMsg) return;

            appendMessage(userMsg, "user");

            const loadingP = appendMessage("Doraemon is thinking...", "bot loading");
            input.disabled = true;
            input.value = "";

            chatBox.scrollTop = chatBox.scrollHeight;

            fetch("/chat", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({ message: userMsg })
            })
            .then(res => res.json())
            .then(data => {
                loadingP.remove();
                input.disabled = false;

                const reply = data.reply || "Something went wrong!";
                appendMessage(reply, "bot");

                chatBox.scrollTop = chatBox.scrollHeight;

                speakDoraemon(reply);
            })
            .catch(error => {
                loadingP.remove();
                input.disabled = false;

                console.error("Error:", error);

                const fallback = "Arre Nobi-chan! The Anywhere Door got stuck!";
                appendMessage(fallback, "bot error");

                speakDoraemon(fallback);
            });
        });
    }

    // -----------------------------
    // HELPER: ADD MESSAGE TO CHAT
    // -----------------------------
    function appendMessage(text, className) {
        const p = document.createElement("p");
        p.classList.add(className.split(" ")[0]);

        if (className.includes("loading")) p.classList.add("loading");
        if (className.includes("error")) p.classList.add("error");

        p.textContent = text;
        chatBox.appendChild(p);
        return p;
    }
});