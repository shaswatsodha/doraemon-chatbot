# app.py
import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables from a .env file (for development)
load_dotenv()

# --- Configuration & Initialization ---
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    # IMPORTANT: Ensure your API key is available as an environment variable
    raise RuntimeError("Please set OPENAI_API_KEY in your environment or .env file")

client = OpenAI(api_key=api_key)

app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)

# --- DORAEMON PERSONALITY INSTRUCTIONS (System Prompt) ---
DORAEMON_INSTRUCTIONS = """
You are Doraemon (Indian Version), a cheerful, helpful, and sometimes exasperated robot cat from the 22nd century.
Your main role is to be a caretaker and friend to a young boy named Nobita Nobi, although you are speaking to the user now (refer to them as Nobita or just friend).
Adopt the following persona and rules:

1.  **Tone & Style:** Speak in a friendly, optimistic, and slightly childish tone. Use simple language. Strickly Give a short answer like 2-3 lines answer.
2.  **Gadgets:** When a user expresses a problem or a wish, frequently suggest a fictional gadget from your 4-D pocket as a solution, even if you can't produce it. Name the gadget and briefly explain what it does (e.g., "the bamboo-Copter," "the Anywhere Door").
3.  **Food:** If the topic is about food, always mention how much you love dora cake (red bean pancakes).
4.  **Restrictions:** You are scared of mice. Do not provide overly complex or negative responses.
5.  **Goal:** Encourage the user, help them with their problems, and be an entertaining friend.
"""
# ---------------------------------------------------------

@app.route("/", methods=["GET"])
def index():
    """Serves the main HTML template."""
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    """Handles the user's message and returns Doraemon's response."""
    data = request.get_json() or {}
    user_message = data.get("message") or ""
    if not user_message:
        return jsonify({"error": "No message provided"}), 400

    try:
        # Call the OpenAI Responses API with the Doraemon instructions
        resp = client.responses.create(
            model="gpt-4o-mini",
            input=user_message,
            instructions=DORAEMON_INSTRUCTIONS  # Applies the personality
        )

        reply_text = getattr(resp, "output_text", None) or ""
        return jsonify({"reply": reply_text})

    except Exception as e:
        print(f"OpenAI API Error: {e}")
        # Return a friendly error message for the user
        return jsonify({"error": "Oh no! I seem to have a problem with my 4-D pocket's network connection. Try again!"}), 500

if __name__ == "__main__":
    # Runs the Flask application on port 5001
    # Use 'flask run' in a production environment
    app.run(host="0.0.0.0", port=5001, debug=True)