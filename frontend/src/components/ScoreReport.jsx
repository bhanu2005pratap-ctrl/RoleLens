import {
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Sparkles,
} from "lucide-react";

function ScoreGauge({ score }) {
  return (
    <div
      className="score-gauge"
      style={{
        "--score-angle": `${Math.max(0, Math.min(100, score)) * 3.6}deg`,
      }}
    >
      <div className="score-gauge-inner">
        <strong>{score}</strong>
        <span>/ 100</span>
      </div>
    </div>
  );
}

function ScoreBar({ name, score, justification }) {
  return (
    <div className="score-bar-row">
      <div className="score-bar-heading">
        <span>{name}</span>
        <strong>{score}</strong>
      </div>

      <div className="score-track">
        <div
          className="score-fill"
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>

      <p>{justification}</p>
    </div>
  );
}

export default function ScoreReport({ report }) {
  const {
    overall_score,
    verdict,
    category_scores = [],
    matched_keywords = [],
    missing_keywords = [],
    strengths = [],
    recommendations = [],
    summary,
    semantic_similarity,
  } = report;

  return (
    <section className="report">
      <div className="report-hero">
        <div className="report-score">
          <ScoreGauge score={overall_score} />
        </div>

        <div className="report-overview">
          <span className="report-label">Overall match</span>

          <h2>{verdict}</h2>

          <p>{summary}</p>

          {typeof semantic_similarity === "number" && (
            <div className="similarity-pill">
              Semantic similarity{" "}
              <strong>
                {(semantic_similarity * 100).toFixed(0)}%
              </strong>
            </div>
          )}
        </div>
      </div>

      <div className="report-section">
        <div className="section-title">
          <div>
            <span className="section-eyebrow">01</span>
            <h3>Match breakdown</h3>
          </div>

          <span>Weighted ATS analysis</span>
        </div>

        <div className="score-bars">
          {category_scores.map((category) => (
            <ScoreBar
              key={category.name}
              name={category.name}
              score={category.score}
              justification={category.justification}
            />
          ))}
        </div>
      </div>

      <div className="keyword-grid">
        <div className="keyword-card">
          <div className="keyword-card-heading success">
            <CheckCircle2 size={18} />
            <div>
              <span>Skills already covered</span>
              <small>{matched_keywords.length} matched</small>
            </div>
          </div>

          <div className="chips">
            {matched_keywords.length ? (
              matched_keywords.map((keyword) => (
                <span className="chip success" key={keyword}>
                  {keyword}
                </span>
              ))
            ) : (
              <span className="muted-copy">No matched keywords found.</span>
            )}
          </div>
        </div>

        <div className="keyword-card">
          <div className="keyword-card-heading warning">
            <AlertCircle size={18} />
            <div>
              <span>Skills missing from resume</span>
              <small>{missing_keywords.length} gaps</small>
            </div>
          </div>

          <div className="chips">
            {missing_keywords.length ? (
              missing_keywords.map((keyword) => (
                <span className="chip warning" key={keyword}>
                  {keyword}
                </span>
              ))
            ) : (
              <span className="muted-copy">
                No significant skill gaps detected.
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="insight-grid">
        <div className="insight-card">
          <div className="insight-heading">
            <Sparkles size={18} />
            <h3>What's working</h3>
          </div>

          <div className="insight-list">
            {strengths.map((strength) => (
              <div className="insight-item" key={strength}>
                <CheckCircle2 size={16} />
                <span>{strength}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="insight-card">
          <div className="insight-heading">
            <Lightbulb size={18} />
            <h3>What to improve</h3>
          </div>

          <div className="recommendation-list">
            {recommendations.map((recommendation, index) => (
              <div className="recommendation-item" key={recommendation}>
                <span>
                  {String(index + 1).padStart(2, "0")}
                </span>

                <p>{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}