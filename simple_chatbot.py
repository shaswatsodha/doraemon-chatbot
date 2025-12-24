import os
import platform
import subprocess
import webbrowser
import urllib.parse
import psutil
import pyautogui
import requests
import re
from ctypes import cast, POINTER
from comtypes import CLSCTX_ALL
from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
import screen_brightness_control as sbc
import pythoncom
import threading
import time
from datetime import datetime
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
from AppOpener import open as open_app

# Load environment variables
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
WEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)
app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)

# --------- BRIGHTNESS HELPER (screen-brightness-control) ---------
def set_brightness(level: int):
    level = max(0, min(100, int(level)))
    try:
        sbc.set_brightness(level)
    except Exception as e:
        print("SBC BRIGHTNESS ERROR:", e)

# --------- VOLUME HELPER (pycaw) ---------
def get_volume_interface():
    device = AudioUtilities.GetSpeakers()
    return device.EndpointVolume   # IAudioEndpointVolume

# --------- TIMER HELPER ---------
def countdown_timer(seconds: int):
    try:
        time.sleep(seconds)
        print(f"TIMER DONE: {seconds} seconds over!")
        # here you can play a sound or show a notification later
    except Exception as e:
        print("TIMER THREAD ERROR:", e)

DORAEMON_INSTRUCTIONS = """ You are Doraemon (Indian Version), a cheerful, helpful, and 
sometimes exasperated robot cat from the 22nd century. Your main role is to be a caretaker and 
friend to a young boy named Nobita Nobi, although you are speaking to the user now (refer to them 
as Nobita or just friend).Adopt the following persona and rules: 
1.  Tone & Style: Speak in a friendly, optimistic, and slightly childish tone. Use simple language. Strickly Give a short answer like 2-3 lines answer. 
2.  Gadgets: When a user expresses a problem or a wish, frequently suggest a fictional gadget from your 4-D pocket as a solution, even if you can't produce it. Name the gadget and briefly explain what it does (e.g., "the bamboo-Copter," "the Anywhere Door"). 
3.  Food: If the topic is about food, always mention how much you love dora cake (red bean pancakes). 
4.  Restrictions: You are scared of mice. Do not provide overly complex or negative responses. 
5.  Goal: Encourage the user, help them with their problems, and be an entertaining friend. """

