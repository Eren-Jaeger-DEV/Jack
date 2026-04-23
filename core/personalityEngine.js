/**
 * PERSONALITY ENGINE (v2.0)
 * Deterministic and configurable identity management for Jack.
 */

function getBasePersonality() {
  return {
    identity: "strategic_system_manager",
    traits: ["controlled", "precise", "data-driven", "non-emotional", "authoritative"],
    rules: [
      "Never lose control",
      "Never act emotionally",
      "Prioritize accuracy over expression",
      "Be concise and intentional"
    ]
  };
}

function getRuntimeConfig(guildConfig) {
  // Try to read personality from GuildConfig. If absent, fallback to defaults.
  const defaultPreset = {
    tone: "calm",
    humor: 10,
    strictness: 60,
    verbosity: 40,
    respect_bias: 60
  };

  if (guildConfig && guildConfig.settings && guildConfig.settings.personality) {
    return { ...defaultPreset, ...guildConfig.settings.personality };
  }
  return defaultPreset;
}

function getContextModifiers(user, activityData, isOwner, reputation) {
  const modifiers = {
    strictness: 0,
    respect_bias: 0,
    verbosity: 0,
    humor: 0
  };

  // Rule 1: Low reputation -> higher strictness
  if (reputation < 0) {
    modifiers.strictness += 20;
  }
  
  // Rule 2: Very low reputation -> lower respect bias
  if (reputation < -20) {
    modifiers.respect_bias -= 30;
  }
  
  // Rule 3: Spam detected -> lower verbosity (spam represented by high failed actions)
  if (activityData && activityData.failedActions && activityData.failedActions > 5) {
    modifiers.verbosity -= 20;
  }

  // Rule 4: System owner interaction
  if (isOwner) {
    modifiers.strictness += 30;
    modifiers.verbosity -= 20;
  }
  
  // Rule 5: New user -> higher respect bias (assume new users have exactly 0 reputation and no history)
  if (reputation === 0 && (!activityData || !activityData.historyCount)) {
    modifiers.respect_bias += 20;
  }

  return modifiers;
}

function buildFinalPersonality(base, runtime, modifiers) {
  const clamp = (val) => Math.max(0, Math.min(100, val));

  return {
    ...base,
    tone: runtime.tone,
    humor: clamp(runtime.humor + modifiers.humor * 0.5),
    strictness: clamp(runtime.strictness + modifiers.strictness * 0.7),
    verbosity: clamp(runtime.verbosity + modifiers.verbosity * 0.5),
    respect_bias: clamp(runtime.respect_bias + modifiers.respect_bias * 0.7)
  };
}

function getBehaviorMode(input, intent, toolCall) {
  // Moderation tools check FIRST — before the generic toolCall gate
  if (toolCall && (toolCall.tool === "ban_member" || toolCall.tool === "kick_member") || intent === "moderate") {
    return "moderate";
  }

  if (toolCall || intent === "action") {
    return "execute";
  }
  
  if (input.toLowerCase().includes("stats") || input.toLowerCase().includes("data") || intent === "query") {
    return "analyze";
  }
  
  return "assist";
}

module.exports = {
  getBasePersonality,
  getRuntimeConfig,
  getContextModifiers,
  buildFinalPersonality,
  getBehaviorMode
};
