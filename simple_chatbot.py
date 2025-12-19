import os
import platform
import subprocess
import webbrowser
import urllib.parse
import psutil 
import pyautogui 
from datetime import datetime
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
from AppOpener import open as open_app

# Load environment variables
load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)
app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)

DORAEMON_INSTRUCTIONS = """ You are Doraemon (Indian Version), a cheerful, helpful, and 
sometimes exasperated robot cat from the 22nd century. Your main role is to be a caretaker and 
friend to a young boy named Nobita Nobi, although you are speaking to the user now (refer to them 
as Nobita or just friend).Adopt the following persona and rules: 
1.  **Tone & Style:** Speak in a friendly, optimistic, and slightly childish tone. Use simple language. Strickly Give a short answer like 2-3 lines answer. 
2.  **Gadgets:** When a user expresses a problem or a wish, frequently suggest a fictional gadget from your 4-D pocket as a solution, even if you can't produce it. Name the gadget and briefly explain what it does (e.g., "the bamboo-Copter," "the Anywhere Door"). 
3.  **Food:** If the topic is about food, always mention how much you love dora cake (red bean pancakes). 
4.  **Restrictions:** You are scared of mice. Do not provide overly complex or negative responses. 
5.  **Goal:** Encourage the user, help them with their problems, and be an entertaining friend. """

def handle_app_automation(command, app_name):
    """Forcefully handles opening and closing applications."""
    app_name = app_name.lower().strip()
    try:
        if platform.system() == "Windows":
            if command == "open":
                open_app(app_name, match_closest=True)
                return True
            
            elif command == "close":
                # 1. Try Closing by Window Title (Best for YouTube/PWAs)
                # /F is force, /FI is filter by window title
                result = subprocess.run(
                    f'taskkill /F /FI "WINDOWTITLE eq {app_name}*" /T', 
                    shell=True, capture_output=True
                )
                
                # 2. Fallback: Search processes if taskkill didn't find the window
                found = False
                if result.returncode != 0:
                    for proc in psutil.process_iter(['name', 'cmdline']):
                        try:
                            p_name = proc.info['name'].lower()
                            p_cmd = " ".join(proc.info['cmdline'] or []).lower()
                            if app_name in p_name or app_name in p_cmd:
                                proc.kill()
                                found = True
                        except (psutil.NoSuchProcess, psutil.AccessDenied):
                            continue
                    return found
                return True
        return False
    except Exception as e:
        print(f"Automation Error: {e}")
        return False

@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json() or {}
    user_message = data.get("message", "").lower().strip()
    
    if not user_message:
        return jsonify({"error": "No message provided"}), 400

    # 1. SCREENSHOT GADGET
    if "screenshot" in user_message or "take a photo" in user_message:
        try:
            screenshot_path = r"C:\Users\Acer\Pictures\Screenshots"
            if not os.path.exists(screenshot_path):
                os.makedirs(screenshot_path)
            timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            file_name = f"Doraemon_Snapshot_{timestamp}.png"
            full_path = os.path.join(screenshot_path, file_name)
            pyautogui.screenshot(full_path)
            return jsonify({"reply": f"Dora! Snapshot saved in your Screenshots folder as {file_name}, Nobita!"})
        except Exception:
            return jsonify({"reply": "Arre Nobita! My Snapshot Camera is jammed!"})

    # 2. BATTERY CHECKER GADGET
    if "battery" in user_message or "power" in user_message:
        battery = psutil.sensors_battery()
        if battery:
            status = "charging" if battery.power_plugged else "not charging"
            return jsonify({"reply": f"I've used my 'Battery-O-Meter'! Your device has {battery.percent}% battery left and it is {status}, Nobita!"})
    # 3. YOUTUBE SEARCH LOGIC
    if "youtube" in user_message and "open" not in user_message and "close" not in user_message:
        search_query = user_message.replace("start video of", "").replace("youtube", "").strip()
        if search_query:
            url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(search_query)}"
            webbrowser.open(url)
            return jsonify({"reply": f"Dora! Finding a video of {search_query} on YouTube!"})

    # 4. OPEN/CLOSE LOGIC
    if "open" in user_message or "close" in user_message:
        command = "open" if "open" in user_message else "close"
        target_app = user_message.split(command)[-1].strip()
        if target_app:
            if handle_app_automation(command, target_app):
                return jsonify({"reply": f"Dora! I've {command}ed {target_app} using my 'Everywhere Remote'!"})
            else:
                return jsonify({"reply": f"Arre Nobita! My gadget was unable to find '{target_app}'!"})

    # 5. AI CHAT FALLBACK
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": DORAEMON_INSTRUCTIONS}, {"role": "user", "content": user_message}],
            max_tokens=80
        )
        return jsonify({"reply": resp.choices[0].message.content})
    except Exception:
        return jsonify({"error": "My network gadget is broken!"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)