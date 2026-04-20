# 🎭 Economy & Social Plugins

This section covers the systems that drive engagement, progression, and the card-based economy within the server.

---

## [[Leveling]]
The core XP and progression system.

### 📋 Features
- **XP Accrual**: Earn points for chatting (with cooldowns to prevent spam).
- **Leaderboards**: Daily and Weekly rankings using the [[Level]] model.
- **Role Rewards**: Automated role distribution based on reaching specific levels.
- **Rank Cards**: Visual rank representation with custom backgrounds.

---

## [[Greeting]]
Managed the onboarding and departure of members.

### 📋 Features
- **Welcome**: Sends high-quality embeds to the `general-chat` or `greeting-log`.
- **Goodbye**: Logs member departures to help staff track retention.
- **Auto-Roles**: Can be configured to assign initial roles upon joining.

---

## [[Card-System]] (Packs, Database, Exchange)
A complex "CMS" style card system where Discord threads act as the source of truth for items.

### 📋 Components
1. **[[Card-Database]]**: Scans specific threads to build the central `cardsCache.json`.
2. **[[Packs]]**: Buying and opening packs to obtain random cards.
3. **[[Card-Exchange]]**: A persistent trading floor where users can list and trade cards.

---
**Related Documents:** [[00 - Plugins Index]], [[Level]], [[Market]], [[Member-Classification]]
