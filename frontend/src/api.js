// Frontend and backend are deployed as separate Vercel projects.
// VITE_API_BASE_URL should point to the backend API base URL.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export async function scoreResume(resumeFile, jdText) {
  const form = new FormData();
  form.append("resume_file", resumeFile);
  form.append("jd_text", jdText);

  const res = await fetch(`${API_BASE}/score`, {
    method: "POST",
    body: form,
  });

  const text = await res.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Response wasn't JSON
  }

  if (!res.ok) {
    throw new Error(
      data?.detail ||
      text ||
      `Scoring failed with HTTP ${res.status}`
    );
  }

  if (!data) {
    throw new Error("Backend returned an empty response.");
  }

  return data;
}

export async function askQuestion({
  resumeText,
  jdText,
  reportSummary,
  history,
  question,
}) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resume_text: resumeText,
      jd_text: jdText,
      report_summary: reportSummary,
      history,
      question,
    }),
  });

  const text = await res.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Response wasn't JSON
  }

  if (!res.ok) {
    throw new Error(
      data?.detail ||
      text ||
      `Chat failed with HTTP ${res.status}`
    );
  }

  if (!data) {
    throw new Error("Backend returned an empty response.");
  }

  return data;
}
