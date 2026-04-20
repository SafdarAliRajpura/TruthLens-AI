from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import pickle
import numpy as np
from tensorflow.keras.preprocessing.sequence import pad_sequences
import re
import os

# Optional: reduce TensorFlow logging noise
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

app = Flask(__name__)
CORS(app)

# -----------------------------
# Load Model & Tokenizer
# -----------------------------
model = tf.keras.models.load_model("final_bilstm_model.keras")

with open("tokenizer.pkl", "rb") as f:
    tokenizer = pickle.load(f)

max_len = 500

# 🔥 Adjusted threshold for better demo stability
THRESHOLD = 0.6


# -----------------------------
# Text Cleaning Function
# -----------------------------
def clean_text(text):
    text = text.lower()
    text = re.sub(r'http\S+|www\S+', '', text)
    text = re.sub(r'<.*?>', '', text)
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


# -----------------------------
# Root Route
# -----------------------------
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Fake News Detection API is running."
    })


# -----------------------------
# Prediction Route
# -----------------------------
@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()

        if not data or "text" not in data:
            return jsonify({"error": "No text provided"}), 400

        text = data["text"]

        # Preprocess
        cleaned = clean_text(text)
        sequence = tokenizer.texts_to_sequences([cleaned])
        padded = pad_sequences(sequence, maxlen=max_len, padding='post', truncating='post')

        # Model prediction
        prediction_prob = float(model.predict(padded, verbose=0)[0][0])

        prob_fake = prediction_prob
        prob_real = 1 - prediction_prob

        # Apply updated threshold
        # 3-Class Decision Logic
        # Updated 3-Class Decision Logic (Calibrated)

        if prob_fake >= 0.80:
            result = "Fake News"
            confidence = prob_fake

        elif prob_fake <= 0.55:
            result = "Real News"
            confidence = prob_real

        else:
            result = "Uncertain"
            confidence = max(prob_fake, prob_real)



        return jsonify({
            "prediction": result,
            "confidence": round(confidence, 4),
            "prob_fake": round(prob_fake, 4),
            "prob_real": round(prob_real, 4),
            "threshold_used": THRESHOLD
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -----------------------------
# Feedback Route
# -----------------------------
import csv
from datetime import datetime

FEEDBACK_FILE = "user_feedback.csv"

# Ensure CSV header exists
if not os.path.exists(FEEDBACK_FILE):
    with open(FEEDBACK_FILE, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(["Timestamp", "Name", "Email", "Role", "Rating", "Comment"])

@app.route("/feedback", methods=["POST"])
def submit_feedback():
    try:
        data = request.get_json()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        name = data.get("name", "").strip() or "Anonymous"
        email = data.get("email", "").strip() or "N/A"
        role = data.get("role", "Visitor")
        rating = data.get("rating", 0)
        comment = data.get("comment", "").strip()

        with open(FEEDBACK_FILE, mode='a', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            writer.writerow([timestamp, name, email, role, rating, comment])

        return jsonify({"message": "Feedback saved!"}), 200

    except Exception as e:
        print(f"Feedback Error: {e}")
        return jsonify({"error": "Failed to save feedback"}), 500


# -----------------------------
# Run App
# -----------------------------
if __name__ == "__main__":
    app.run(debug=True)
