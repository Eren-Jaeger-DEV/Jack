# 🧠 JACK COMMAND MANUAL

## 1. OVERVIEW
- **Total number of commands:** 104
- **Categories (plugins):** admin, audit, card-database, celestial-hud, clan, clan-battle, emoji, foster-program, fun, games, greeting, leveling, market, moderation, packs, prefix, recorder, roles, say, seasonal-synergy, server-overview, sticker, teamup, tickets, utility

---

## 2. COMMAND LIST (GROUPED BY PLUGIN)

### 🔹 Plugin: admin

#### Command Name: achievement
- **Name:** /achievement 
- **Description:** Manually edit a player's achievements (Owner Only)
- **Usage:** /achievement edit <user>
- **Options:**
  - `edit` (String, Optional) - Open the achievement editor for a player
- **Permission:** Administrator
- **Example:** `/achievement edit <user>`
- **Notes:** None

#### Command Name: announce
- **Name:** /announce (Aliases: ann)
- **Description:** Create a beautiful announcement in any channel
- **Usage:** /announce  |  j announce
- **Options:**
  - `channel` (Channel, Required) - The channel to send the announcement to
- **Permission:** Administrator
- **Example:** `/announce`
- **Notes:** Sends a styled announcement embed to any channel you choose.

#### Command Name: disable
- **Name:** /disable (Aliases: cmdoff, disablecmd)
- **Description:** Disable a command category in a channel or server-wide
- **Usage:** /disable  |  j disable
- **Options:**
  - `category` (String, Required) - Command category
  - `channel` (Channel, Optional) - Channel to disable commands in
  - `all` (Boolean, Optional) - Disable this category in the whole server
- **Permission:** Administrator
- **Example:** `/disable`
- **Notes:** Disables a command category in a specific channel or server-wide.

#### Command Name: enable
- **Name:** /enable (Aliases: cmdon, enablecmd)
- **Description:** Enable a command category in a channel or server-wide
- **Usage:** /enable  |  j enable
- **Options:**
  - `category` (String, Required) - Command category
  - `channel` (Channel, Optional) - Channel to enable commands in
  - `all` (Boolean, Optional) - Enable in the whole server
- **Permission:** Administrator
- **Example:** `/enable`
- **Notes:** Re-enables a previously disabled command category.

#### Command Name: setai
- **Name:** /setai 
- **Description:** Sets the smart AI channel for the server
- **Usage:** /setai <channel>
- **Options:**
  - `channel` (Channel, Required) - The channel where Jack AI will respond automatically
- **Permission:** Administrator
- **Example:** `/setai <channel>`
- **Notes:** None

#### Command Name: setfoster
- **Name:** /setfoster (Aliases: fosterchannel, foster-channel)
- **Description:** Set the Foster Program channel
- **Usage:** j setfoster #channel
- **Options:**
  - `channel` (Channel, Required) - Select the foster channel
- **Permission:** Administrator
- **Example:** `/setfoster`
- **Notes:** None

#### Command Name: setlog
- **Name:** /setlog (Aliases: modlog, setmodlog)
- **Description:** Set the moderation log channel
- **Usage:** /setlog  |  j setlog
- **Options:**
  - `channel` (Channel, Required) - Select log channel
- **Permission:** Administrator
- **Example:** `/setlog`
- **Notes:** Sets the channel where moderation actions are logged.

#### Command Name: setup
- **Name:** /setup (Aliases: setup-admin-guide, adminguide)
- **Description:** Setup the permanent admin guide dashboard
- **Usage:** /setup admin-guide  |  j setup admin-guide
- **Options:**
  - `admin-guide` (String, Optional) - Create or refresh the staff admin command dashboard
- **Permission:** Administrator
- **Example:** `/setup admin-guide`
- **Notes:** Posts the permanent staff command dashboard in the current channel. Refreshes automatically if already set.

---

### 🔹 Plugin: audit

#### Command Name: regstatus
- **Name:** /regstatus (Aliases: rs)
- **Description:** Audit clan member registration status
- **Usage:** /regstatus  |  j regstatus
- **Options:** None
- **Permission:** Everyone
- **Example:** `/regstatus`
- **Notes:** Audit clan member registration status

---

### 🔹 Plugin: card-database

#### Command Name: card
- **Name:** /card 
- **Description:** Card database management commands
- **Usage:** /card
- **Options:**
  - `sync` (String, Optional) - Sync the card database from Discord threads
- **Permission:** Everyone
- **Example:** `/card`
- **Notes:** None

---

### 🔹 Plugin: celestial-hud

#### Command Name: hud
- **Name:** /hud 
- **Description:** Access your Celestial HUD (Live Status)
- **Usage:** /hud  |  j hud
- **Options:**
  - `target` (User, Optional) - View another asset's HUD
- **Permission:** Everyone
- **Example:** `/hud`
- **Notes:** Opens a real-time tactical dashboard showing your energy, level progress, and foster status.

---

### 🔹 Plugin: clan

#### Command Name: clanroster
- **Name:** /clanroster (Aliases: roster, players)
- **Description:** View the full clan player roster
- **Usage:** /clanroster  |  j clanroster
- **Options:** None
- **Permission:** Everyone
- **Example:** `/clanroster`
- **Notes:** Shows the full registered clan member list with IGN, UID, and synergy.

#### Command Name: deleteplayer
- **Name:** /deleteplayer (Aliases: delplayer, removeplayer)
- **Description:** Delete a player's clan profile
- **Usage:** /deleteplayer @user  |  j deleteplayer @user
- **Options:**
  - `user` (User, Required) - Player to delete
- **Permission:** Everyone
- **Example:** `/deleteplayer @user`
- **Notes:** Permanently removes a player's clan profile from the database.

#### Command Name: editprofile
- **Name:** /editprofile (Aliases: editp, updateprofile)
- **Description:** Edit your BGMI player profile
- **Usage:** /editprofile  |  j editprofile
- **Options:** None
- **Permission:** Everyone
- **Example:** `/editprofile`
- **Notes:** Edit your own BGMI player profile (IGN, UID, level, mode preferences).

#### Command Name: ign
- **Name:** /ign (Aliases: gamename, ingamename)
- **Description:** View a player's in-game name
- **Usage:** /ign [@user]  |  j ign [@user]
- **Options:**
  - `user` (User, Optional) - Player
- **Permission:** Everyone
- **Example:** `/ign [@user]`
- **Notes:** Displays the in-game name of a registered BGMI player.

#### Command Name: ignall
- **Name:** /ignall (Aliases: alligns, listigns)
- **Description:** View a list of all player IGNs in the database (Admin Only)
- **Usage:** /ignall  |  j ignall
- **Options:** None
- **Permission:** Everyone
- **Example:** `/ignall`
- **Notes:** Displays a paginated list of all player IGNs from the database.

