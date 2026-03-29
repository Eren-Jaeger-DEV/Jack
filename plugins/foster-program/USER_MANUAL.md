# 🤝 Foster Program — User Manual

The **Foster Program** is designed to strengthen the clan by pairing experienced high-synergy players (**Mentors**) with newer or lower-synergy players (**Rookies/Newbies**).

---

## 👥 Roles & Participation

Participants are automatically selected based on their `seasonSynergy` when the program starts:

- **Mentors (Top 15)**: The most active/high-synergy players in the clan.
- **Rookies (Bottom 10 + Newbies)**: Newer members or those with lower synergy.
- **Pairs**: Each Mentor is paired with one Rookie. These pairs work together to earn **Foster Points**.

---

## ⏳ Program Lifecycle

The program runs for **30 days** in two major phases:

1.  **Phase 1 (Days 1–15)**: Initial pairing and first half of the program.
2.  **Phase 2 (Days 16–30)**: Pairs are reshuffled based on updated seasonal synergy to ensure fresh engagement.
3.  **Rotation (Every 5 Days)**: Your partner will change every 5 days! Mentors remain fixed, while Rookies rotate to a new Mentor.
4.  **Auto-End**: The program automatically concludes and cleans up roles after 30 days.

---

## 💎 How to Earn Points (The "FS" System)

To climb the leaderboard, pairs must submit their combined synergy points. This uses a **Dual Validation** system:

### 1. The Submission Command
Use the following command in the dedicated foster channel:
- **Prefix**: `j fs <points>` (Must attach a screenshot of the synergy/game result).
- **Slash**: `/fs points:<number>`

### 2. Dual Validation Rules
- **Both Partners Must Submit**: For points to count, **both** the Mentor and the Rookie must run the command independently.
- **10-Minute Window**: Once the first partner submits, the second partner has **10 minutes** to submit their matching value.
- **Matching Values**: Both submissions must specify the **exact same number of points**. If values mismatch, the submission is rejected.
- **One Submission Per Rotation**: You can only successfully submit points **once per 5-day rotation cycle**.

---

## 📊 Leaderboard

Rankings are displayed in the foster channel:
- **Combined Synergy**: Total points awarded via the `fs` command.
- **Pagination**: Use the ◀ and ▶ buttons to browse all pairs.
- **Phase/Rotation**: The footer shows the current progress of the program.

---

## 🛡️ Admin Commands

Administrators can manage the program via internal commands (usually restricted to Manage Server permissions):
- **Start**: `j fs-start` (Manual start if not auto-triggered).
- **End**: `j fs-stop` (Force end the program).
- **Setup**: Ensure `fosterChannelId`, `mentorRoleId`, `rookieRoleId`, and `clanMemberRoleId` are configured in settings.

---

> [!TIP]
> Coordinate with your partner! Use private messages or the clan chat to agree on the point value before submitting to ensure you both hit the 10-minute window.
