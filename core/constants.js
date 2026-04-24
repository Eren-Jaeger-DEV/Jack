/**
 * JACK SYSTEM CONSTANTS
 * Centralized IDs and configuration for core security.
 */

const OWNER_IDS = ["771611262022844427", "888337321869582367"];
const AI_SANDBOX_CHANNEL_ID = "1488453630184132729";
const MAIN_GUILD_ID = "1341978655437619250";

module.exports = {
  OWNER_IDS,
  AI_SANDBOX_CHANNEL_ID,
  MAIN_GUILD_ID,
  isOwner: (id) => OWNER_IDS.includes(id)
};