#### Command Name: profile
- **Name:** /profile (Aliases: p, playerprofile)
- **Description:** Show BGMI player profile
- **Usage:** /profile [@user]  |  j profile [@user]
- **Options:**
  - `user` (User, Optional) - Profile
- **Permission:** Everyone
- **Example:** `/profile [@user]`
- **Notes:** Shows a player's full BGMI profile card including IGN, UID, synergy, and level. Click 'View Achievements' for stats.

#### Command Name: profilecreate
- **Name:** /profilecreate (Aliases: pc, createprofile)
- **Description:** Create an unlinked BGMI player profile (Admin Only)
- **Usage:** /profilecreate  |  j profilecreate
- **Options:** None
- **Permission:** Everyone
- **Example:** `/profilecreate`
- **Notes:** Opens the registration modal to create an unlinked profile for a player without a Discord account.

#### Command Name: profiletransfer
- **Name:** /profiletransfer (Aliases: pt, transferprofile)
- **Description:** Link an unlinked profile to a Discord user (Admin Only)
- **Usage:** /profiletransfer [@user]  |  j profiletransfer [@user]
- **Options:**
  - `user` (User, Required) - The target Discord user to link the profile to
- **Permission:** Everyone
- **Example:** `/profiletransfer [@user]`
- **Notes:** Allows admins to transfer an unlinked, manually-created profile to a Discord user. If an unlinked profile matches perfectly when a user runs /register, it is claimed automatically.

#### Command Name: register
- **Name:** /register (Aliases: reg, joinroster)
- **Description:** Register your BGMI player profile
- **Usage:** /register  |  j register
- **Options:** None
- **Permission:** Everyone
- **Example:** `/register`
- **Notes:** Registers your BGMI player profile (IGN, UID, level, preferred modes).

#### Command Name: uid
- **Name:** /uid (Aliases: playeruid, bgmiuid)
- **Description:** View a player's BGMI UID
- **Usage:** /uid [@user]  |  j uid [@user]
- **Options:**
  - `user` (User, Optional) - Player
- **Permission:** Everyone
- **Example:** `/uid [@user]`
- **Notes:** Shows the BGMI UID of a registered clan player.

#### Command Name: unlinked
- **Name:** /unlinked (Aliases: unlinkedprofiles, listunlinked)
- **Description:** View all unlinked player profiles (Admin Only)
- **Usage:** /unlinked  |  j unlinked
- **Options:** None
- **Permission:** Everyone
- **Example:** `/unlinked`
- **Notes:** Displays a paginated list of all manually created profiles that have not yet been linked to a Discord user.

---

### 🔹 Plugin: clan-battle

#### Command Name: bp
- **Name:** /bp (Aliases: battlepoint)
- **Description:** Submit your daily battle contribution points
- **Usage:** /bp <points>  |  j bp <points>
- **Options:**
  - `points` (Integer, Required) - Your contribution points for today
- **Permission:** Everyone
- **Example:** `/bp <points>`
- **Notes:** Submit your daily battle points (1-100). Only once per day during an active clan battle.

#### Command Name: editbp
- **Name:** /editbp (Aliases: editbattlepoint)
- **Description:** Edit a player's today battle points
- **Usage:** /editbp @user <points>  |  j editbp @user <points>
- **Options:**
  - `points` (Integer, Required) - New today points value
  - `user` (User, Optional) - Discord user to edit (provide either user or uid)
  - `uid` (String, Optional) - Target player by UID (if not on Discord)
- **Permission:** Everyone
- **Example:** `/editbp @user <points>`
- **Notes:** Admin command to overwrite a player's daily contribution points. Adjusts total accordingly.

#### Command Name: edittotalbp
- **Name:** /edittotalbp (Aliases: edittotalbattlepoint)
- **Description:** Edit a player's total battle points
- **Usage:** /edittotalbp @user <points>  |  j edittotalbp @user <points>
- **Options:**
  - `points` (Integer, Required) - New total points value
  - `user` (User, Optional) - Discord user to edit (provide either user or uid)
  - `uid` (String, Optional) - Target player by UID (if not on Discord)
- **Permission:** Everyone
- **Example:** `/edittotalbp @user <points>`
- **Notes:** Admin command to directly set a player's total contribution points.

---

### 🔹 Plugin: emoji

#### Command Name: emoji
- **Name:** /emoji (Aliases: moji, sendemoji)
- **Description:** Summon an emoji from the global CDN directly into chat.
- **Usage:** /emoji <name>  |  j emoji <name>
- **Options:**
  - `query` (String, Required) - The emoji name to search
- **Permission:** Everyone
- **Example:** `/emoji <name>`
- **Notes:** Summons any emoji from the Global CDN directly into chat as a large image.

#### Command Name: emojiadd
- **Name:** /emojiadd (Aliases: emojiget, getmoji)
- **Description:** Summon a specific emoji from the Global Vault to your server.
- **Usage:** /emojiadd <name>  |  j emoji add <name>
- **Options:**
  - `emojiname` (String, Required) - Name of the emoji to download
- **Permission:** Everyone
- **Example:** `/emojiadd <name>`
- **Notes:** Summons a specific emoji from the Global Vault into your server.

#### Command Name: emojibank
- **Name:** /emojibank (Aliases: emojilist, mojis)
- **Description:** View the Global Emoji Bank list.
- **Usage:** /emojibank  |  j emoji bank
- **Options:** None
- **Permission:** Everyone
- **Example:** `/emojibank`
- **Notes:** Shows a text list of all emojis stored in the Global Vault.

#### Command Name: emojibrowse
- **Name:** /emojibrowse (Aliases: emojivault, browsemoji)
- **Description:** Browse the visual interface of the Global Emoji Vault.
- **Usage:** /emojibrowse  |  j emoji browse
- **Options:** None
- **Permission:** Everyone
- **Example:** `/emojibrowse`
- **Notes:** Opens a visual paginated browser for the Global Emoji Vault.

#### Command Name: emojicleanup
- **Name:** /emojicleanup (Aliases: mojiscan, emojiscan)
- **Description:** Scans for server emojis unused in the CDN for 30+ days.
- **Usage:** /emojicleanup  |  j emoji cleanup
- **Options:** None
- **Permission:** Everyone
- **Example:** `/emojicleanup`
- **Notes:** Scans for server emojis unused in the CDN for 30+ days to free up slots.

#### Command Name: emojiremove
- **Name:** /emojiremove (Aliases: emojidel, delmoji)
- **Description:** Remove an emoji from the global vault.
- **Usage:** /emojiremove <name>  |  j emoji remove <name>
- **Options:**
  - `emojiname` (String, Required) - Name of the emoji to delete
- **Permission:** Everyone
- **Example:** `/emojiremove <name>`
- **Notes:** Removes a specific emoji from the Global Vault permanently.

