# ⚙️ Core Architecture

This note explains how Jack Bot works under the hood. The system is designed for high performance, modularity, and stability.

## 🏗️ The Boot Sequence
1. `main.js`: Initializes environment and spawns the dashboard.
2. `bot/index.js`: Loads the Discord client and connects to MongoDB.
3. `core/pluginLoader.js`: Discovers and loads modular plugins.
4. `core/commandLoader.js`: Scans plugins for commands and registers them.
5. `core/eventLoader.js`: Binds plugin events to the Discord client.

## ⚡ Command Execution Flow
When a user runs a command:
1. **Dispatcher**: Detects if it's a Slash or Prefix command.
2. **Context Builder**: Creates a unified `ctx` object.
3. **[[CommandExecutor]]**: Handles permissions, cooldowns, and timeouts.
4. **ErrorHandler**: Logs failures with unique [[Ref-IDs]].

## 🧠 AI Orchestration Layer

Jack features a self-aware **AI Controller** that acts as the strategic brain of the bot. Unlike standard command-response bots, Jack can interpret natural language intent and decide between text responses or internal tool execution.

### The AI Pipeline:
1. **Intent Classification**: Analyzes user input to determine if it requires a chat response or a functional action.
2. **Security Validation**: Every AI-requested tool call is validated against the user's permissions and server state.
3. **Execution & Interpretation**:
   - If a tool is called, Jack executes it.
   - **Interpretation Pass**: Jack reviews the raw data from the tool and provides a "Strategic Report" in natural language.
4. **Persona Filter**: All output is passed through the **Strategic Manager** persona, ensuring a professional, high-end tone and strictly preventing JSON leakage to the user.

---
**Related:** [[00 - Home]], [[Command-Executor]], [[Plugin-Loader]]
