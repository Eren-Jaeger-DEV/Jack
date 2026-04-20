# 🖼️ Asset Banking (Emoji & Sticker)

The bot features a global "stolen" asset bank that allows users to save and reuse emojis and stickers across servers.

---

## [[EmojiBank]]
Tracks saved custom emojis and their metadata.

### 📋 Schema Fields
- `name` (String, Indexed): The name assigned to the emoji.
- `emojiID` (String, Unique): The internal ID for the asset.
- `url`: The direct link to the image file.
- `format`: `png` or `gif`.
- `pack`: The collection name for grouping assets.
- `sourceGuild`: Where the emoji was originally found.

---

## [[StickerBank]]
Tracks saved custom stickers, including animated formats.

### 📋 Schema Fields
- `name` (String, Indexed): The name assigned to the sticker.
- `stickerID` (String, Unique): The internal ID for the asset.
- `format`: `png`, `lottie`, or `apng`.
- `addedBy`: The user who saved the sticker to the bank.

---
**Related Documents:** [[00 - Schema Overview]], [[Emoji]], [[Sticker]]
