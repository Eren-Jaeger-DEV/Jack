---
id: fosterprogram
model: FosterProgram
category: Social/Management
status: Plugin-Specific
---

# 🤝 FosterProgram Model

The `FosterProgram` model is one of the most complex in the bot, managing a multi-phase mentorship lifecycle across 30 days.

## 📋 Schema Fields

### 🛰️ Lifecycle State
- `status`: Tracks the current phase (`REGISTRATION`, `PAIRING_VERIFICATION`, `ACTIVE`, `VERIFICATION_FINAL`, `ENDED`).
- `term` / `cycle`: Tracks the time progression (1-30 days).

### 📝 Registration
- `registration.targets`: List of invited users and their roles (`MENTOR`, `NEOPHYTE`, `VETERAN`).
- `registration.registeredMentors`: Array of IDs who confirmed participation.

### 👥 Pairing Logic
- `pairs`: An array of `mentorId` and `partnerId` objects.
- `previousPairs`: Stores history to ensure unique reshuffles in future cycles.

### 📉 Points & Verification
- `pendingSubmissions`: Tracks point claims waiting for dual-validation.
- `mentorPoints` / `partnerPoints`: Map of accrued points per user.

---
**Related Documents:** [[00 - Schema Overview]], [[Foster-Program]]
