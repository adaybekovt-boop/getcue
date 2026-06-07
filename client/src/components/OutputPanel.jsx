import { useState } from "react";
import { IconCopy, IconCheck } from "@tabler/icons-react";

export default function OutputPanel({ result }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may be unavailable; ignore.
    }
  }

  return (
    <div className="output">
      <div className="output-head">
        <span className="output-title">Generated prompt</span>
        <button
          className={"btn-glass copy" + (copied ? " copied" : "")}
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy generated prompt"}
        >
          {copied ? (
            <>
              <IconCheck size={15} stroke={2} />
              Copied
            </>
          ) : (
            <>
              <IconCopy size={15} stroke={2} />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="pre">{result}</pre>
    </div>
  );
}
