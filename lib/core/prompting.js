import { confirm, input, select } from "@inquirer/prompts";

function readFixtureQueue() {
  const raw = process.env.REIN_PROMPT_FIXTURES;
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? [...parsed] : null;
  } catch {
    return null;
  }
}

let fixtureQueue = readFixtureQueue();

function shiftFixture() {
  if (!fixtureQueue || fixtureQueue.length === 0) {
    return undefined;
  }

  const next = fixtureQueue.shift();
  process.env.REIN_PROMPT_FIXTURES = JSON.stringify(fixtureQueue);
  return next;
}

export function resetPromptFixtures() {
  fixtureQueue = readFixtureQueue();
}

export function isInteractive() {
  if (process.env.REIN_FORCE_INTERACTIVE === "1") {
    return true;
  }

  if (fixtureQueue && fixtureQueue.length > 0) {
    return true;
  }

  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

export async function promptSelect(message, choices) {
  const fixture = shiftFixture();
  if (fixture !== undefined) {
    return fixture;
  }

  return select({
    message,
    choices: choices.map((choice) => ({
      name: choice.label,
      value: choice.value,
      description: choice.description,
    })),
  });
}

export async function promptInput(message, options = {}) {
  const fixture = shiftFixture();
  if (fixture !== undefined) {
    return String(fixture);
  }

  return input({
    message,
    default: options.defaultValue,
    validate: options.validate,
  });
}

export async function promptConfirm(message, options = {}) {
  const fixture = shiftFixture();
  if (fixture !== undefined) {
    return Boolean(fixture);
  }

  return confirm({
    message,
    default: options.defaultValue,
  });
}
