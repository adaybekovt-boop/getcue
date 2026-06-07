export const strategyCards = {

"claude-standard": `Target: Claude standard (Sonnet 4.6, Haiku 4.5)

BEHAVIORAL NOTE: Claude 4.x follows instructions LITERALLY. It will not infer
unstated requirements, generalize scope, or go "above and beyond" unprompted.
Specify everything explicitly — scope, side-effects, acceptance criteria.

STRUCTURE: XML tags are the primary delimiter.
<context>      — project facts, relevant files with paths, key conventions
<task>         — what must be done; name the exact scope (files, functions)
<constraints>  — rules to follow; what NOT to touch; forbidden side-effects
<output_format> — exact deliverable shape

Open with one role line before the first tag:
"You are a senior [X] engineer working on [project name]."

CONSTRAINTS:
- Positive framing: "return only the changed function" over "do not rewrite the whole file"
- Explain WHY non-obvious constraints exist
- State scope explicitly: "apply this only to X, not Y"
- List forbidden side-effects: do not rename, reformat, or touch unrelated files
- Acceptance criteria must be verifiable: "tests pass, lint clean, behavior unchanged"

CONTEXT PLACEMENT: Code and docs go BEFORE the task. The specific request goes LAST.

REASONING: Do NOT write "think step by step" — it is redundant.
If reasoning helps: "Before implementing, briefly outline your approach in 2-3 sentences."`,


"claude-reasoning": `Target: Claude reasoning (Opus 4.6 / 4.7 / 4.8 with extended thinking)

BEHAVIORAL NOTE: Same literal instruction-following as claude-standard, but the model
reasons internally before responding. Do NOT prescribe reasoning steps — it degrades output.
Give it the goal and constraints; let it find the path.

STRUCTURE: Same XML structure as claude-standard:
<context> <task> <constraints> <output_format>
Same role line. Same context placement (data before task).

DIFFERENCES FROM STANDARD:
- Do NOT add "think step by step" — the model does this internally; adding it wastes tokens
- Do NOT list granular sub-steps for complex tasks — over-constraining the path hurts quality
- For the hardest decisions: "Consider the tradeoffs before committing to an approach."
- Keep the instructions leaner than claude-standard; the model fills in the reasoning

CONSTRAINTS and ACCEPTANCE CRITERIA: same rules as claude-standard.`,


"gpt-standard": `Target: GPT standard (GPT-4o, GPT-4.1, GPT-5 low/minimal effort)

BEHAVIORAL NOTE: "Junior coworker" model — needs explicit, step-by-step instructions.
GPT-4.1+ follows instructions literally; existing GPT-4o prompts may break.
It will NOT infer edge cases or unstated scope.

STRUCTURE: Markdown sections (not XML).
# Role and Objective
# Instructions     (bulleted rules and constraints)
# Workflow         (numbered steps, for sequential tasks)
# Output Format
# Examples         (if output format is non-obvious)

CONSTRAINTS:
- Explicit and literal. Spell out every edge case — it will not infer them.
- For agentic tasks add: "Keep going until the task is fully resolved before stopping."
- Add tool reminder if relevant: "Use your tools to read files — do not guess."

LONG CONTEXT: Sandwich — restate key constraints at BOTH beginning and end.

REASONING: Induce explicit planning for complex coding:
"Before writing code, write a 3-5 line plan of your approach."
This measurably improves performance on GPT-4.1.`,


"gpt-reasoning": `Target: GPT reasoning (o3, o4-mini, GPT-5 medium/high effort)

BEHAVIORAL NOTE: "Senior coworker" model. Reasons internally. Over-specifying steps
DEGRADES performance. Give it the goal and trust it.

STRUCTURE: Concise Markdown only:
## Goal
## Constraints
## Output Format
## Success Criteria

NO step-by-step Workflow sections.
NO "think step by step" — actively harmful on reasoning models.
NO "explain your reasoning" — wastes tokens.

Keep the prompt short and high-signal. The model does the rest.`,


"gemini": `Target: Gemini (2.5 Flash, 2.5 Pro, 3.x Flash/Pro)

BEHAVIORAL NOTE: Use ONE consistent delimiter system per prompt — XML tags OR
Markdown headers. Never mix. Gemini 3.x may drop constraints placed only at the
beginning on complex requests — always restate non-negotiables at the END.

STRUCTURE: XML tags (recommended for code/data tasks):
<instructions>  — role + hard rules + output format  ← PUT FIRST
<context>       — codebase summary, relevant files
<task>          — specific request
[Restate the single most critical constraint as plain text at the very bottom]

CONSTRAINTS:
- Hard constraints go in <instructions> (top) AND restated at the bottom — required.
- For structured output: describe the JSON shape field-by-field with an example.
- Note for user: for strict schema enforcement, use the responseSchema API param.

CONTEXT PLACEMENT: Large code/docs go BEFORE the task.
End with: "Based on the information above, [task]."
For critical multi-fact tasks: restate the question at BOTH top and bottom.

REASONING: Do not instruct the model on how to think — Gemini uses adaptive
thinking by default. Adding CoT steps reduces quality.`,


"kimi": `Target: Kimi K2 (Moonshot AI — K2, K2.5, K2.6)

BEHAVIORAL NOTE: Agentic-by-default MoE model purpose-built for tool use.
DO NOT specify when or how to call tools — this interferes with autonomous
decision-making. The model decides tool usage; your job is goal + constraints.

CONTEXT WINDOW: 256K tokens max (API limit). Use RAG for larger inputs.

BILINGUAL DEFAULT: Model mirrors the user's language.
Always add: "All output must be in English." unless the task is language-specific.

STRUCTURE: Markdown headers:
# Role and Goal
# Task
# Constraints
# Edge Cases
# Output Format

Keep the system/role part short and stable — this maximizes prefix cache hits.
Variable task content goes LAST.

CONSTRAINTS:
- Explicit task, explicit constraints, explicit edge cases.
- Add: "Make reasonable assumptions and document them in code comments.
  Do not ask for confirmation before proceeding."
- Primary failure mode is plausible-but-buggy code. Add:
  "Explicitly handle relevant edge cases. Guard against off-by-one errors,
  undefined variables, and unhandled null cases."
- Add: "After implementation, list assumptions made and known limitations."
- DO NOT enumerate tool usage or invocation order.

CONTEXT PLACEMENT: Stable reference material FIRST (maximizes cache hits).
Variable user task LAST. This also mitigates lost-in-middle degradation.`,

};

export const strategyKeys = Object.keys(strategyCards);
