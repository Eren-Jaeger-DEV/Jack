# ✨ Design & UI Patterns

Jack is designed to feel like a premium, state-of-the-art management system. All UI elements (Embeds, Buttons, Modals) must follow these strict aesthetic patterns.

## 🎨 Color Palette
Never use Discord's default red/green/blue. Use these curated HSL values for consistent premium feel:

| Type | Color Hex | Use Case |
| :--- | :--- | :--- |
| **Primary** | `#2B2D31` | Default Embed background. |
| **Accent** | `#5865F2` | "Blurple" for call-to-action buttons. |
| **Success** | `#43B581` | Positive actions (Member added, Points given). |
| **Critical** | `#F04747` | Danger actions (Ban, Delete, Error). |
| **Strategic** | `#FFD700` | High-level reports, Synergy, and Clan stats. |

## 📐 Embed Structure
Every major response should use the "Strategic Frame" pattern:

1.  **Title**: Concise, uppercase, preceded by a relevant emoji (e.g., `⚔️ CLAN BATTLE REPORT`).
2.  **Description**: High-level summary of the action.
3.  **Fields**: Group data into 2-column or 3-column grids using `inline: true`.
4.  **Footer**: Always include a timestamp and the system version (`JACK v1.0.0`).
5.  **Thumbnail**: Use relevant system icons (Clan logo or User avatar).

## 🔘 Interaction Patterns
- **Buttons**:
    - Use `ButtonStyle.Primary` for navigation/viewing.
    - Use `ButtonStyle.Secondary` for "Back" or "Cancel".
    - Use `ButtonStyle.Danger` **only** for destructive actions that cannot be undone.
- **Select Menus**:
    - Use for filtering long lists (e.g., selecting a player from a clan list).
- **Modals**:
    - Use for multi-field data entry (e.g., manually registering a member).

## 💎 The "Glass" Effect
When designing images (Level Cards, Greeting Cards), use:
- **Semi-transparent overlays**: Creates depth.
- **Vibrant Gradients**: Deep purples to dark blues.
- **Sans-serif Typography**: Use fonts like *Inter* or *Outfit* for a modern look.

---
*Maintained by: ZEN | DESIGN BRANCH*
