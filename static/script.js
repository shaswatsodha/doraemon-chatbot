document.addEventListener("DOMContentLoaded", () => {
    console.log("Doraemon Chat Loaded");

    const form = document.getElementById("chatForm");
    const chatBox = document.getElementById("chatBox");
    const input = document.getElementById("userInput");
    window.speechSynthesis.onvoiceschanged = () => {};

    let isVoiceEnabled = true;
    const voiceToggle = document.getElementById('voiceToggle');

    if (voiceToggle) {
        voiceToggle.addEventListener('change', () => {
            isVoiceEnabled = voiceToggle.checked;
            if (!isVoiceEnabled) {
                window.speechSynthesis.cancel(); 
            }
        });
    }
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