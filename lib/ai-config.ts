// Fixed AI config — previously exposed in Settings UI, but users don't need to
// fiddle with this. If you run a different model or host Ollama on a custom
// port, edit these constants. The chat page imports them directly and talks to
// Ollama from the browser so the app works in prod deployments too (the server
// cannot reach a user's local Ollama, but the user's own browser can).
//
// IMPORTANT for deployed use: browser → localhost:11434 hits Ollama's CORS
// check. Start Ollama with `OLLAMA_ORIGINS=* ollama serve` so the deployed
// origin is allowed. On localhost dev, CORS is generally permissive enough.

export const OLLAMA_URL = 'http://localhost:11434'
export const OLLAMA_MODEL = 'llama3.2'
