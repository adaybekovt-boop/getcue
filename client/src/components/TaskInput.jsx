const MAX = 2000;

export default function TaskInput({ value, onChange }) {
  return (
    <div className="task-input">
      <textarea
        id="task"
        className="textarea"
        rows={5}
        value={value}
        placeholder="Describe what you need…"
        onChange={(e) => onChange(e.target.value.slice(0, MAX))}
      />
      <div className="counter" aria-live="polite">
        {value.length} / {MAX}
      </div>
    </div>
  );
}
