/**
 * messageCreate.js — Foster Program Thread-Based Submission
 *
 * NEW SIMPLE SYSTEM:
 *  No commands. Users just post in the submission thread:
 *
 *    "initial 450"   ←  type keyword + points number
 *    [screenshot]    ←  "All Data" stats card attached
 *
 *  Jack automatically verifies with AI, records the submission,
 *  and awards points when both partners post the same value.
 */

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fosterService = require('../services/fosterService');
const aiService     = require('../../../bot/utils/aiService');
const configManager = require('../../../bot/utils/configManager');
const logger        = require('../../../utils/logger');

module.exports = async (client, message) => {
  if (message.author.bot || !message.guild) return;

  // V2 TRIGGER: Admin Announcement Detection
  const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator);
  const content = message.content.trim().toLowerCase();

  // Debug trigger
  if (content.includes('foster program starts') || content === 'h manual' || content === 'h refresh') {
    logger.info("FosterV2", `Potential trigger from ${message.author.tag} | Admin: ${isAdmin} | Channel: ${message.channel.id}`);
  }

  if (isAdmin && (content.includes('foster program starts') || content === 'h manual' || content === 'h refresh')) {
    const config = await configManager.getGuildConfig(message.guild.id);
    if (message.channel.id === config?.settings?.fosterChannelId || content === 'h manual' || content === 'h refresh') {
      if (content === 'h refresh') {
        const program = await fosterService.getActiveProgram(message.guild.id).catch(() => null);
        if (program) {
          await fosterService.refreshLeaderboard(client, program);
          await message.react('✅');
        }
        return;
      }
      await fosterService.sendStartConfirmation(message);
      return;
    }
  }

  const program = await fosterService.getActiveProgram(message.guild.id).catch(() => null);
  if (!program) return;

  /* ────────────────────────────────────────────────
   *  ACTIVE PHASE: Thread-only submission capture
   * ──────────────────────────────────────────────── */
  if (program.status === 'ACTIVE' || program.status === 'PAIRING_VERIFICATION') {
    // Only process messages in the designated submission thread
    if (program.submissionThreadId && message.channel.id === program.submissionThreadId) {
      await handleSubmission(client, message, program);
    }
    return;
  }

  /* ──────────────────────────────────────
   *  REGISTRATION PHASE: Thread sign-ups
   * ────────────────────────────────────── */
  if (program.status === 'REGISTRATION') {
    const threadId = message.channel.id;
    const reg      = program.registration;

    let roleType = null;
    if (threadId === reg.mentorThreadId)        roleType = 'MENTOR';
    else if (threadId === reg.neophyteThreadId) roleType = 'NEOPHYTE';
    else if (threadId === reg.veteranThreadId)  roleType = 'VETERAN';

    if (!roleType) return;

    try {
      // Process registration (IGN verification)
      await fosterService.processThreadRegistration(message, roleType);
    } catch (err) {
      logger.error("FosterProgram", `Thread registration error: ${err.message}`);
    }
  }

  /* ──────────────────────────────────────
   *  WILDCARD PHASE: Foster Channel
   * ────────────────────────────────────── */
  const config = await configManager.getGuildConfig(message.guild.id);
  if (program.status === 'REGISTRATION' && message.channel.id === config?.settings?.fosterChannelId) {
    const content = message.content.trim();
    if (content.length > 2 && !content.includes(' ')) {
      // Logic for wildcard entry
      await fosterService.processWildcardEntry(message);
    }
  }
};

/* ─────────────────────────────────────────────────────────────────
 *  HANDLER — processes a submission message in the stat card thread
 * ───────────────────────────────────────────────────────────────── */
