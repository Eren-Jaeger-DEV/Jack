# Jack Discord Bot

A powerful, modular Discord bot built with discord.js v14 featuring advanced strategic management, community engagement, and server infrastructure tools.

## Features

### 🤝 Foster Program
A specialized mentorship system designed to pair experienced members with newer players to optimize community growth and synergy.
- **Cycle Rotations**: Automated 5-day cycle reshuffles to ensure diverse engagement correctly.
- **Dual Validation**: Secure point-attribution system requiring matching screenshot submissions from both partners.
- **Leaderboards**: Real-time ranking and pairing visualization.

### ⚔️ Clan Battle & Synergy
Comprehensive tools for tracking and managing competitive performance and seasonal participation.
- **Clan Battles**: Advanced match tracking and strategic reporting infrastructure.
- **Seasonal Synergy**: Automated tracking of member engagement with dynamic leaderboard integration.

### 📉 POP Market & Economic Ecosystem
A robust economic layer for managing trading and localized assets.
- **Trading Market**: Paginated Discord embeds for browsing and managing card listings.
- **Card Database**: Localized storage and management of collectible card assets.
- **Sticker & Emoji Modules**: Utilities for managing server-specific branding and expressive media.

### 🛡️ Server Management & Governance
High-performance infrastructure for automated server oversight.
- **Member Classification**: Data-driven role assignment based on join dates and activity patterns.
- **Channel Protection**: Intelligent filtering for links and media to maintain channel integrity.
- **Unified Logging**: High-fidelity audit logging with comprehensive boot reporting and system health monitoring.

## Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Eren-Jaeger-DEV/Jack.git
   cd Jack
   ```

2. **Configure Environment**
   Create a `.env` file in the root directory:
   ```env
   BOT_TOKEN=your_token_here
   MONGODB_URI=your_mongo_uri_here
   GUILD_ID=your_main_guild_id
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Launch the System**
   ```bash
   npm start
   ```

## Technical Details

- **Engine**: Node.js 20+
- **Library**: discord.js v14
- **Database**: MongoDB (via Mongoose)
- **Intelligence**: Google Vertex AI integration (optional)
- **Imaging**: Canvas & Sharp for dynamic leaderboard rendering
