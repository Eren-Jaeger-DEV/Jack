# ⚔️ Clan Battle — User Manual

The **Clan Battle** system tracks player contributions during active clan events. Earn **Battle Points (BP)** daily to climb the leaderboard and lead the clan to victory!

---

## 📝 How to Participate

To submit your points, you must be a registered clan member.

### 1. Submit Daily Points
Each day, you can record your contribution:
- **Prefix**: `j bp <points>` (e.g., `j bp 85`)
- **Slash**: `/bp points:<number>`

### 2. Point Rules
- **Daily Limit**: You can submit a maximum of **100 BP** per day.
- **Once Per Day**: You can only submit once every 24 hours.
- **Daily Reset**: Today's points reset automatically at **midnight (00:00)** to allow for a fresh submission.
- **Registration**: You must use `/register` to link your IGN before using the battle system.

---

## 📊 Leaderboard & Rankings

The battle channel features a live visual leaderboard:
- **Visual Contributions**: Displays your avatar, IGN, today's contribution, and your total cumulative points.
- **Live Updates**: The board refreshes automatically whenever someone submits points.
- **Pagination**: Use the ◀ and ▶ buttons to see everyone's ranking.

---

## 🛡️ Admin & Moderator Commands

Staff members can correct point entries if mistakes are made:
- **Edit Today's Points**: `j editbp @user <points>` (Overwrites today's value and adjusts total).
- **Edit Total Points**: `j edittotalbp @user <points>` (Directly sets the total cumulative BP).
- **Battle Lifecycle**: Admins can start or end battles via internal setup commands. When a battle ends, the top 6 contributors are highlighted.

---

> [!IMPORTANT]
> Ensure you submit your points before midnight! Any unrecorded contributions for the day cannot be self-submitted after the daily reset.
