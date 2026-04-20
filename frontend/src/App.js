import React, { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import "./App.css";

const MIN_WORDS = 30;

function App() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [loading, setLoading] = useState(false);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [showInfo, setShowInfo] = useState(false);

  // NEW DATASET STATES
  const [datasetEntries, setDatasetEntries] = useState([]);
  const [datasetName, setDatasetName] = useState("");
  const [datasetError, setDatasetError] = useState("");

  // FEEDBACK STATE
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackRole, setFeedbackRole] = useState("Visitor");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);

  const handleFeedbackSubmit = async () => {
    if (feedbackRating === 0) return;

    try {
      await fetch("http://127.0.0.1:5000/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: feedbackName,
          email: feedbackEmail,
          role: feedbackRole,
          rating: feedbackRating,
          comment: feedbackComment
        })
      });

      setFeedbackSubmitted(true);
      setTimeout(() => {
        setFeedbackSubmitted(false);
        setFeedbackRating(0);
        setFeedbackName("");
        setFeedbackEmail("");
        setFeedbackRole("Visitor");
        setFeedbackComment("");
      }, 3000);
    } catch (error) {
      console.error("Feedback error:", error);
    }
  };

  const resultRef = useRef(null);
  const infoRef = useRef(null);

  const wordCount = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

  // ---------------------------
  // EXISTING EFFECTS (UNCHANGED)
  // ---------------------------
  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => {
        setAnimatedProgress(confidence * 100);
      }, 100);

      if (resultRef.current) {
        setTimeout(() => {
          resultRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 200);
      }
      return () => clearTimeout(timer);
    } else {
      setAnimatedProgress(0);
    }
  }, [result, confidence]);

  useEffect(() => {
    if (showInfo && infoRef.current) {
      setTimeout(() => {
        infoRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 300);
    }
  }, [showInfo]);

  // ---------------------------
  // NEW: HANDLE CSV UPLOAD
  // ---------------------------
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setDatasetError("");
    setDatasetEntries([]);
    setDatasetName("");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        if (!results.data[0] || !("content" in results.data[0])) {
          setDatasetError("Uploaded CSV must contain a 'content' column.");
          return;
        }

        const filteredTexts = results.data
          .map(row => row.content)
          .filter(text => text && text.split(/\s+/).length >= MIN_WORDS);

        setDatasetEntries(filteredTexts);
        setDatasetName(file.name);
      },
      error: function () {
        setDatasetError("Failed to parse CSV file.");
      }
    });
  };

  // ---------------------------
  // NEW: LOAD RANDOM SAMPLE
  // ---------------------------
  const loadRandomSample = () => {
    if (datasetEntries.length === 0) return;

    const randomText =
      datasetEntries[Math.floor(Math.random() * datasetEntries.length)];

    setText(randomText);
    setErrorMsg("");
  };

  // ---------------------------
  // EXISTING ANALYZE FUNCTION (UNCHANGED)
  // ---------------------------
  const analyzeNews = async () => {
    if (!text.trim()) return;

    if (wordCount < MIN_WORDS) {
      setErrorMsg(`Please enter at least ${MIN_WORDS} words for accurate analysis.`);
      return;
    }

    setErrorMsg("");
    setLoading(true);
    setResult(null);
    setConfidence(0);
    setAnimatedProgress(0);

    try {
      await new Promise(r => setTimeout(r, 1200));

      const response = await fetch("http://127.0.0.1:5000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text })
      });

      const data = await response.json();
      setResult(data.prediction);
      setConfidence(parseFloat(data.confidence) || 0);

    } catch (error) {
      console.error("Error:", error);
      setResult("Error");
      setConfidence(0);
    }

    setLoading(false);
  };

  const clearFields = () => {
    setText("");
    setResult(null);
    setConfidence(0);
    setAnimatedProgress(0);
    setErrorMsg("");
  };

  // ---------------------------
  // RISK LOGIC
  // ---------------------------
  let resultLabel = "";
  let resultClass = "";

  if (result === "Fake News") {
    resultLabel = "� Fake News Detected";
    resultClass = "fake";
  } else if (result === "Real News") {
    resultLabel = "✅ Real News";
    resultClass = "real";
  } else {
    resultLabel = "⚠️ Uncertain Result";
    resultClass = "uncertain";
  }

  const percentage = (confidence * 100).toFixed(0);

  // ONBOARDING SCREEN
  if (showOnboarding) {
    return (
      <div className="onboarding-screen">
        <div className="onboarding-bg-effect"></div>
        <div className="onboarding-content">
          <div className="nexus-logo-container">
            <div className="nexus-ring-outer"></div>
            <div className="nexus-ring-inner"></div>
            <div className="nexus-core"></div>
          </div>
          
          <h1 className="onboarding-title">NEXUS</h1>
          <p className="onboarding-tagline">THE REALITY FILTER</p>
          
          <p className="onboarding-description">
            Advanced linguistic intelligence for the post-truth era.
            <br />
            Separating signal from noise with verifiable precision.
          </p>

          <button 
            className="initialize-btn" 
            onClick={() => setShowOnboarding(false)}
          >
            INITIALIZE SYSTEM
            <span className="btn-glitch"></span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <h1 className="title">
        NEXUS <span className="title-highlight">REALITY FILTER</span>
      </h1>
      <p className="subtitle">
        Separating signal from noise in the digital information age.
      </p>

      <div className="textarea-container">
        <textarea
          className="news-textarea"
          placeholder="Paste article content here (min 30 words) to evaluate risk..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
        />
        <div className="word-counter">
          {wordCount} / {MIN_WORDS} words
        </div>
      </div>

      {/* NEW UPLOAD SECTION */}
      <div className="dataset-section">
        <label className="upload-label">
          📂 Upload Dataset (CSV)
          <input
            type="file"
            accept=".csv"
            hidden
            onChange={handleFileUpload}
            disabled={loading}
          />
        </label>

        {datasetName && (
          <div className="dataset-info">
            <strong>Dataset Loaded:</strong> {datasetEntries.length} entries <br />
            <span style={{ fontSize: "0.85em", opacity: 0.8 }}>File: {datasetName}</span>
          </div>
        )}

        {datasetError && (
          <div className="dataset-error">
            {datasetError}
          </div>
        )}

        {datasetEntries.length > 0 && (
          <button
            className="random-sample-btn"
            onClick={loadRandomSample}
            disabled={loading}
          >
            🎲 Load Random Sample
          </button>
        )}
      </div>

      {errorMsg && <div className="error-msg">{errorMsg}</div>}

      <div className="button-group">
        <button
          className="analyze-btn"
          onClick={analyzeNews}
          disabled={loading || !text.trim()}
        >
          {loading ? "Analyzing..." : "Analyze Risk Level"}
        </button>

        {text && (
          <button className="clear-btn" onClick={clearFields} disabled={loading}>
            Clear
          </button>
        )}
      </div>

      {loading && (
        <div className="scanning-bar-container">
          <div className="scanning-bar"></div>
          <div className="loading-text">
            Analyzing linguistic patterns...
          </div>
        </div>
      )}

      {result && result !== "Error" && !loading && (
        <div className="result-card" ref={resultRef}>
          <div className={`result-header ${resultClass}`}>
            <h2>{resultLabel}</h2>
          </div>

          <div className="confidence-value">
            AI Confidence: <strong>{percentage}%</strong>
          </div>

          <div className="meter-container">
            <div
              className={`meter-fill ${resultClass}`}
              style={{ width: `${animatedProgress}%` }}
            ></div>
          </div>

          <p className="disclaimer">
            This system estimates misinformation probability based on linguistic similarity patterns in its training dataset. It does not verify factual accuracy.
          </p>
        </div>
      )}

      <div className="info-section-container">
        <button
          className="info-toggle-btn"
          onClick={() => setShowInfo(!showInfo)}
        >
          🔍 How Does This AI Work? {showInfo ? "▲" : "▼"}
        </button>

        <div className={`info-content ${showInfo ? "expanded" : ""}`} ref={infoRef}>
          <div className="info-content-inner">
            <div className="info-card">
              <h3 className="info-title">System Architecture</h3>
              <div className="steps-grid">
                <div className="step-item">
                  <span className="step-icon">📚</span>
                  <span className="step-title">Training Data</span>
                  <p className="step-desc">
                    Trained on a balanced corpus of verified reliable and deceptive news articles.
                  </p>
                </div>
                <div className="step-item">
                  <span className="step-icon">🧠</span>
                  <span className="step-title">Deep Learning</span>
                  <p className="step-desc">
                    Uses Bidirectional LSTMs to analyze context and semantic dependencies.
                  </p>
                </div>
                <div className="step-item">
                  <span className="step-icon">📊</span>
                  <span className="step-title">Risk Scoring</span>
                  <p className="step-desc">
                    Assigns a probability score correlated with known misinformation patterns.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FEEDBACK SECTION */}
      <div className="feedback-section-container">
        <h2 className="feedback-title">💬 Share Your Feedback</h2>
        <p className="feedback-subtitle">
          Help us improve this AI-based misinformation detection system.
        </p>

        {!feedbackSubmitted ? (
          <div className="feedback-card">
            <div className="feedback-grid">
              <input
                className="feedback-input"
                type="text"
                placeholder="Name (Required)"
                value={feedbackName}
                onChange={(e) => setFeedbackName(e.target.value)}
              />
              <input
                className="feedback-input"
                type="email"
                placeholder="Email (Required)"
                value={feedbackEmail}
                onChange={(e) => setFeedbackEmail(e.target.value)}
              />
            </div>

            {/* Custom Dropdown */}
            <div className="custom-dropdown-container">
              <div 
                className={`dropdown-header ${isDropdownOpen ? "open" : ""}`} 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span>{feedbackRole}</span>
                <span className="dropdown-arrow">▼</span>
              </div>
              
              {isDropdownOpen && (
                <ul className="dropdown-list">
                  {["Visitor", "Student", "Working Professional", "Faculty"].map((role) => (
                    <li 
                      key={role} 
                      className="dropdown-item"
                      onClick={() => {
                        setFeedbackRole(role);
                        setIsDropdownOpen(false);
                      }}
                    >
                      {role}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="star-rating-container">
              <span className="rating-label">Rate your experience:</span>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`star ${star <= feedbackRating ? "filled" : ""}`}
                    onClick={() => setFeedbackRating(star)}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>

            <div className="feedback-input-wrapper">
              <textarea
                className="feedback-textarea"
                placeholder="What do you think about this AI system? (Required)"
                maxLength={200}
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
              />
              <div className="char-counter">
                {feedbackComment.length}/200
              </div>
            </div>

            <button
              className="feedback-submit-btn"
              onClick={handleFeedbackSubmit}
              disabled={
                !feedbackName.trim() || 
                !feedbackEmail.trim() || 
                feedbackRating === 0 || 
                !feedbackComment.trim()
              }
            >
              Submit Feedback
            </button>

            <p className="feedback-footer">
              Your feedback is stored securely and helps enhance model evaluation.
            </p>
          </div>
        ) : (
          <div className="feedback-success">
            ✅ Thank you for your feedback!
          </div>
        )}
      </div>

    </div>
  );
}

export default App;
