---
id: error-troubleshooting
category: Maintenance
status: Documentation
---

# 🛠️ Error Troubleshooting (Ref-IDs)

The Jack bot uses a unique **Reference ID** system to help developers track down internal errors without exposing technical stack traces to end-users.

## 🎡 How it Works

1. **The Crash**: A command or plugin throws an unhandled error.
2. **The Capture**: The [[Command-Executor]] catches the error and sends it to the [[ErrorHandler]].
3. **The ID**: A unique 7-character code (e.g., `P9VIB9E`) is generated.
4. **The Reply**: The user sees: *"An internal error occurred. Ref: [P9VIB9E]"*.
5. **The Log**: The full error, stack trace, and Ref ID are sent to the bot's console and [[Logger]] files.

## 🔍 How to Fix an Error

### Step 1: Find the ID
Look at the error message sent in Discord and copy the Ref ID.

### Step 2: Search the Logs
SSH into the VM and use `grep` to find the technical stack trace:
```bash
grep "P9VIB9E" /home/gahlautanshuman384/.pm2/logs/jack-error.log -C 20
```

### Step 3: Analyze the Stack
The log will now show the exact file and line number where the failure occurred. 

> [!TIP] **Metadata Visibility**
> Thanks to the recent [[Logger]] upgrade, you can now see full metadata objects (including user IDs and command names) alongside the Ref ID in the logs.

---
**Related Documents:** [[Infrastructure-Deployment]], [[Logger]], [[Command-Executor]]