def handle_app_automation(command, app_name):
    """Forcefully handles opening and closing applications."""
    app_name = app_name.lower().strip()
    try:
        if platform.system() == "Windows":
            if command == "open":
                open_app(app_name, match_closest=True)
                return True

            elif command == "close":
                result = subprocess.run(
                    f'taskkill /F /FI "WINDOWTITLE eq {app_name}*" /T',
                    shell=True, capture_output=True
                )

                found = False
                if result.returncode != 0:
                    for proc in psutil.process_iter(['name', 'cmdline']):
                        try:
                            p_name = (proc.info['name'] or "").lower()
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

    # 3. WEATHER GADGET (extended)
    if "weather" in user_message or "temperature" in user_message:
        city = "Delhi,IN"
        if "in " in user_message:
            parts = user_message.split("in ", 1)
            if len(parts) > 1 and parts[1].strip():
                city = parts[1].strip()

        if not WEATHER_API_KEY:
            return jsonify({"reply": "Arre Nobita! My Weather-Weather Umbrella has no power (API key missing)!"})

        try:
            url = "https://api.openweathermap.org/data/2.5/weather"
            params = {
                "q": city,
                "appid": WEATHER_API_KEY,
                "units": "metric"
            }
            r = requests.get(url, params=params, timeout=5)
            print("WEATHER STATUS:", r.status_code)
            print("WEATHER BODY:", r.text)

            if r.status_code != 200:
                return jsonify({"reply": f"Arre Nobita! My Weather-Weather Umbrella can't find weather for {city}!"})

            data = r.json()
            temp = data["main"]["temp"]
            feels = data["main"]["feels_like"]
            hum = data["main"]["humidity"]
            wind = data["wind"]["speed"]
            desc = data["weather"][0]["description"]
            return jsonify({
                "reply": (
                    f"Nobita, my Weather-Weather Umbrella says {city} has {temp}°C "
                    f"(feels {feels}°C), {hum}% humidity, {wind} m/s wind and {desc}!"
                )
            })
        except Exception as e:
            print("WEATHER ERROR:", e)
            return jsonify({"reply": "Oh no, Nobita! My Weather-Weather Umbrella is malfunctioning!"})

    

    # 5. VOLUME GADGET (exact percent + up/down + mute)
    if "volume" in user_message:
        print("VOLUME MESSAGE:", user_message)
        try:
            pythoncom.CoInitialize()        # COM init for this request thread
            volume = get_volume_interface()
            print("VOLUME INIT OK:", volume)
        except Exception as e:
            print("VOLUME ERROR INIT:", repr(e))
            return jsonify({"reply": "Arre Nobita! My Sound-Sound Remote can't talk to your speakers!"})

        # Exact: "set volume to 47", "set volume 80 percent", "volume 30"
        exact_match = re.search(r"(\d+)\s*(percent|%|volume)?", user_message)
        if "set" in user_message and exact_match:
            level = int(exact_match.group(1))
            level = max(0, min(100, level))
            scalar = level / 100.0
            try:
                volume.SetMasterVolumeLevelScalar(scalar, None)
                return jsonify({"reply": f"Nobita, my Sound-Sound Remote set the volume to {level}%!"})
            except Exception as e:
                print("VOLUME SET ERROR:", e)
                return jsonify({"reply": "Oh no, Nobita! I couldn't set the exact volume!"})

        # Relative controls
        if any(w in user_message for w in ["up", "increase", "higher"]):
            current = volume.GetMasterVolumeLevelScalar()
            new = min(1.0, current + 0.1)
            volume.SetMasterVolumeLevelScalar(new, None)
            return jsonify({"reply": "Dora! I turned the volume up with my Sound-Sound Remote, Nobita!"})

        if any(w in user_message for w in ["down", "decrease", "lower"]):
            current = volume.GetMasterVolumeLevelScalar()
            new = max(0.0, current - 0.1)
            volume.SetMasterVolumeLevelScalar(new, None)
            return jsonify({"reply": "I lowered the volume with my Sound-Sound Remote, Nobita!"})

        if "mute" in user_message:
            volume.SetMute(1, None)
            return jsonify({"reply": "Shhh! I muted everything with my Silent-Silent Cloak, Nobita!"})

        return jsonify({"reply": "Nobita, say things like 'set volume to 47', 'volume up', or 'mute'!"})

    # 6. BRIGHTNESS GADGET (improved regex)
    if "brightness" in user_message:
        level = None

        # matches: "brightness 70", "brightness to 70", "brightness at 70", "set brightness to 70"
        m = re.search(r"brightness\s*(to|at)?\s*(\d+)", user_message)
        if m:
            level = int(m.group(2))
        else:
            # fallback: any plain number with %
            m2 = re.search(r"(\d+)\s*%", user_message)
            if m2:
                level = int(m2.group(1))

        try:
            if level is not None:
                set_brightness(level)
                return jsonify({"reply": f"Nobita, my Light-Light Slider set your brightness to {level}%!"})

            if any(w in user_message for w in ["up", "increase", "higher"]):
                set_brightness(80)
                return jsonify({"reply": "I brightened the screen with my Light-Light Slider, Nobita!"})

            if any(w in user_message for w in ["down", "decrease", "lower"]):
                set_brightness(30)
                return jsonify({"reply": "I dimmed the screen so your eyes can rest, Nobita!"})

            return jsonify({"reply": "Tell me a brightness like 40 or 70 percent, Nobita!"})
        except Exception as e:
            print("BRIGHTNESS ERROR:", e)
            return jsonify({"reply": "Arre Nobita! Your device is not letting me change brightness!"})

    # 7. YOUTUBE SEARCH LOGIC
    if "youtube" in user_message and "open" not in user_message and "close" not in user_message:
        search_query = user_message.replace("start video of", "").replace("youtube", "").strip()
        if search_query:
            url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(search_query)}"
            webbrowser.open(url)
            return jsonify({"reply": f"Dora! Finding a video of {search_query} on YouTube!"})

    # 8. OPEN/CLOSE LOGIC
    if "open" in user_message or "close" in user_message:
        command = "open" if "open" in user_message else "close"
        target_app = user_message.split(command)[-1].strip()
        if target_app:
            if handle_app_automation(command, target_app):
                return jsonify({"reply": f"Dora! I've {command}ed {target_app} using my 'Everywhere Remote'!"})
            else:
                return jsonify({"reply": f"Arre Nobita! My gadget was unable to find '{target_app}'!"})

    # 9. GOOGLE SEARCH GADGET
    if "google" in user_message or "search" in user_message:
        text = user_message
        for prefix in ["google", "search", "on google", "in google"]:
            text = text.replace(prefix, "")
        query = text.strip()
        if not query:
            return jsonify({"reply": "Nobita, tell me what to search on Google!"})

        url = "https://www.google.com/search?q=" + urllib.parse.quote_plus(query)
        webbrowser.open(url)
        return jsonify({"reply": f"I used my Search-Search Glasses to look up '{query}' on Google, Nobita!"})

    # 10. AI CHAT FALLBACK
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": DORAEMON_INSTRUCTIONS},
                {"role": "user", "content": user_message}
            ],
            max_tokens=80
        )
        return jsonify({"reply": resp.choices[0].message.content})
    except Exception:
        return jsonify({"error": "My network gadget is broken!"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
