# 👑 The Owner's Manual

Welcome, Manager. This guide covers the daily operations and emergency protocols for the Jack system.

## 1. Daily Operations
Jack is largely autonomous, but he performs best with human oversight.
- **Reviewing Logs**: Check the `#mod-logs` and `#system-logs` daily to monitor AI tool calls.
- **Synergy Validation**: Use the `/foster` commands to verify mentorship pairings once a week.
- **Market Health**: Ensure the Card Exchange channel is not cluttered with expired listings.

## 2. Setting the Tone
You can adjust Jack's personality per guild using the **Personality Dashboard** (if enabled) or by modifying the `GuildConfig`.
- **High Strictness**: Use this if the server is experiencing high toxicity.
- **High Humor**: Use this during special events or "off-season" periods to encourage engagement.

## 3. Emergency Protocols
If the bot becomes unresponsive or behaves unexpectedly:
1.  **Check Process**: Run `pm2 status` on the VM to see if `main.js` is online.
2.  **API Rotation**: If Jack reports "Strategic Link Unstable," check your `.env` for expired Google API keys.
3.  **Database Reset**: In extreme cases of data corruption, you can purge specific collections using the `search-database` and `apply-code-change` tools (with extreme caution).

## 4. Scaling the System
To add new features:
1.  Read the [JACK_BLUEPRINT.md](../JACK_BLUEPRINT.md).
2.  Create a new Plugin in `/plugins`.
3.  Jack will automatically detect the new plugin on the next reboot.

---
*Maintained by: VICTOR + ZEN*
