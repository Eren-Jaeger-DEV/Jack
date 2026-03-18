/**
 * patch_aliases.js
 * 
 * Reads all plugin command files and injects:
 *   aliases: [...],
 *   usage: '...',
 *   details: '...',
 * 
 * Run once with: node scripts/patch_aliases.js
 */

const fs = require('fs');
const path = require('path');

// ─── PATCH DEFINITIONS ───────────────────────────────────────────────────────
// Keyed by command `name` value. Only patches files missing these fields already.

const PATCHES = {

  // ── ADMIN ──
  announce: {
    aliases: ['ann'],
    usage: '/announce  |  j announce',
    details: 'Sends a styled announcement embed to any channel you choose.'
  },
  disable: {
    aliases: ['cmdoff', 'disablecmd'],
    usage: '/disable  |  j disable',
    details: 'Disables a command category in a specific channel or server-wide.'
  },
  enable: {
    aliases: ['cmdon', 'enablecmd'],
    usage: '/enable  |  j enable',
    details: 'Re-enables a previously disabled command category.'
  },
  serveroverview: {
    aliases: ['overview', 'sov'],
    usage: '/serveroverview  |  j serveroverview',
    details: 'Creates or refreshes a pinned server overview info panel in a channel.'
  },
  setlog: {
    aliases: ['modlog', 'setmodlog'],
    usage: '/setlog  |  j setlog',
    details: 'Sets the channel where moderation actions are logged.'
  },
  setup: {
    aliases: ['adminsetup', 'adminguide'],
    usage: '/setup  |  j setup',
    details: 'Posts the permanent admin guide dashboard to a channel.'
  },
  ticketpanel: {
    aliases: ['ticket', 'tickets'],
    usage: '/ticketpanel  |  j ticketpanel',
    details: 'Creates the ticket creation panel in the designated channel.'
  },

  // ── CLAN ──
  addsyn: {
    aliases: ['syn+', 'addsynergy'],
    usage: '/addsyn @user <points>  |  j addsyn @user <points>',
    details: 'Adds synergy points to a registered clan player.'
  },
  clanroster: {
    aliases: ['roster', 'players'],
    usage: '/clanroster  |  j clanroster',
    details: 'Shows the full registered clan member list with IGN, UID, and synergy.'
  },
  deleteplayer: {
    aliases: ['delplayer', 'removeplayer'],
    usage: '/deleteplayer @user  |  j deleteplayer @user',
    details: 'Permanently removes a player\'s clan profile from the database.'
  },
  editprofile: {
    aliases: ['editp', 'updateprofile'],
    usage: '/editprofile  |  j editprofile',
    details: 'Edit your own BGMI player profile (IGN, UID, level, mode preferences).'
  },
  ign: {
    aliases: ['gamename', 'ingamename'],
    usage: '/ign @user  |  j ign @user',
    details: 'Displays the in-game name of a registered player.'
  },
  minussyn: {
    aliases: ['syn-', 'removesynergy', 'rmsyn'],
    usage: '/minussyn @user <points>  |  j minussyn @user <points>',
    details: 'Deducts synergy points from a registered clan player.'
  },
  mysynergy: {
    aliases: ['mysyn', 'mypoints'],
    usage: '/mysynergy  |  j mysynergy',
    details: 'Shows your current synergy and how many points you need to pass the next player.'
  },
  profile: {
    aliases: ['p', 'playerprofile'],
    usage: '/profile [@user]  |  j profile [@user]',
    details: 'Shows a player\'s full BGMI profile card including IGN, UID, synergy, and level.'
  },
  register: {
    aliases: ['reg', 'joinroster'],
    usage: '/register  |  j register',
    details: 'Registers your BGMI player profile (IGN, UID, level, preferred modes).'
  },
  resetseason: {
    aliases: ['seasonreset', 'rseasn'],
    usage: '/resetseason  |  j resetseason',
    details: 'Admin: Resets season and weekly synergy for ALL clan players.'
  },
  resetweekly: {
    aliases: ['weekreset', 'rweekly'],
    usage: '/resetweekly  |  j resetweekly',
    details: 'Admin: Resets weekly synergy for all players and assigns the Weekly MVP role.'
  },
  topseason: {
    aliases: ['seasonlb', 'seasonboard'],
    usage: '/topseason  |  j topseason',
    details: 'Displays the season synergy leaderboard for all registered players.'
  },
  topweekly: {
    aliases: ['weeklylb', 'weeklyboard'],
    usage: '/topweekly  |  j topweekly',
    details: 'Displays the weekly synergy leaderboard for all registered players.'
  },
  uid: {
    aliases: ['playeruid', 'bgmiuid'],
    usage: '/uid @user  |  j uid @user',
    details: 'Shows the BGMI UID of a registered player.'
  },

  // ── EMOJI ──
  emojiadd: {
    aliases: ['emojiget', 'getmoji'],
    usage: '/emojiadd <name>  |  j emoji add <name>',
    details: 'Summons a specific emoji from the Global Vault into your server.'
  },
  emojibank: {
    aliases: ['emojilist', 'mojis'],
    usage: '/emojibank  |  j emoji bank',
    details: 'Shows a text list of all emojis stored in the Global Vault.'
  },
  emojibrowse: {
    aliases: ['emojivault', 'browsemoji'],
    usage: '/emojibrowse  |  j emoji browse',
    details: 'Opens a visual paginated browser for the Global Emoji Vault.'
  },
  emojicleanup: {
    aliases: ['mojiscan', 'emojiscan'],
    usage: '/emojicleanup  |  j emoji cleanup',
    details: 'Scans for server emojis unused in the CDN for 30+ days to free up slots.'
  },
  emojiremove: {
    aliases: ['emojidel', 'delmoji'],
    usage: '/emojiremove <name>  |  j emoji remove <name>',
    details: 'Removes a specific emoji from the Global Vault permanently.'
  },
  emoji: {
    aliases: ['moji', 'sendemoji'],
    usage: '/emoji <name>  |  j emoji <name>',
    details: 'Summons any emoji from the Global CDN directly into chat as a large image.'
  },
  emojislots: {
    aliases: ['slots', 'emojicap'],
    usage: '/emojislots  |  j emoji slots',
    details: 'Shows current emoji and sticker slot usage for the server.'
  },
  emojitemp: {
    aliases: ['tempemoji', 'borrowmoji'],
    usage: '/emojitemp <name>  |  j emoji temp <name>',
    details: 'Temporarily installs a global emoji for 10 minutes to save permanent slots.'
  },

  // ── FUN ──
  action: {
    aliases: ['do', 'react'],
    usage: '/action <type> [@user]  |  j action <type> [@user]',
    details: 'Performs a fun animated action: hug, slap, kiss, poke, pat, and more.'
  },

  // ── LEVELING ──
  addxp: {
    aliases: ['xp+', 'givexp'],
    usage: '/addxp @user <amount>  |  j addxp @user <amount>',
    details: 'Admin: Adds XP directly to a user\'s level progress.'
  },
  removexp: {
    aliases: ['xp-', 'takexp'],
    usage: '/removexp @user <amount>  |  j removexp @user <amount>',
    details: 'Admin: Removes XP from a user\'s level progress.'
  },
  xpresetweekly: {
    aliases: ['xpweeklyreset', 'clearweeklyxp'],
    usage: '/xpresetweekly  |  j xpresetweekly',
    details: 'Admin: Resets weekly XP for every member in the server.'
  },
  resetxp: {
    aliases: ['clearxp', 'xpreset'],
    usage: '/resetxp @user  |  j resetxp @user',
    details: 'Admin: Fully resets all XP for a specific user.'
  },
  resetxpall: {
    aliases: ['wipelevels', 'clearallxp'],
    usage: '/resetxpall  |  j resetxpall',
    details: 'Admin: Wipes XP for ALL members server-wide. Irreversible.'
  },
  setlevel: {
    aliases: ['lvlset', 'forcelvl'],
    usage: '/setlevel @user <level>  |  j setlevel @user <level>',
    details: 'Admin: Forces a user to a specific level directly.'
  },
  setxp: {
    aliases: ['xpset', 'forcexp'],
    usage: '/setxp @user <amount>  |  j setxp @user <amount>',
    details: 'Admin: Sets a user\'s total XP to an exact amount.'
  },
  leaderboard: {
    aliases: ['lb', 'top', 'levels'],
    usage: '/leaderboard  |  j leaderboard',
    details: 'Shows the top XP leaderboard for the server, sorted by level and XP.'
  },
  rank: {
    aliases: ['level', 'xp'],
    usage: '/rank [@user]  |  j rank [@user]',
    details: 'Displays your (or another user\'s) rank card with level, XP bar, and position.'
  },
  rankbackground: {
    aliases: ['rankbg', 'setbg'],
    usage: '/rankbackground  |  j rankbackground',
    details: 'Set a custom background image for your personal rank card.'
  },

  // ── MARKET ──
  cancelpop: {
    aliases: ['popcancel', 'unsell'],
    usage: '/cancelpop  |  j pop cancel',
    details: 'Cancels your active POP listing from the marketplace.'
  },
  popmarket: {
    aliases: ['market', 'marketplace'],
    usage: '/popmarket  |  j pop market',
    details: 'Force-refreshes the POP marketplace panel in the designated channel.'
  },
  sell: {
    aliases: ['sellpop', 'listpop'],
    usage: '/sell  |  j sell pop',
    details: 'Lists your POP for sale on the server marketplace.'
  },

  // ── MODERATION ──
  addrole: {
    aliases: ['ar', 'giverole', 'roleadd'],
    usage: '/addrole @user @role  |  j addrole @user @role',
    details: 'Assigns a role to a member.'
  },
  ban: {
    aliases: ['banish'],
    usage: '/ban @user [reason]  |  j ban @user [reason]',
    details: 'Permanently bans a member from the server with an optional reason.'
  },
  clear: {
    aliases: ['purge', 'delete', 'clean'],
    usage: '/clear <amount>  |  j clear <amount>',
    details: 'Bulk-deletes up to 100 messages in the current channel.'
  },
  clearall: {
    aliases: ['nuke', 'clearall'],
    usage: '/clearall  |  j clearall',
    details: 'Deletes ALL messages in the channel by cloning and deleting it.'
  },
  clearwarns: {
    aliases: ['warnsclear', 'clearwarnings'],
    usage: '/clearwarns @user  |  j clearwarns @user',
    details: 'Clears all warnings from a user\'s record.'
  },
  kick: {
    aliases: ['boot', 'remove'],
    usage: '/kick @user [reason]  |  j kick @user [reason]',
    details: 'Kicks a member from the server.'
  },
  lock: {
    aliases: ['lockdown', 'lockchannel'],
    usage: '/lock  |  j lock',
    details: 'Locks the current channel so members cannot send messages.'
  },
  mute: {
    aliases: ['timeout', 'silence', 'shutup'],
    usage: '/mute @user <duration> [reason]  |  j mute @user <duration> [reason]',
    details: 'Times out a member for a specified duration (e.g. 10m, 1h, 1d).'
  },
  nickname: {
    aliases: ['nick', 'setnick', 'rename'],
    usage: '/nickname @user <name>  |  j nickname @user <name>',
    details: 'Changes a member\'s server nickname.'
  },
  removerole: {
    aliases: ['rr-role', 'takerole', 'roledel'],
    usage: '/removerole @user @role  |  j removerole @user @role',
    details: 'Removes a role from a member.'
  },
  unban: {
    aliases: ['pardon', 'forgive'],
    usage: '/unban <userId>  |  j unban <userId>',
    details: 'Unbans a user by their Discord ID.'
  },
  unlock: {
    aliases: ['unlockchannel', 'open'],
    usage: '/unlock  |  j unlock',
    details: 'Unlocks a previously locked channel so members can speak again.'
  },
  unmute: {
    aliases: ['untimeout', 'unsilence'],
    usage: '/unmute @user  |  j unmute @user',
    details: 'Removes a timeout from a member early.'
  },
  unwarn: {
    aliases: ['removewarn', 'warnremove'],
    usage: '/unwarn @user <warnId>  |  j unwarn @user <warnId>',
    details: 'Removes a specific warning from a user\'s record by warn ID.'
  },
  warn: {
    aliases: ['strike', 'warning'],
    usage: '/warn @user <reason>  |  j warn @user <reason>',
    details: 'Issues a formal warning to a member and stores it in the database.'
  },
  warnings: {
    aliases: ['warns', 'checkwarns'],
    usage: '/warnings @user  |  j warnings @user',
    details: 'Shows all recorded warnings for a member.'
  },

  // ── PACKS ──
  packadd: {
    aliases: ['addpack', 'packemoji'],
    usage: '/packadd <packName> <emojiName>  |  j pack add <packName> <emojiName>',
    details: 'Adds an existing Global Vault emoji to an emoji pack.'
  },
  packcreate: {
    aliases: ['newpack', 'createpack'],
    usage: '/packcreate <name>  |  j pack create <name>',
    details: 'Creates a new empty Emoji Pack in the Global Vault.'
  },
  packimport: {
    aliases: ['importpack', 'downloadpack'],
    usage: '/packimport <packName>  |  j pack import <packName>',
    details: 'Downloads a full emoji pack into your server, filling available emoji slots.'
  },
  packremove: {
    aliases: ['removepack', 'packdelete'],
    usage: '/packremove <packName> <emojiName>  |  j pack remove <packName> <emojiName>',
    details: 'Removes an emoji from an emoji pack.'
  },

  // ── ROLES ──
  rradd: {
    aliases: ['addreactionrole', 'rr-add'],
    usage: '/rradd  |  j rr add',
    details: 'Adds a new role option button to an existing Reaction Role Panel.'
  },
  rrcreate: {
    aliases: ['createreactionrole', 'rr-create', 'newrr'],
    usage: '/rrcreate  |  j rr create',
    details: 'Creates a new custom Reaction Role panel with buttons in the channel.'
  },
  rrdelete: {
    aliases: ['deletereactionrole', 'rr-delete', 'delrr'],
    usage: '/rrdelete  |  j rr delete',
    details: 'Permanently deletes an existing Reaction Role Panel.'
  },
  rrremove: {
    aliases: ['removereactionrole', 'rr-remove'],
    usage: '/rrremove  |  j rr remove',
    details: 'Removes a specific role button from a Reaction Role Panel.'
  },

  // ── STICKER ──
  stickeradd: {
    aliases: ['stickerget', 'getsticker'],
    usage: '/stickeradd <name>  |  j sticker add <name>',
    details: 'Copies a sticker from the Global Vault into your server.'
  },
  stickerbank: {
    aliases: ['stickerlist', 'stickers'],
    usage: '/stickerbank  |  j sticker bank',
    details: 'Shows a text list of all stickers in the Global Vault.'
  },
  stickerbrowse: {
    aliases: ['stickervault', 'browsesticker'],
    usage: '/stickerbrowse  |  j sticker browse',
    details: 'Opens a visual paginated browser for the Global Sticker Vault.'
  },
  stickerremove: {
    aliases: ['stickerdel', 'delsticker'],
    usage: '/stickerremove <name>  |  j sticker remove <name>',
    details: 'Removes a sticker from the Global Vault permanently.'
  },
  sticker: {
    aliases: ['sendsticker', 'getstick'],
    usage: '/sticker <name>  |  j sticker <name>',
    details: 'Sends a sticker from the Global CDN directly into chat (bypasses server sticker slots).'
  },

  // ── UTILITY ──
  afk: {
    aliases: ['away', 'setafk'],
    usage: '/afk [reason]  |  j afk [reason]',
    details: 'Marks you as AFK. Bot will mention others when they ping you.'
  },
  avatar: {
    aliases: ['av', 'pfp', 'icon'],
    usage: '/avatar [@user]  |  j avatar [@user]',
    details: 'Displays the full-size avatar of yourself or another user.'
  },
  ping: {
    aliases: ['latency', 'pong'],
    usage: '/ping  |  j ping',
    details: 'Shows the bot\'s current latency to the Discord API.'
  },
  poll: {
    aliases: ['vote', 'yesno'],
    usage: '/poll <question>  |  j poll <question>',
    details: 'Creates a Yes/No poll embed with reaction buttons.'
  },
  prefixtest: {
    aliases: ['testprefix', 'prefix'],
    usage: '/prefixtest  |  j prefixtest',
    details: 'Tests that the prefix system is working correctly.'
  },
  serverinfo: {
    aliases: ['si', 'server', 'guildinfo'],
    usage: '/serverinfo  |  j serverinfo',
    details: 'Shows detailed info about the server: owner, member count, channels, boosts, etc.'
  },
  steal: {
    aliases: ['snatch', 'stealemoji'],
    usage: '/steal (reply to a message with emoji/sticker)  |  j steal',
    details: 'Steals an emoji or sticker from a replied message and stores it in the Global Vault.'
  },
  userinfo: {
    aliases: ['ui', 'whois', 'user'],
    usage: '/userinfo [@user]  |  j userinfo [@user]',
    details: 'Shows detailed info about a user: roles, join date, creation date, etc.'
  },
};

