import { useRef, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Trash2,
  Upload,
} from "lucide-react";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function UploadPanel({ onSubmit, loading, error }) {
  const [file, setFile] = useState(null);
  const [jdText, setJdText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState("");

  const inputRef = useRef(null);

  function validateFile(nextFile) {
    if (!nextFile) return null;

    const allowedExtensions = [".pdf", ".docx", ".txt"];
    const name = nextFile.name.toLowerCase();

    const validExtension = allowedExtensions.some((ext) =>
      name.endsWith(ext)
    );

    if (!validExtension) {
      setLocalError("Please upload a PDF, DOCX, or TXT file.");
      return null;
    }

    if (nextFile.size > MAX_FILE_SIZE) {
      setLocalError("Resume must be smaller than 5 MB.");
      return null;
    }

    setLocalError("");
    return nextFile;
  }

  function selectFile(nextFile) {
    const validFile = validateFile(nextFile);

    if (validFile) {
      setFile(validFile);
    }
  }

  function handleInputChange(event) {
    selectFile(event.target.files?.[0]);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);

    selectFile(event.dataTransfer.files?.[0]);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!file || !jdText.trim()) {
      setLocalError("Add your resume and paste the job description.");
      return;
    }

    setLocalError("");
    onSubmit(file, jdText.trim());
  }

  function removeFile() {
    setFile(null);
    setLocalError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <div className="form-section">
        <div className="section-heading">
          <div>
            <span className="section-eyebrow">01</span>
            <h2>Your resume</h2>
          </div>

          <span className="file-hint">PDF · DOCX · TXT</span>
        </div>

        {!file ? (
          <button
            className={`dropzone ${isDragging ? "dragging" : ""}`}
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <span className="upload-icon">
              <Upload size={22} />
            </span>

            <strong>Drop your resume here</strong>

            <span>
              or <u>browse files</u>
            </span>

            <small>Maximum file size: 5 MB</small>

            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleInputChange}
              hidden
            />
          </button>
        ) : (
          <div className="selected-file">
            <div className="selected-file-main">
              <span className="file-icon">
                <FileText size={18} />
              </span>

              <div>
                <strong>{file.name}</strong>
                <span>
                  {(file.size / 1024).toFixed(0)} KB
                </span>
              </div>
            </div>

            <button
              type="button"
              className="icon-button danger"
              onClick={removeFile}
              aria-label="Remove resume"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="form-section">
        <div className="section-heading">
          <div>
            <span className="section-eyebrow">02</span>
            <h2>Job description</h2>
          </div>

          <span className="file-hint">
            {jdText.length.toLocaleString()} characters
          </span>
        </div>

        <textarea
          className="jd-input"
          placeholder="Paste the complete job description here..."
          value={jdText}
          onChange={(event) => setJdText(event.target.value)}
          maxLength={12000}
        />
      </div>

      {(localError || error) && (
        <div className="error-box">
          <span>!</span>
          <p>{localError || error}</p>
        </div>
      )}

      <button
        className="primary-button"
        type="submit"
        disabled={loading || !file || !jdText.trim()}
      >
        {loading ? (
          <>
            <span className="spinner" />
            Analyzing your match...
          </>
        ) : (
          <>
            Analyze my match
            <CheckCircle2 size={18} />
          </>
        )}
      </button>

      <p className="privacy-note">
        Your resume is analyzed for this session and isn't displayed publicly.
      </p>
    </form>
  );
}