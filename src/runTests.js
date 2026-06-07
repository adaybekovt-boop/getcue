// CLI entry point for the Cue generation core.
//
//   node src/runTests.js                              # fixture, 3 cards
//   node src/runTests.js claude-standard              # fixture, one card
//   node src/runTests.js claude-standard --repo URL   # live GitHub repo, one card
//   node src/runTests.js --repo URL                   # live GitHub repo, 3 cards
//
// Each generated prompt is written to out/<strategy>/<task-id>.md and a short
// summary line is printed to the console.
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildPrompt, callGemini, MODEL_ID, TEMPERATURE } from "./generate.js";
import { strategyKeys } from "./config/strategyCards.js";
import { tasks } from "./fixtures/tasks.js";
import { repoSummary } from "./fixtures/repoSummary.js";
import { fetchRepoSummary } from "./github/fetchRepoSummary.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "out");

// Default comparison set when no strategy is passed.
const DEFAULT_STRATEGIES = ["claude-standard", "gpt-reasoning", "gemini"];

/**
 * Pull --repo <url> out of argv. Returns { repoUrl, positionals } where
 * positionals are the remaining args (the strategy lives at positionals[0]).
 */
function parseArgs(argv) {
  let repoUrl = null;
  const positionals = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--repo") {
      repoUrl = argv[i + 1] || null;
      i++; // skip the URL value
    } else {
      positionals.push(argv[i]);
    }
  }
  return { repoUrl, positionals };
}

async function runOne(strategy, task, summary) {
  const prompt = buildPrompt(strategy, task, summary);
  const generated = await callGemini(prompt, strategy);

  const dir = join(OUT_DIR, strategy);
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, `${task.id}.md`);

  const header =
    `<!-- strategy: ${strategy} | task: ${task.id} (${task.title}) | ` +
    `model: ${MODEL_ID} @ temp ${TEMPERATURE} -->\n\n` +
    `# Optimized prompt — ${strategy} / ${task.id}\n\n` +
    `> **Original task:** ${task.task}\n\n---\n\n`;

  await writeFile(filePath, header + generated + "\n", "utf8");
  return filePath;
}

async function main() {
  const { repoUrl, positionals } = parseArgs(process.argv.slice(2));
  const arg = positionals[0];

  if (arg && !strategyKeys.includes(arg)) {
    console.error(`Unknown strategy "${arg}".`);
    console.error(`Available: ${strategyKeys.join(", ")}`);
    process.exit(1);
  }

  const strategies = arg ? [arg] : DEFAULT_STRATEGIES;

  // Resolve the repo context: live GitHub fetch (--repo) or the fixture.
  let summary;
  let repoLabel;
  if (repoUrl) {
    if (!process.env.GITHUB_TOKEN) {
      console.warn(
        "Warning: GITHUB_TOKEN not set — unauthenticated GitHub access is " +
          "limited to 60 requests/hr. Add GITHUB_TOKEN to .env to raise it to 5000/hr."
      );
    }
    console.log("Fetching repo summary...");
    try {
      summary = await fetchRepoSummary(repoUrl);
    } catch (err) {
      console.error(`Failed to fetch repo summary: ${err.message}`);
      process.exit(1);
    }
    repoLabel = `${repoUrl} (live)`;
    console.log("");
    console.log("----- repo summary -----");
    console.log(summary);
    console.log("------------------------");
    console.log("");
  } else {
    summary = repoSummary;
    repoLabel = "Whisp fixture (hardcoded)";
  }

  console.log(`Cue generation core`);
  console.log(`Model: ${MODEL_ID} (temp ${TEMPERATURE})`);
  console.log(`Repo: ${repoLabel}`);
  console.log(`Strategies: ${strategies.join(", ")}`);
  console.log(`Tasks: ${tasks.length}`);
  console.log("");

  let ok = 0;
  let failed = 0;

  for (const strategy of strategies) {
    for (const task of tasks) {
      try {
        const filePath = await runOne(strategy, task, summary);
        ok++;
        console.log(`  ✓ ${task.id}  ${strategy.padEnd(16)} -> ${filePath}`);
      } catch (err) {
        failed++;
        console.error(`  ✗ ${task.id}  ${strategy.padEnd(16)} -> ${err.message}`);
      }
      // Rate-limit spacing to stay under Gemini free-tier per-minute quota.
      await new Promise((r) => setTimeout(r, 4000));
    }
  }

  console.log("");
  console.log(`Done. ${ok} generated, ${failed} failed.`);
  console.log(`Output: ${OUT_DIR}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
