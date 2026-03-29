# 🎮 Intra Match — User Manual

The **Intra Match** system automates registration and winner tracking for internal clan tournaments. It is fully event-driven, meaning it listens for specific keywords rather than relying on standard commands.

---

## 📢 For Admins: Starting a Match

To start a new registration, post a message in the designated intra-announcement channel containing any of these keywords:
- `registration open`
- `register now`
- `intra registration`

The bot will automatically:
1. Create a **Registration Thread** attached to your message.
2. Monitor that thread for player sign-ups.

### Setting the Deadline
Inside the newly created registration thread, send a message with the closing date. The bot uses natural language parsing:
- **Examples**: `Closes on Tuesday`, `Ends 12 June 2025`, `Closes on 25th March`.
- **Auto-Lock**: The bot will automatically lock the thread and close registration at 23:59 on the specified date.

---

## 📝 For Players: How to Register

1.  **Find the Thread**: Look for the active "Intra Registration" thread in the announcements channel.
2.  **Send your IGN**: Simply post your **In-Game Name (IGN)** exactly as it appears in your `/profile`.
3.  **Requirements**:
    - You must be registered with the bot via `/register`.
    - You must have the Clan Member role.
4.  **Confirmation**: The bot will react with ✅ and confirm your registration count. You will also receive the **Participate** role.

---

## 🏆 For Admins: Announcing Winners

Once the match is complete, announce the winners in the same announcement channel using a message containing:
- **Keyword**: `🏆` or `winner`.
- **Mentions**: Mention the winning players (e.g., `Winner is @User1 and @User2 🏆`).

The bot will automatically:
1. Assign the **Winner** role to the mentioned users.
2. Remove the **Winner** role from the previous week's winners.
3. Remove the **Participate** role from everyone.
4. Close the active registration session.

---

> [!TIP]
> If you make a mistake in a date, simply send a new one in the thread. The bot will always use the latest successfully parsed date as the final deadline.