100: async function handleSubmission(client, message, program) {
101:   const userId  = message.author.id;
102:   const content = message.content.trim().toLowerCase();
103: 
104:   /* ── 1. Must have an image attachment ── */
105:   const attachment = message.attachments.find(a =>
106:     a.contentType?.startsWith('image/') ||
107:     /\.(png|jpg|jpeg|webp|gif)$/i.test(a.name ?? '')
108:   );
109: 
110:   if (!attachment) {
111:     const warn = await message.reply('📎 **Jack:** Attach your **"All Data" stats card screenshot** (Current Season or ALL) to this message.');
112:     setTimeout(() => warn.delete().catch(() => {}), 8000);
113:     return;
114:   }
115: 
116:   /* ── 2. Determine Submission Type (initial/final) ── */
117:   // Priority: 1. Manual keyword, 2. Program status inference
118:   let type = content.includes('final') ? 'final' : (content.includes('initial') ? 'initial' : null);
119:   
120:   if (!type) {
121:     if (program.status === 'PAIRING_VERIFICATION') type = 'initial';
122:     else if (program.status === 'VERIFICATION_FINAL') type = 'final';
123:     else {
124:       return await message.reply('❓ **Jack:** I\'m not sure if this is your `initial` or `final` card. Please type the keyword with your image.');
125:     }
126:   }
127: 
128:   /* ── 3. Verify user is an active participant ── */
129:   const pix = program.pairs.findIndex(p => p.mentorId === userId || p.partnerId === userId);
130:   if (pix === -1) {
131:     const warn = await message.reply('❌ **Jack:** You are not listed in any active pair for this program.');
132:     setTimeout(() => warn.delete().catch(() => {}), 8000);
133:     return;
134:   }
135: 
136:   /* ── 4. Processing indicator ── */
137:   await message.react('🔍').catch(() => {});
138:   await message.channel.sendTyping().catch(() => {});
139: 
140:   /* ── 5. AI Screenshot Verification (Gemini Vision) ── */
141:   const aiResult = await aiService.extractSynergyPoints(attachment.url);
142:   await message.reactions.removeAll().catch(() => {});
143: 
144:   if (!aiResult || aiResult.points === 0) {
145:     return await message.reply(
146:       '🚫 **Jack:** Telemetry failed. Could not read your stats card.\n' +
147:       'Ensure the **"All Data"** window is open and the **"Team-up points earned"** number is visible.'
148:     );
149:   }
150: 
151:   const points = aiResult.points;
152:   const selection = aiResult.selection;
153: 
154:   // Optional: Log what we found
155:   logger.info("FosterSubmission", `User ${message.author.tag} submitted ${points} pts (Selection: ${selection}, Type: ${type})`);
156: 
157:   /* ── 6. Submit to the service (handles 50/50 pooling + DB save) ── */
158:   const freshProgram = await fosterService.getActiveProgram(message.guild.id);
159:   if (!freshProgram) return;
160: 
161:   const result = await fosterService.submitSynergyCard(
162:     userId,
163:     points,
164:     type,
165:     selection,
166:     attachment.url,
167:     freshProgram
168:   );
169: 
170:   if (!result.success) {
171:     return await message.reply(`❌ **Jack:** ${result.error}`);
172:   }
173: 
174:   /* ── 7. Respond based on match result ── */
175:   if (result.matched) {
176:     const embed = new EmbedBuilder().setTimestamp();
177: 
178:     if (type === 'initial') {
179:       embed
180:         .setTitle('✅ Baseline Synchronized')
181:         .setColor('#00FFCC')
182:         .setDescription(
183:           `Both partners' baselines are recorded.\n\n` +
184:           `> **Your Start:** \`${points}\`\n` +
185:           `> **Partner Start:** \`${result.partnerValue}\`\n\n` +
186:           `I will measure your combined growth in 5 days. Operation active. 🎯`
187:         )
188:         .setThumbnail(attachment.url);
189:     } else {
190:       embed
191:         .setTitle('🏆 Cycle Success — 50/50 Split Applied!')
192:         .setColor('#FFD700')
193:         .setDescription(
194:           `Final stats verified for both partners!\n\n` +
195:           `> **Combined Growth:** \`${result.totalGrowth}\` points\n` +
196:           `> **Shared Credit (50%):** \`${result.split}\` points each\n\n` +
197:           `Global Leaderboards updated. Excellent coordination. 📊`
198:         )
199:         .setThumbnail(attachment.url);
200: 
201:       await fosterService.refreshLeaderboard(client, freshProgram).catch(() => {});
202:     }
203: 
204:     await message.reply({ embeds: [embed] });
205:   } else {
206:     const pair = freshProgram.pairs[pix];
207:     const partnerId = pair.mentorId === userId ? pair.partnerId : pair.mentorId;
208: 
209:     await message.reply(
210:       `⏳ **Jack:** Data logged. I've recorded your **${type}** stats: **${points}** points (Category: ${selection}).\n\n` +
211:       `Waiting for your partner <@${partnerId}> to submit their card.`
212:     );
213:   }
214: }
