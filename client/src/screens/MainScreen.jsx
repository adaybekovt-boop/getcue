import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconArrowRight, IconAlertTriangle } from "@tabler/icons-react";
import { api } from "../api.js";
import AppHeader from "../components/AppHeader.jsx";
import ModelPicker from "../components/ModelPicker.jsx";
import TaskInput from "../components/TaskInput.jsx";
import OutputPanel from "../components/OutputPanel.jsx";

export default function MainScreen({ me, meError, setCredits }) {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState("");
  const [strategy, setStrategy] = useState("claude-standard");
  const [task, setTask] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [needCredits, setNeedCredits] = useState(null); // { required, credits }

  const cost = (me && me.generationCost && me.generationCost[strategy]) ?? 50;

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setNeedCredits(null);
    setResult(null);
    try {
      const body = { strategy, task };
      if (repoUrl.trim()) body.repoUrl = repoUrl.trim();
      const data = await api("/api/generate", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setResult(data.result);
      setCredits(data.credits);
    } catch (e) {
      if (e.status === 402 && e.data) {
        setNeedCredits({ required: e.data.required, credits: e.data.credits });
        setCredits(e.data.credits);
      } else {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || !task.trim();

  return (
    <div className="app">
      <AppHeader me={me} />

      <section className="form-card rise" style={{ "--i": 1 }}>
        <div className="field">
          <label className="label" htmlFor="repo">
            GitHub URL (optional)
          </label>
          <input
            id="repo"
            className="input"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
          />
        </div>

        <div className="field">
          <label className="label">Model</label>
          <ModelPicker value={strategy} onChange={setStrategy} />
          <div className="cost-preview">
            Cost: <strong>{cost} credits</strong>
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="task">
            Your task
          </label>
          <TaskInput value={task} onChange={setTask} />
        </div>
      </section>

      <button
        className={"generate rise" + (loading ? " loading" : "")}
        style={{ "--i": 2 }}
        onClick={handleGenerate}
        disabled={disabled}
      >
        <span className="btn-content">
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Generating…
            </>
          ) : (
            <>
              Generate prompt
              <IconArrowRight size={18} stroke={2} />
            </>
          )}
        </span>
      </button>

      {needCredits && (
        <div className="alert rise">
          <div className="alert-text">
            Not enough credits — need {needCredits.required}, you have{" "}
            {needCredits.credits}.
          </div>
          <button
            className="btn-glass get-credits"
            onClick={() => navigate("/pro")}
          >
            Get credits
            <IconArrowRight size={16} stroke={2} />
          </button>
        </div>
      )}

      {result && (
        <div className="rise">
          <OutputPanel result={result} />
        </div>
      )}

      {error && (
        <div className="alert rise">
          <div className="alert-text">
            <IconAlertTriangle
              size={15}
              stroke={2}
              style={{ verticalAlign: "-2px", marginRight: 6 }}
            />
            {error}
          </div>
        </div>
      )}
      {meError && !me && <div className="error">{meError}</div>}
    </div>
  );
}