#### Command Name: emojislots
- **Name:** /emojislots (Aliases: slots, emojicap)
- **Description:** Check the current server emoji and sticker slot usage.
- **Usage:** /emojislots  |  j emoji slots
- **Options:** None
- **Permission:** Everyone
- **Example:** `/emojislots`
- **Notes:** Shows current emoji and sticker slot usage for the server.

#### Command Name: emojitemp
- **Name:** /emojitemp (Aliases: tempemoji, borrowmoji)
- **Description:** Temporarily install a global emoji for 10 minutes to save slots.
- **Usage:** /emojitemp <name>  |  j emoji temp <name>
- **Options:**
  - `name` (String, Required) - Exact name of the vault emoji
- **Permission:** Everyone
- **Example:** `/emojitemp <name>`
- **Notes:** Temporarily installs a global emoji for 10 minutes to save permanent slots.

---

### 🔹 Plugin: foster-program

#### Command Name: fs-pairremove
- **Name:** /fs-pairremove (Aliases: pairremove, foster-pairremove, removepair)
- **Description:** Remove a pair from the active Foster Program
- **Usage:** j pairremove
- **Options:** None
- **Permission:** Everyone
- **Example:** `/fs-pairremove`
- **Notes:** None

#### Command Name: fs-replace
- **Name:** /fs-replace (Aliases: fosterreplace, foster-replace)
- **Description:** Replace a mentor or newbie in an active Foster Program pair
- **Usage:** j fs-replace <mentor|newbie> @oldUser @newUser
- **Options:**
  - `role` (String, Required) - Which role to replace: mentor or newbie
  - `old_user` (User, Required) - The current participant to remove
  - `new_user` (User, Required) - The replacement participant to add
- **Permission:** Everyone
- **Example:** `/fs-replace`
- **Notes:** None

#### Command Name: fs-start
- **Name:** /fs-start (Aliases: fosterstart, fsstart, /fs-start)
- **Description:** Start the Foster Program v2 (Staff Only)
- **Usage:** j fs-start
- **Options:** None
- **Permission:** Everyone
- **Example:** `/fs-start`
- **Notes:** None

---

### 🔹 Plugin: fun

#### Command Name: action
- **Name:** /action (Aliases: do, react)
- **Description:** Perform a fun action (hug, slap, kiss, etc.)
- **Usage:** j action <type> [@user]
- **Options:** None
- **Permission:** Everyone
- **Example:** `j action <type> [@user]`
- **Notes:** Performs a fun animated action: hug, slap, kiss, poke, pat, and more.

---

### 🔹 Plugin: games

#### Command Name: tictactoe
- **Name:** /tictactoe (Aliases: ttt)
- **Description:** Challenge another user to a game of TicTacToe
- **Usage:** j tictactoe [user]
- **Options:** None
- **Permission:** Everyone
- **Example:** `j tictactoe [user]`
- **Notes:** Starts a TicTacToe match. If a user is specified, it challenges them. If not, you play against an intelligent AI.

#### Command Name: tttlb
- **Name:** /tttlb (Aliases: tttleaderboard, ttt-top)
- **Description:** View the TicTacToe leaderboard
- **Usage:** j tttlb
- **Options:** None
- **Permission:** Everyone
- **Example:** `j tttlb`
- **Notes:** Shows the top 10 TicTacToe players based on wins.

---

### 🔹 Plugin: greeting

#### Command Name: setupgreeting
- **Name:** /setupgreeting (Aliases: setgreet, greetconfig)
- **Description:** Configure channels for welcome and goodbye messages.
- **Usage:** /setupgreeting <welcome|goodbye> [channel] [enabled]
- **Options:**
  - `welcome` (String, Optional) - Set the welcome message channel
  - `goodbye` (String, Optional) - Set the goodbye message channel
- **Permission:** Administrator
- **Example:** `/setupgreeting <welcome`
- **Notes:** Use this to manage the channels for the greeting plugin.

---

### 🔹 Plugin: leveling

#### Command Name: addxp
- **Name:** /addxp (Aliases: xp+, givexp)
- **Description:** Add XP to a user
- **Usage:** /addxp @user <amount>  |  j addxp @user <amount>
- **Options:**
  - `user` (User, Required) - User to add XP to
  - `amount` (Integer, Required) - Amount of XP
- **Permission:** Administrator
- **Example:** `/addxp @user <amount>`
- **Notes:** Admin: Adds XP directly to a user's level progress.

#### Command Name: leaderboard
- **Name:** /leaderboard (Aliases: lb, top, levels)
- **Description:** View the server XP leaderboard
- **Usage:** /leaderboard  |  j leaderboard
- **Options:**
  - `global` (String, Optional) - View the all-time XP leaderboard
  - `weekly` (String, Optional) - View the weekly XP leaderboard
- **Permission:** Everyone
- **Example:** `/leaderboard`
- **Notes:** Shows the top XP leaderboard for the server, sorted by level and XP.

#### Command Name: rank
- **Name:** /rank (Aliases: level, xp)
- **Description:** Show your or another user's rank card
- **Usage:** /rank [@user]  |  j rank [@user]
- **Options:**
  - `user` (User, Optional) - The user to check
