# Member Classification Plugin

## Overview
This plugin automatically classifies members based on their join date and activity patterns. It assigns roles and maintains a high-fidelity audit trail of member progression.

## Technical Details
- **ID**: `member-classification`
- **Category**: `Governance`
- **Dependencies**: `mongoose`, `GuildConfig`

## Components
- **Events**:
    - `guildMemberAdd`: Triggers initial classification on join.
- **Services**:
    - `classificationService`: Core logic for date-based tiering.
- **Database Models**:
    - Uses `Player` model to track `discordJoinDate` and `status`.

## Operational Documentation
For guides on how to configure tiers and role IDs, please refer to the **Jack Vault**:
[Member-Classification.md](file:///home/victor/My%20projects/Jack/Jack_Vault/Plugins/Member-Classification.md)

---
*Maintained by: ZEN | VICTOR*
