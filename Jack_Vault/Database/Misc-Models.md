# 📂 Miscellaneous Models

These models handle niche features like temporary timers and group management.

---

## [[Team]]
Used by the Teamup plugin to organize group events or game lobbies.

### 📋 Schema Fields
- `leaderId`: User who created the team.
- `members`: List of IDs currently in the team.
- `maxSize`: Limit of participants.
- `type`: Category of the teamup event.

---

## [[NewbieTimer]]
Used by the Member Classification plugin to track the "Gatekeeping" period for new joiners.

### 📋 Schema Fields
- `userId`: The ID of the newcomer.
- `assignedAt`: When the timer started.
- `expiresAt`: When the user will be automatically classified or allowed past the gate.

---
**Related Documents:** [[00 - Schema Overview]], [[Teamup]], [[Member-Classification]]
