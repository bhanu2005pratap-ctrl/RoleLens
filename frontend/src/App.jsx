import { useState } from "react";
import {
  ArrowRight,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";

import UploadPanel from "./components/UploadPanel.jsx";
import ScoreReport from "./components/ScoreReport.jsx";
import ChatPanel from "./components/ChatPanel.jsx";
import { scoreResume } from "./api";

export default function App() {
  const [report, setReport] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(file, jd) {
    setLoading(true);
    setError("");

    try {
      const data = await scoreResume(file, jd);

      setReport(data.report);
      setResumeText(data.resume_text);
      setJdText(data.jd_text);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function resetApp() {
    setReport(null);
    setResumeText("");
    setJdText("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={resetApp} type="button">
          <span className="brand-mark">
            <Target size={17} strokeWidth={2.5} />
          </span>

          <span>
            <strong>RoleLens</strong>
            <small>AI Resume & Job Match</small>
          </span>
        </button>

        {report && (
          <button className="topbar-button" onClick={resetApp} type="button">
            <RotateCcw size={15} />
            Analyze another
          </button>
        )}
      </header>

      {!report ? (
        <main className="landing">
          <section className="hero">
            <div className="hero-kicker">
              <Sparkles size={15} />
              Resume intelligence for your next role
            </div>

            <h1>
              Know how closely your resume
              <span> matches the job.</span>
            </h1>

            <p>
              Upload your resume, paste the job description, and get a
              structured match analysis with actionable improvements.
            </p>
          </section>

          <section className="landing-card">
            <UploadPanel
              onSubmit={handleSubmit}
              loading={loading}
              error={error}
            />
          </section>
        </main>
      ) : (
        <main className="results-page">
          <div className="results-intro">
            <div>
              <div className="hero-kicker">
                <Target size={15} />
                Resume analysis complete
              </div>

              <h1>Your role match report</h1>

              <p>
                Review your match, skill gaps, and the changes that can make
                your resume stronger for this role.
              </p>
            </div>

            <button className="secondary-button" onClick={resetApp}>
              Analyze another
              <ArrowRight size={15} />
            </button>
          </div>

          <ScoreReport report={report} />

          <ChatPanel
            resumeText={resumeText}
            jdText={jdText}
            reportSummary={report.summary}
            enabled
          />
        </main>
      )}

      <footer className="footer">
        <span>RoleLens</span>
        <span>AI-assisted resume analysis</span>
      </footer>
    </div>
  );
}