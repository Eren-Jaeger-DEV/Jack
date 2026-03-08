require("dotenv").config({ quiet: true });

require("./bot/index");
require("./dashboard/backend/server");
console.log("Running on:", process.platform, process.cwd());