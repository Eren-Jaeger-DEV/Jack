# 🤝 Foster Program

The **Foster Program** is a unique 30-day mentorship system designed to pair veteran mentors with new rookies. It focuses on growth, activity, and knowledge transfer within the clan.

## 📋 Features
- **Mentor/Rookie Pairing**: Automated or manual pairing based on activity levels.
- **Cycle-Based Rotation**: Pairs are reshuffled every 30 days (or at the end of a cycle) to ensure diverse learning environments.
- **Dual-Validation**: Growth points are tracked for both members, ensuring that the mentor's success is tied to the rookie's progress.
- **Progress Tracking**: Real-time monitoring of synergy growth during the pairing period.

## 🔄 Cycle Synchronization (Audit)

As of **Cycle 1**, the program implements a rigorous audit phase at the end of each period:
- **Growth Partitioning**: Points earned during the cycle are calculated by subtracting the initial synergy (at the start of the cycle) from the final synergy.
- **Leaderboard Integration**: Audit results are synchronized with the global `Seasonal-Synergy` system to ensure competitive fairness.
- **Manual Overrides**: Support for manual point adjustments in cases of late registration or server-side sync issues.

## 🗃️ Models
- `FosterProgram`: The primary document tracking active cycles, participants, and pairing history.
- `Player`: The core player document which tracks individual growth and status.

## ⚙️ Commands (Internal)
- `node scripts/post_foster_pairs.js`: Deploys the visual pairing board.
- `node scripts/patch_foster_reshuffle.js`: Executes a mid-cycle reshuffle for specific users.
- `node scripts/stop_foster.js`: Terminates the current cycle and prepares for audit.

---
**Related:** [[Leveling]], [[Member-Classification]], [[Seasonal-Synergy]]
