# ⚠️ System Edge Cases & Recovery

A truly perfect system documents its failures as well as its successes. This guide covers known edge cases and how to resolve them.

## 1. AI Hallucinations & Intent Drift
While Jack is highly tuned, LLMs can occasionally "drift" or hallucinate.
- **Symptom**: Jack attempts to call a tool that doesn't exist or uses incorrect arguments.
- **Resolution**: Use the `/adjust-self-personality` tool to increase `strictness`. If the error persists, the Strategic Manager should manually override with the correct command.
- **Prevention**: Ensure the `JACK_BLUEPRINT.md` is updated with exact tool schemas.

## 2. Race Conditions (Parallel Interaction)
Jack processes interactions asynchronously.
- **Symptom**: Two users trigger the same command simultaneously (e.g., `/foster register`), causing duplicate entries.
- **Resolution**: Jack uses `channelLocks` in `aiController.js` to prevent parallel processing in the same channel. However, cross-channel race conditions can occur if the database write is slow.
- **Recovery**: Manually edit the document using the `search-database` and `apply-code-change` tools.

## 3. Rate Limiting (API 429)
Jack relies on external APIs (Discord, Google Gemini).
- **Symptom**: "Strategic Link Unstable" or "429: Too Many Requests".
- **Resolution**: Jack automatically rotates between multiple API keys defined in `.env`.
- **Manual Intervention**: If all keys are exhausted, wait 60 seconds or provide fresh keys in the `.env` file and call `restart-system`.

## 4. Permission Escalation
Jack's `aiValidator.js` is the primary shield.
- **Symptom**: A non-management user attempts to trigger a tool via natural language.
- **Prevention**: Jack cross-references every tool call against Discord's `PermissionFlagsBits`.
- **Audit**: Check the `observer.js` logs to see blocked attempts.

## 5. Memory Context Saturation
- **Symptom**: The AI becomes confused or loses track of recent context.
- **Resolution**: The `ConversationHistory` is capped at 20 messages. If saturation occurs, wait for the history to prune or clear the user's history document in MongoDB.

---
*Maintained by: ZEN | STRATEGIC OVERWATCH*
