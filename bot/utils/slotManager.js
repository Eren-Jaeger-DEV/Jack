/**
 * Retrieves the current capacity of a Guild's Custom Emoji and Sticker slots
 * depending on its Boost Tier.
 */
function getEmojiSlots(guild) {
   let max = 50;
   const tier = guild.premiumTier;
   
   if (tier === 1) max = 100;
   if (tier === 2) max = 150;
   if (tier === 3) max = 250;
   
   // Emojis are split evenly: Static and Animated
   const currentStatic = guild.emojis.cache.filter(e => !e.animated).size;
   const currentAnimated = guild.emojis.cache.filter(e => e.animated).size;
   
   return {
      maxStatic: max,
      maxAnimated: max,
      currentStatic,
      currentAnimated,
      staticAvailable: max - currentStatic,
      animatedAvailable: max - currentAnimated
   };
}

function getStickerSlots(guild) {
   let max = 5;
   const tier = guild.premiumTier;
   
   if (tier === 1) max = 15;
   if (tier === 2) max = 30;
   if (tier === 3) max = 60;
   
   const current = guild.stickers.cache.size;
   
   return {
      max,
      current,
      available: max - current
   };
}

module.exports = { getEmojiSlots, getStickerSlots };
