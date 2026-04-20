---
id: useractivity
model: UserActivity
category: Analytics/Behavioral
status: Core
---

# 🕵️ UserActivity

The `UserActivity` model tracks passive behavioral signals from users, such as message frequency and activity scores, without storing actual message content.

## 📋 Schema Fields

### 📊 Activity Metrics
- `discordId`: Unique user identifier.
- `messageCount`: Total number of messages sent by the user.
- `lastActive`: Timestamp of the most recent interaction.
- `activityScore`: A calculated metric representing the user's relative engagement level.

### 🧬 Lifecycle
- `joinDate` / `leaveDate`: Tracks the user's duration within the server.

### 🤖 AI Feedback
- `successfulActions` / `failedActions`: Used to tune AI responses based on user interaction success.
- `lastActionType`: The nature of the most recent user action.

## ⚙️ Logic
An automatic `pre-save` hook normalizes the `activityScore` based on message volume and tenure.

---
**Related Documents:** [[00 - Schema Overview]], [[Player]], [[Level]]
