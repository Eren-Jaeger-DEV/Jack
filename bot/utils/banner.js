/**
 * JACK PREMIUM STARTUP BANNER
 */

const JACK_BANNER = `
      \x1b[36m   __               __  
      / /____ _ _____  / /__
 __  / / __ \`/ / ___/ / //_/
/ /_/ / /_/ / / /__  / ,<   
\\____/\\__,_/  \\___/ /_/|_|  \x1b[0m
`;

module.exports = {
    getBanner: () => JACK_BANNER,
    print: () => {
        console.log(JACK_BANNER + "\n");
    }
};