// ─── PATCHER ──────────────────────────────────────────────────────────────────

const pluginsPath = path.join(__dirname, '../plugins');
let patchedCount = 0;
let skippedCount = 0;

function patchFile(filePath) {
  let src = fs.readFileSync(filePath, 'utf-8');

  // Find the command name in the file
  const nameMatch = src.match(/name:\s*["']([^"']+)["']/);
  if (!nameMatch) return;
  const cmdName = nameMatch[1];

  const patch = PATCHES[cmdName];
  if (!patch) return; // No patch defined for this command

  // Skip if all 3 fields already present
  if (src.includes('aliases:') && src.includes('usage:') && src.includes('details:')) {
    skippedCount++;
    return;
  }

  // Build injection string
  const aliasStr = JSON.stringify(patch.aliases);
  const injection = `  aliases: ${aliasStr},\n  usage: '${patch.usage}',\n  details: '${patch.details}',\n`;

  // Inject after the `description:` line
  const descMatch = src.match(/(  description:\s*["'][^"']*["'],?\n)/);
  if (!descMatch) {
    console.warn(`  ⚠ Could not find description line in: ${filePath}`);
    return;
  }

  const insertAfter = descMatch[0];
  const alreadyHasMeta = src.includes('aliases:');
  if (!alreadyHasMeta) {
    src = src.replace(insertAfter, insertAfter + injection);
    fs.writeFileSync(filePath, src, 'utf-8');
    console.log(`  ✅ Patched: ${cmdName} (${path.relative(pluginsPath, filePath)})`);  
    patchedCount++;
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      walkDir(full);
    } else if (entry.endsWith('.js')) {
      patchFile(full);
    }
  }
}

// Walk every plugin's commands directory
const pluginFolders = fs.readdirSync(pluginsPath).filter(f =>
  fs.statSync(path.join(pluginsPath, f)).isDirectory()
);

for (const folder of pluginFolders) {
  const cmdDir = path.join(pluginsPath, folder, 'commands');
  console.log(`\n📦 Patching plugin: ${folder}`);
  walkDir(cmdDir);
}

console.log(`\n✅ Done. Patched: ${patchedCount}, Skipped (already had meta): ${skippedCount}`);