- **Permission:** Everyone
- **Example:** `/rank [@user]`
- **Notes:** Displays your (or another user's) rank card with level, XP bar, and server position.

#### Command Name: rankbackground
- **Name:** /rankbackground (Aliases: rankbg, setbg)
- **Description:** Set your custom rank card background
- **Usage:** /rankbackground  |  j rankbackground
- **Options:**
  - `set` (String, Optional) - Set a custom background image via URL
- **Permission:** Everyone
- **Example:** `/rankbackground`
- **Notes:** Set a custom background image for your personal rank card.

#### Command Name: removexp
- **Name:** /removexp (Aliases: xp-, takexp)
- **Description:** Remove XP from a user
- **Usage:** /removexp @user <amount>  |  j removexp @user <amount>
- **Options:**
  - `user` (User, Required) - User to remove XP from
  - `amount` (Integer, Required) - Amount of XP
- **Permission:** Administrator
- **Example:** `/removexp @user <amount>`
- **Notes:** Admin: Removes XP from a user's level progress.

#### Command Name: resetxp
- **Name:** /resetxp (Aliases: clearxp, xpreset)
- **Description:** Reset all XP for a user
- **Usage:** /resetxp @user  |  j resetxp @user
- **Options:**
  - `user` (User, Required) - User to reset XP for
- **Permission:** Administrator
- **Example:** `/resetxp @user`
- **Notes:** Admin: Fully resets all XP for a specific user.

#### Command Name: resetxpall
- **Name:** /resetxpall (Aliases: wipelevels, clearallxp)
- **Description:** Reset ALL XP for EVERYONE in the server
- **Usage:** /resetxpall  |  j resetxpall
- **Options:** None
- **Permission:** Administrator
- **Example:** `/resetxpall`
- **Notes:** Admin: Wipes XP for ALL members server-wide. Irreversible.

#### Command Name: setlevel
- **Name:** /setlevel (Aliases: lvlset, forcelvl)
- **Description:** Set Level for a user
- **Usage:** /setlevel @user <level>  |  j setlevel @user <level>
- **Options:**
  - `user` (User, Required) - User to set level for
  - `level` (Integer, Required) - Level to set
- **Permission:** Administrator
- **Example:** `/setlevel @user <level>`
- **Notes:** Admin: Forces a user to a specific level directly.

#### Command Name: setxp
- **Name:** /setxp (Aliases: xpset, forcexp)
- **Description:** Set XP for a user
- **Usage:** /setxp @user <amount>  |  j setxp @user <amount>
- **Options:**
  - `user` (User, Required) - User to set XP for
  - `amount` (Integer, Required) - Amount of XP
- **Permission:** Administrator
- **Example:** `/setxp @user <amount>`
- **Notes:** Admin: Sets a user's total XP to an exact amount.

#### Command Name: xpresetweekly
- **Name:** /xpresetweekly (Aliases: xpweeklyreset, clearweeklyxp)
- **Description:** Reset weekly XP for EVERYONE in the server
- **Usage:** /xpresetweekly  |  j xpresetweekly
- **Options:** None
- **Permission:** Administrator
- **Example:** `/xpresetweekly`
- **Notes:** Admin: Resets weekly XP for every member in the server.

---

### 🔹 Plugin: market

#### Command Name: cancelpop
- **Name:** /cancelpop (Aliases: popcancel, unsell)
- **Description:** Cancel your active POP market listing
- **Usage:** /cancelpop  |  j pop cancel
- **Options:**
  - `listing_id` (String, Optional) - The ID of the listing (Admins only)
- **Permission:** Everyone
- **Example:** `/cancelpop`
- **Notes:** Cancels your active POP listing from the marketplace.

#### Command Name: popmarket
- **Name:** /popmarket (Aliases: market, marketplace)
- **Description:** Force refresh the POP marketplace panel
- **Usage:** /popmarket  |  j pop market
- **Options:** None
- **Permission:** Everyone
- **Example:** `/popmarket`
- **Notes:** Force-refreshes the POP marketplace panel in the designated channel.

#### Command Name: sell
- **Name:** /sell (Aliases: sellpop, listpop)
- **Description:** List your POP for sale on the marketplace
- **Usage:** /sell  |  j sell pop
- **Options:**
  - `item` (String, Required) - What are you selling? (Type 'pop')
  - `amount` (String, Required) - Amount of POP (e.g., 1000, 1k, 2.5k)
  - `price` (String, Required) - Price (e.g., ₹1000, 1000, 1k, ₹1k)
- **Permission:** Everyone
- **Example:** `/sell`
- **Notes:** Lists your POP for sale on the server marketplace.

---

### 🔹 Plugin: moderation

#### Command Name: addrole
- **Name:** /addrole (Aliases: ar, giverole, roleadd)
- **Description:** Add a role to a user
- **Usage:** /addrole @user @role  |  j addrole @user @role
- **Options:**
  - `user` (User, Required) - User
  - `role` (Role, Required) - Role to add
- **Permission:** Everyone
- **Example:** `/addrole @user @role`
- **Notes:** Assigns a role to a member.

#### Command Name: ban
- **Name:** /ban (Aliases: banish)
- **Description:** Ban a member from the server
- **Usage:** /ban @user [reason]  |  j ban @user [reason]
- **Options:**
  - `user` (User, Required) - User to ban
  - `reason` (String, Optional) - Reason for ban
- **Permission:** Everyone
- **Example:** `/ban @user [reason]`
- **Notes:** Permanently bans a member from the server with an optional reason.

#### Command Name: clear
- **Name:** /clear (Aliases: purge, delete, clean)
- **Description:** Delete multiple messages from a channel
- **Usage:** /clear <amount> [user]  |  j clear <amount> [@user]
- **Options:**
  - `amount` (Integer, Required) - Number of messages (1-1000)
  - `target` (User, Optional) - User to clear messages from
- **Permission:** Everyone
- **Example:** `/clear <amount> [user]`
- **Notes:** Bulk-deletes up to 1000 messages in the current channel. Can also filter by user.

#### Command Name: clearall
- **Name:** /clearall (Aliases: nuke, wipe)
- **Description:** Delete all messages in the channel (Nuke)
- **Usage:** /clearall  |  j clearall
- **Options:** None
- **Permission:** Everyone
- **Example:** `/clearall`
- **Notes:** Deletes ALL messages in the channel by cloning the channel and deleting the original. Bypasses the 14-day limit.

#### Command Name: clearwarns
- **Name:** /clearwarns (Aliases: warnsclear, clearwarnings)
- **Description:** Clear all warnings from a user
- **Usage:** /clearwarns @user  |  j clearwarns @user
- **Options:**
  - `user` (User, Required) - User
- **Permission:** Everyone
- **Example:** `/clearwarns @user`
- **Notes:** Clears all warnings from a user's record.

#### Command Name: kick
- **Name:** /kick (Aliases: boot, remove)
- **Description:** Kick a member from the server
- **Usage:** /kick @user [reason]  |  j kick @user [reason]
- **Options:**
  - `user` (User, Required) - User to kick
  - `reason` (String, Optional) - Reason
- **Permission:** Everyone
- **Example:** `/kick @user [reason]`
- **Notes:** Kicks a member from the server.

#### Command Name: lock
- **Name:** /lock (Aliases: lockdown, lockchannel)
- **Description:** Lock the current channel
- **Usage:** /lock  |  j lock
- **Options:** None
- **Permission:** Everyone
- **Example:** `/lock`
- **Notes:** Locks the current channel so members cannot send messages.

#### Command Name: mute
- **Name:** /mute (Aliases: timeout, silence, shutup)
- **Description:** Timeout a member for a specified duration
- **Usage:** /mute @user <duration> [reason]  |  j mute @user <duration> [reason]
- **Options:**
  - `user` (User, Required) - User to mute
  - `minutes` (Integer, Required) - Duration in minutes
- **Permission:** Everyone
- **Example:** `/mute @user <duration> [reason]`
- **Notes:** Times out a member for a specified duration (e.g. 10m, 1h, 1d).

#### Command Name: nickname
- **Name:** /nickname (Aliases: nick, setnick, rename)
- **Description:** Change a user's nickname
- **Usage:** /nickname @user <name>  |  j nickname @user <name>
- **Options:**
  - `user` (User, Required) - User whose nickname will be changed
  - `nickname` (String, Required) - New nickname
- **Permission:** Everyone
- **Example:** `/nickname @user <name>`
- **Notes:** Changes a member's displayed server nickname.

#### Command Name: removerole
- **Name:** /removerole (Aliases: rr-role, takerole, roledel)
- **Description:** Remove a role from a user
- **Usage:** /removerole @user @role  |  j removerole @user @role
- **Options:**
  - `user` (User, Required) - User
  - `role` (Role, Required) - Role to remove
- **Permission:** Everyone
- **Example:** `/removerole @user @role`
- **Notes:** Removes a role from a member.

#### Command Name: unban
- **Name:** /unban (Aliases: pardon, forgive)
- **Description:** Unban a user from the server
- **Usage:** /unban <userId>  |  j unban <userId>
- **Options:**
  - `userid` (String, Required) - User ID to unban
- **Permission:** Everyone
- **Example:** `/unban <userId>`
- **Notes:** Unbans a user by their Discord ID.

#### Command Name: unlock
- **Name:** /unlock (Aliases: unlockchannel, open)
- **Description:** Unlock the current channel
- **Usage:** /unlock  |  j unlock
- **Options:** None
- **Permission:** Everyone
- **Example:** `/unlock`
- **Notes:** Unlocks a previously locked channel so members can speak again.

#### Command Name: unmute
- **Name:** /unmute (Aliases: untimeout, unsilence)
- **Description:** Remove timeout from a member
- **Usage:** /unmute @user  |  j unmute @user
- **Options:**
  - `user` (User, Required) - User to unmute
- **Permission:** Everyone
- **Example:** `/unmute @user`
- **Notes:** Removes a timeout from a member early.

#### Command Name: unwarn
- **Name:** /unwarn (Aliases: removewarn, warnremove)
- **Description:** Remove a warning from a user
- **Usage:** /unwarn @user <warnId>  |  j unwarn @user <warnId>
- **Options:**
  - `user` (User, Required) - User to remove warning from
- **Permission:** Everyone
- **Example:** `/unwarn @user <warnId>`
- **Notes:** Removes a specific warning from a user's record by warn ID.

#### Command Name: warn
- **Name:** /warn (Aliases: strike, warning)
- **Description:** Warn a user with a reason
- **Usage:** /warn @user <reason>  |  j warn @user <reason>
- **Options:**
  - `user` (User, Required) - User to warn
  - `reason` (String, Required) - Reason
- **Permission:** Everyone
- **Example:** `/warn @user <reason>`
- **Notes:** Issues a formal warning to a member and stores it in the database.

#### Command Name: warnings
- **Name:** /warnings (Aliases: warns, checkwarns)
- **Description:** View warnings for a user
- **Usage:** /warnings @user  |  j warnings @user
- **Options:**
  - `user` (User, Required) - User
- **Permission:** Everyone
- **Example:** `/warnings @user`
- **Notes:** Shows all recorded warnings for a member.

---

### 🔹 Plugin: packs

#### Command Name: packadd
- **Name:** /packadd (Aliases: addpack, packemoji)
- **Description:** Add an existing global emoji to an Emoji Pack
- **Usage:** /packadd <packName> <emojiName>  |  j pack add <packName> <emojiName>
- **Options:**
  - `emojiname` (String, Required) - Name of the emoji
  - `packname` (String, Required) - Name of the destination pack
- **Permission:** Everyone
- **Example:** `/packadd <packName> <emojiName>`
- **Notes:** Adds an existing Global Vault emoji to an emoji pack.

#### Command Name: packcreate
- **Name:** /packcreate (Aliases: newpack, createpack)
- **Description:** Create an empty Emoji Pack in the Global Vault
- **Usage:** /packcreate <name>  |  j pack create <name>
- **Options:**
  - `packname` (String, Required) - Name of the pack
- **Permission:** Everyone
- **Example:** `/packcreate <name>`
- **Notes:** Creates a new empty Emoji Pack in the Global Vault.

#### Command Name: packimport
- **Name:** /packimport (Aliases: importpack, downloadpack)
- **Description:** Download a full Global Emoji Pack into your server automatically.
- **Usage:** /packimport <packName>  |  j pack import <packName>
- **Options:**
  - `packname` (String, Required) - Exact name of the pack to download
- **Permission:** Everyone
- **Example:** `/packimport <packName>`
- **Notes:** Downloads a full emoji pack into your server, filling available emoji slots.

#### Command Name: packremove
- **Name:** /packremove (Aliases: removepack, packdelete)
- **Description:** Remove an emoji from its Emoji Pack
- **Usage:** /packremove <packName> <emojiName>  |  j pack remove <packName> <emojiName>
- **Options:**
  - `emojiname` (String, Required) - Name of the emoji
- **Permission:** Everyone
- **Example:** `/packremove <packName> <emojiName>`
- **Notes:** Removes an emoji from an emoji pack.

---

### 🔹 Plugin: prefix

#### Command Name: prefix
- **Name:** /prefix 
- **Description:** Manage the bot's custom prefix for this server.
- **Usage:** /prefix set <new_prefix> | j prefix remove | j prefix review
- **Options:**
  - `set` (String, Optional) - Set a custom prefix
  - `remove` (String, Optional) - Remove the custom prefix
  - `review` (String, Optional) - Review the current prefix
- **Permission:** Everyone
- **Example:** `/prefix set <new_prefix>`
- **Notes:** None

---

### 🔹 Plugin: recorder

#### Command Name: record
- **Name:** /record 
- **Description:** Manage voice recordings
- **Usage:** /record start | /record stop
- **Options:**
  - `start` (String, Optional) - Start recording the current voice channel
  - `stop` (String, Optional) - Stop the current recording and get the files
- **Permission:** Everyone
- **Example:** `/record start`
- **Notes:** Start or stop multi-track voice recordings in your current voice channel.

---

### 🔹 Plugin: roles

#### Command Name: rradd
- **Name:** /rradd (Aliases: addreactionrole, rr-add)
- **Description:** Add a Role option to a Reaction Role Panel
- **Usage:** /rradd  |  j rr add
- **Options:**
  - `panel_id` (String, Required) - The Panel ID
  - `role` (Role, Required) - The role to give
  - `label` (String, Optional) - Text label for the button
  - `emoji` (String, Optional) - Emoji for the button
- **Permission:** Everyone
- **Example:** `/rradd`
- **Notes:** Adds a new role option button to an existing Reaction Role Panel.

#### Command Name: rrcreate
- **Name:** /rrcreate (Aliases: createreactionrole, rr-create, newrr)
- **Description:** Create a new Reaction Role Custom Panel
- **Usage:** /rrcreate  |  j rr create
- **Options:**
  - `title` (String, Required) - Panel title
  - `description` (String, Required) - Panel description
  - `channel` (Channel, Required) - Channel to send the panel to
  - `color` (String, Optional) - Embed HEX color (e.g. #ff0000)
- **Permission:** Everyone
- **Example:** `/rrcreate`
- **Notes:** Creates a new custom Reaction Role panel with buttons in the channel.

#### Command Name: rrdelete
- **Name:** /rrdelete (Aliases: deletereactionrole, rr-delete, delrr)
- **Description:** Delete an active Reaction Role Panel permanently
- **Usage:** /rrdelete  |  j rr delete
- **Options:**
  - `panel_id` (String, Required) - The Panel ID
- **Permission:** Everyone
- **Example:** `/rrdelete`
- **Notes:** Permanently deletes an existing Reaction Role Panel.

#### Command Name: rrremove
- **Name:** /rrremove (Aliases: removereactionrole, rr-remove)
- **Description:** Remove a Role option from a Reaction Role Panel
- **Usage:** /rrremove  |  j rr remove
- **Options:**
  - `panel_id` (String, Required) - The Panel ID
  - `role` (Role, Required) - The role to remove
- **Permission:** Everyone
- **Example:** `/rrremove`
- **Notes:** Removes a specific role button from a Reaction Role Panel.

---

### 🔹 Plugin: say

#### Command Name: sayit
- **Name:** /sayit 
- **Description:** Resends a replied-to message through the bot and deletes the original.
- **Usage:** /sayit
- **Options:** None
- **Permission:** Administrator
- **Example:** `/sayit`
- **Notes:** None

---

### 🔹 Plugin: seasonal-synergy

#### Command Name: se
- **Name:** /se (Aliases: seasonenergy)
- **Description:** Set season energy for a user (Admin)
- **Usage:** /se @user <points>  |  j se @user <points>
- **Options:**
  - `points` (Integer, Required) - Season energy points to set
  - `user` (User, Optional) - Discord target user (provide either user or uid)
  - `uid` (String, Optional) - Target player by UID (if not on Discord)
- **Permission:** Everyone
- **Example:** `/se @user <points>`
- **Notes:** Admin command to directly set a user's season energy.

#### Command Name: synergy-setup
- **Name:** /synergy-setup 
- **Description:** Deploy the Synergy Automation Panel to the moderation channel
- **Usage:** /synergy-setup
- **Options:** None
- **Permission:** Everyone
- **Example:** `/synergy-setup`
- **Notes:** None

#### Command Name: we
- **Name:** /we (Aliases: weeklyenergy)
- **Description:** Submit your weekly energy points
- **Usage:** /we <points>  |  j we <points>  |  /we @user <points> (admin)
- **Options:**
  - `points` (Integer, Required) - Your energy points
  - `user` (User, Optional) - (Admin) Target user to submit energy for
  - `uid` (String, Optional) - (Admin) Target player by UID
- **Permission:** Everyone
- **Example:** `/we <points>`
- **Notes:** Submit weekly energy (1-15000). Weekend only. Admins can submit on behalf of a user and bypass restrictions.

---

### 🔹 Plugin: server-overview

#### Command Name: setup-control-panel
- **Name:** /setup-control-panel 
- **Description:** Initializes the admin control panel in the designated channel.
- **Usage:** /setup-control-panel
- **Options:** None
- **Permission:** Administrator
- **Example:** `/setup-control-panel`
- **Notes:** None

#### Command Name: setup-overview
- **Name:** /setup-overview 
- **Description:** Initializes the server overview in the designated channel.
- **Usage:** /setup-overview
- **Options:** None
- **Permission:** Administrator
- **Example:** `/setup-overview`
- **Notes:** None

---

### 🔹 Plugin: sticker

#### Command Name: sticker
- **Name:** /sticker (Aliases: sendsticker, getstick)
- **Description:** Summon a sticker from the global CDN directly into chat (Bypasses server slots).
- **Usage:** /sticker <name>  |  j sticker <name>
- **Options:**
  - `query` (String, Required) - The sticker name to search
- **Permission:** Everyone
- **Example:** `/sticker <name>`
- **Notes:** Sends a sticker from the Global CDN directly into chat (bypasses server sticker slots).

#### Command Name: stickeradd
- **Name:** /stickeradd (Aliases: stickerget, getsticker)
- **Description:** Summon a specific sticker from the Global Vault to your server.
- **Usage:** /stickeradd <name>  |  j sticker add <name>
- **Options:**
  - `stickername` (String, Required) - Exact name of the sticker to download
- **Permission:** Everyone
- **Example:** `/stickeradd <name>`
- **Notes:** Copies a sticker from the Global Vault into your server.

#### Command Name: stickerbank
- **Name:** /stickerbank (Aliases: stickerlist, stickers)
- **Description:** View the Global Sticker Bank list.
- **Usage:** /stickerbank  |  j sticker bank
- **Options:** None
- **Permission:** Everyone
- **Example:** `/stickerbank`
- **Notes:** Shows a text list of all stickers in the Global Vault.

#### Command Name: stickerbrowse
- **Name:** /stickerbrowse (Aliases: stickervault, browsesticker)
- **Description:** Browse the visual interface of the Global Sticker Vault.
- **Usage:** /stickerbrowse  |  j sticker browse
- **Options:** None
- **Permission:** Everyone
- **Example:** `/stickerbrowse`
- **Notes:** Opens a visual paginated browser for the Global Sticker Vault.

#### Command Name: stickerremove
- **Name:** /stickerremove (Aliases: stickerdel, delsticker)
- **Description:** Remove a sticker from the global vault.
- **Usage:** /stickerremove <name>  |  j sticker remove <name>
- **Options:**
  - `stickername` (String, Required) - Name of the sticker to delete
- **Permission:** Everyone
- **Example:** `/stickerremove <name>`
- **Notes:** Removes a sticker from the Global Vault permanently.

---

### 🔹 Plugin: teamup

#### Command Name: createteam
- **Name:** /createteam (Aliases: teamcreate)
- **Description:** Create a new team for gaming or esports.
- **Usage:** j createteam
- **Options:** None
- **Permission:** Everyone
- **Example:** `j createteam`
- **Notes:** None

#### Command Name: deleteteam
- **Name:** /deleteteam (Aliases: disbandteam, teamdelete)
- **Description:** Disband and delete your current team.
- **Usage:** j deleteteam
- **Options:** None
- **Permission:** Everyone
- **Example:** `j deleteteam`
- **Notes:** None

#### Command Name: leaveteam
- **Name:** /leaveteam (Aliases: teamleave)
- **Description:** Leave your current team.
- **Usage:** j leaveteam
- **Options:** None
- **Permission:** Everyone
- **Example:** `j leaveteam`
- **Notes:** None

---

### 🔹 Plugin: tickets

#### Command Name: ticketpanel
- **Name:** /ticketpanel (Aliases: ticket, tickets)
- **Description:** Create the advanced ticket panel with category selection
- **Usage:** /ticketpanel
- **Options:** None
- **Permission:** Administrator
- **Example:** `/ticketpanel`
- **Notes:** None

---

### 🔹 Plugin: utility

#### Command Name: afk
- **Name:** /afk (Aliases: away, setafk)
- **Description:** Set yourself as AFK
- **Usage:** j afk [reason]
- **Options:** None
- **Permission:** Everyone
- **Example:** `j afk [reason]`
- **Notes:** Marks you as AFK. Bot will mention others when they ping you.

#### Command Name: avatar
- **Name:** /avatar (Aliases: av, pfp, icon)
- **Description:** Show a user's avatar
- **Usage:** j avatar [@user]
- **Options:** None
- **Permission:** Everyone
- **Example:** `j avatar [@user]`
- **Notes:** Displays the full-size avatar of yourself or another user.

#### Command Name: help
- **Name:** /help (Aliases: h, commands, cmds)
- **Description:** View the interactive help menu with all available commands.
- **Usage:** /help [mode] | j help [admin]
- **Options:**
  - `mode` (String, Optional) - Select User or Admin mode
- **Permission:** Everyone
- **Example:** `/help [mode]`
- **Notes:** Displays a fully dynamic UI-based help system separating user and admin commands.

#### Command Name: memberlist
- **Name:** /memberlist (Aliases: members, ml, memberroles)
- **Description:** List all server members with their roles
- **Usage:** /memberlist  |  j memberlist
- **Options:**
  - `role` (String, Optional) - Filter members by a specific role (mention or name)
- **Permission:** Everyone
- **Example:** `/memberlist`
- **Notes:** Shows all server members with username, display name, nickname, user ID, and assigned roles — paginated.

#### Command Name: ping
- **Name:** /ping (Aliases: latency, pong)
- **Description:** Check bot latency
- **Usage:** /ping  |  j ping
- **Options:** None
- **Permission:** Everyone
- **Example:** `/ping`
- **Notes:** Shows the bot's current latency to the Discord API.

#### Command Name: poll
- **Name:** /poll (Aliases: vote, yesno)
- **Description:** Create a Yes/No poll
- **Usage:** /poll <question>  |  j poll <question>
- **Options:**
  - `question` (String, Required) - Poll question
- **Permission:** Everyone
- **Example:** `/poll <question>`
- **Notes:** Creates a Yes/No poll embed with reaction buttons.

#### Command Name: prefixtest
- **Name:** /prefixtest (Aliases: testprefix, prefix)
- **Description:** Test prefix system
- **Usage:** j prefixtest
- **Options:** None
- **Permission:** Everyone
- **Example:** `j prefixtest`
- **Notes:** Tests that the prefix system is working correctly.

#### Command Name: serverinfo
- **Name:** /serverinfo (Aliases: si, server, guildinfo)
- **Description:** Show information about the server
- **Usage:** j serverinfo
- **Options:** None
- **Permission:** Everyone
- **Example:** `j serverinfo`
- **Notes:** Shows detailed info about the server: owner, member count, channels, boosts, etc.

#### Command Name: steal
- **Name:** /steal (Aliases: snatch, stealemoji)
- **Description:** Steal an emoji or sticker by replying to a message and store it globally.
- **Usage:** j steal (reply to a message with emoji/sticker)
- **Options:** None
- **Permission:** Everyone
- **Example:** `j steal (reply to a message with emoji/sticker)`
- **Notes:** Steals an emoji or sticker from a replied message and stores it in the Global Vault.

#### Command Name: userinfo
- **Name:** /userinfo (Aliases: ui, whois, user)
- **Description:** Get information about a user
- **Usage:** j userinfo [@user]
- **Options:** None
- **Permission:** Everyone
- **Example:** `j userinfo [@user]`
- **Notes:** Shows detailed info about a user: roles, join date, creation date, etc.

---

## 3. ADMIN COMMANDS (IMPORTANT)

- **/achievement** - Manually edit a player's achievements (Owner Only) *(Plugin: admin)*
- **/announce** - Create a beautiful announcement in any channel *(Plugin: admin)*
- **/disable** - Disable a command category in a channel or server-wide *(Plugin: admin)*
- **/enable** - Enable a command category in a channel or server-wide *(Plugin: admin)*
- **/setai** - Sets the smart AI channel for the server *(Plugin: admin)*
- **/setfoster** - Set the Foster Program channel *(Plugin: admin)*
- **/setlog** - Set the moderation log channel *(Plugin: admin)*
- **/setup** - Setup the permanent admin guide dashboard *(Plugin: admin)*
- **/setupgreeting** - Configure channels for welcome and goodbye messages. *(Plugin: greeting)*
- **/addxp** - Add XP to a user *(Plugin: leveling)*
- **/removexp** - Remove XP from a user *(Plugin: leveling)*
- **/xpresetweekly** - Reset weekly XP for EVERYONE in the server *(Plugin: leveling)*
- **/resetxp** - Reset all XP for a user *(Plugin: leveling)*
- **/resetxpall** - Reset ALL XP for EVERYONE in the server *(Plugin: leveling)*
- **/setlevel** - Set Level for a user *(Plugin: leveling)*
- **/setxp** - Set XP for a user *(Plugin: leveling)*
- **/sayit** - Resends a replied-to message through the bot and deletes the original. *(Plugin: say)*
- **/setup-control-panel** - Initializes the admin control panel in the designated channel. *(Plugin: server-overview)*
- **/setup-overview** - Initializes the server overview in the designated channel. *(Plugin: server-overview)*
- **/ticketpanel** - Create the advanced ticket panel with category selection *(Plugin: tickets)*

---

## 4. USER COMMANDS

- **/regstatus** - Audit clan member registration status *(Plugin: audit)*
- **/card** - Card database management commands *(Plugin: card-database)*
- **/hud** - Access your Celestial HUD (Live Status) *(Plugin: celestial-hud)*
- **/clanroster** - View the full clan player roster *(Plugin: clan)*
- **/deleteplayer** - Delete a player's clan profile *(Plugin: clan)*
- **/editprofile** - Edit your BGMI player profile *(Plugin: clan)*
- **/ign** - View a player's in-game name *(Plugin: clan)*
- **/ignall** - View a list of all player IGNs in the database (Admin Only) *(Plugin: clan)*
- **/profile** - Show BGMI player profile *(Plugin: clan)*
- **/profilecreate** - Create an unlinked BGMI player profile (Admin Only) *(Plugin: clan)*
- **/profiletransfer** - Link an unlinked profile to a Discord user (Admin Only) *(Plugin: clan)*
- **/register** - Register your BGMI player profile *(Plugin: clan)*
- **/uid** - View a player's BGMI UID *(Plugin: clan)*
- **/unlinked** - View all unlinked player profiles (Admin Only) *(Plugin: clan)*
- **/bp** - Submit your daily battle contribution points *(Plugin: clan-battle)*
- **/editbp** - Edit a player's today battle points *(Plugin: clan-battle)*
- **/edittotalbp** - Edit a player's total battle points *(Plugin: clan-battle)*
- **/emojiadd** - Summon a specific emoji from the Global Vault to your server. *(Plugin: emoji)*
- **/emojibank** - View the Global Emoji Bank list. *(Plugin: emoji)*
- **/emojibrowse** - Browse the visual interface of the Global Emoji Vault. *(Plugin: emoji)*
- **/emojicleanup** - Scans for server emojis unused in the CDN for 30+ days. *(Plugin: emoji)*
- **/emojiremove** - Remove an emoji from the global vault. *(Plugin: emoji)*
- **/emoji** - Summon an emoji from the global CDN directly into chat. *(Plugin: emoji)*
- **/emojislots** - Check the current server emoji and sticker slot usage. *(Plugin: emoji)*
- **/emojitemp** - Temporarily install a global emoji for 10 minutes to save slots. *(Plugin: emoji)*
- **/fs-pairremove** - Remove a pair from the active Foster Program *(Plugin: foster-program)*
- **/fs-replace** - Replace a mentor or newbie in an active Foster Program pair *(Plugin: foster-program)*
- **/fs-start** - Start the Foster Program v2 (Staff Only) *(Plugin: foster-program)*
- **/action** - Perform a fun action (hug, slap, kiss, etc.) *(Plugin: fun)*
- **/tictactoe** - Challenge another user to a game of TicTacToe *(Plugin: games)*
- **/tttlb** - View the TicTacToe leaderboard *(Plugin: games)*
- **/leaderboard** - View the server XP leaderboard *(Plugin: leveling)*
- **/rank** - Show your or another user's rank card *(Plugin: leveling)*
- **/rankbackground** - Set your custom rank card background *(Plugin: leveling)*
- **/cancelpop** - Cancel your active POP market listing *(Plugin: market)*
- **/popmarket** - Force refresh the POP marketplace panel *(Plugin: market)*
- **/sell** - List your POP for sale on the marketplace *(Plugin: market)*
- **/addrole** - Add a role to a user *(Plugin: moderation)*
- **/ban** - Ban a member from the server *(Plugin: moderation)*
- **/clear** - Delete multiple messages from a channel *(Plugin: moderation)*
- **/clearall** - Delete all messages in the channel (Nuke) *(Plugin: moderation)*
- **/clearwarns** - Clear all warnings from a user *(Plugin: moderation)*
- **/kick** - Kick a member from the server *(Plugin: moderation)*
- **/lock** - Lock the current channel *(Plugin: moderation)*
- **/mute** - Timeout a member for a specified duration *(Plugin: moderation)*
- **/nickname** - Change a user's nickname *(Plugin: moderation)*
- **/removerole** - Remove a role from a user *(Plugin: moderation)*
- **/unban** - Unban a user from the server *(Plugin: moderation)*
- **/unlock** - Unlock the current channel *(Plugin: moderation)*
- **/unmute** - Remove timeout from a member *(Plugin: moderation)*
- **/unwarn** - Remove a warning from a user *(Plugin: moderation)*
- **/warn** - Warn a user with a reason *(Plugin: moderation)*
- **/warnings** - View warnings for a user *(Plugin: moderation)*
- **/packadd** - Add an existing global emoji to an Emoji Pack *(Plugin: packs)*
- **/packcreate** - Create an empty Emoji Pack in the Global Vault *(Plugin: packs)*
- **/packimport** - Download a full Global Emoji Pack into your server automatically. *(Plugin: packs)*
- **/packremove** - Remove an emoji from its Emoji Pack *(Plugin: packs)*
- **/prefix** - Manage the bot's custom prefix for this server. *(Plugin: prefix)*
- **/record** - Manage voice recordings *(Plugin: recorder)*
- **/rradd** - Add a Role option to a Reaction Role Panel *(Plugin: roles)*
- **/rrcreate** - Create a new Reaction Role Custom Panel *(Plugin: roles)*
- **/rrdelete** - Delete an active Reaction Role Panel permanently *(Plugin: roles)*
- **/rrremove** - Remove a Role option from a Reaction Role Panel *(Plugin: roles)*
- **/se** - Set season energy for a user (Admin) *(Plugin: seasonal-synergy)*
- **/synergy-setup** - Deploy the Synergy Automation Panel to the moderation channel *(Plugin: seasonal-synergy)*
- **/we** - Submit your weekly energy points *(Plugin: seasonal-synergy)*
- **/stickeradd** - Summon a specific sticker from the Global Vault to your server. *(Plugin: sticker)*
- **/stickerbank** - View the Global Sticker Bank list. *(Plugin: sticker)*
- **/stickerbrowse** - Browse the visual interface of the Global Sticker Vault. *(Plugin: sticker)*
- **/stickerremove** - Remove a sticker from the global vault. *(Plugin: sticker)*
- **/sticker** - Summon a sticker from the global CDN directly into chat (Bypasses server slots). *(Plugin: sticker)*
- **/createteam** - Create a new team for gaming or esports. *(Plugin: teamup)*
- **/deleteteam** - Disband and delete your current team. *(Plugin: teamup)*
- **/leaveteam** - Leave your current team. *(Plugin: teamup)*
- **/afk** - Set yourself as AFK *(Plugin: utility)*
- **/avatar** - Show a user's avatar *(Plugin: utility)*
- **/help** - View the interactive help menu with all available commands. *(Plugin: utility)*
- **/memberlist** - List all server members with their roles *(Plugin: utility)*
- **/ping** - Check bot latency *(Plugin: utility)*
- **/poll** - Create a Yes/No poll *(Plugin: utility)*
- **/prefixtest** - Test prefix system *(Plugin: utility)*
- **/serverinfo** - Show information about the server *(Plugin: utility)*
- **/steal** - Steal an emoji or sticker by replying to a message and store it globally. *(Plugin: utility)*
- **/userinfo** - Get information about a user *(Plugin: utility)*

---

## 5. SYSTEM COMMANDS

- **/achievement** - Manually edit a player's achievements (Owner Only) *(Requires: Administrator)*
- **/announce** - Create a beautiful announcement in any channel *(Requires: Administrator)*
- **/disable** - Disable a command category in a channel or server-wide *(Requires: Administrator)*
- **/enable** - Enable a command category in a channel or server-wide *(Requires: Administrator)*
- **/setai** - Sets the smart AI channel for the server *(Requires: Administrator)*
- **/setfoster** - Set the Foster Program channel *(Requires: Administrator)*
- **/setlog** - Set the moderation log channel *(Requires: Administrator)*
- **/setup** - Setup the permanent admin guide dashboard *(Requires: Administrator)*

---
