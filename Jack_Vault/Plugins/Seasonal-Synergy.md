---
id: seasonal-synergy
name: Seasonal Synergy
version: 2.1.0
category: Competitive
status: Active
---

# 🔥 Seasonal Synergy

The **Seasonal Synergy** system tracks long-term commitment and activity within the clan. It features automated point tracking, visual leaderboards, and AI-assisted screenshot processing.

## 📈 Overview

Synergy is divided into two metrics:
1. **Weekly Energy**: Resets every Monday at 00:00 IST. Used for the Weekly MVP title.
2. **Season Synergy**: Cumulative total for the entire season duration.

## 📸 Automation & AI Processing

The system includes a high-end **Automation Panel** located in the moderation channel. This allows staff to update the entire clan's synergy levels by simply uploading screenshots of the in-game leaderboard.

### Workflow:
1. **Start Session**: Click the "Collect Screenshots" button on the panel.
2. **Upload**: Upload images of the in-game clan rankings.
3. **Analyze**: Click "Process & Finalize". Jack uses AI to:
   - Extract member names.
   - Parse Weekly and Season values.
   - Automatically match extracted names with the bot's database.
4. **Resolution**: If a name doesn't perfectly match (e.g., due to different IGN/Discord naming), Jack prompts for manual resolution to link the extracted data to a specific player.

## 🏆 MVP Rewards

- **Weekly MVP Role**: Awarded to the Top 3 players every Monday.
- **MVP Count**: Permanent profile stat incremented for the #1 player each week.

## 📋 Commands

### User Commands
- `/we <points>`: Submit your own weekly energy (Weekend only).
- `j we <points>`: Prefix version of energy submission.

### Admin Commands
- `/synergy-setup`: Deploys the Automation Panel to the moderation channel.
- `/we <user> <points>`: Manually set a specific user's weekly energy (bypasses weekend restriction).
- `/se <user> <points>`: Directly overwrite a user's total season synergy.

## ⚙️ Requirements
- Active season must be started in the database.
- Clan member role must be assigned to users for self-submission.

---
**Related:** [[00 - Plugins Index]], [[Member-Classification]], [[Clan-Battle]]
