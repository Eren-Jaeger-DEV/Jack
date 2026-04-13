/**
 * JACK PREMIUM STARTUP BANNER
 * Generated specifically for a celestial/dark aesthetic.
 */

const JACK_BANNER = `
      \x1b[36m   __               __  
      / /____ _ _____  / /__
 __  / / __ \`/ / ___/ / //_/
/ /_/ / /_/ / / /__  / ,<   
\\____/\\__,_/  \\___/ /_/|_|  \x1b[0m
`;

const SUBTITLE = "\x1b[90m « \x1b[35mCelestial Edition\x1b[0m \x1b[90m» \x1b[0m";

module.exports = {
    getBanner: () => JACK_BANNER,
    getSubtitle: () => SUBTITLE,
    print: () => {
        console.log(JACK_BANNER);
        console.log(" ".repeat(12) + SUBTITLE + "\n");
    }
};
