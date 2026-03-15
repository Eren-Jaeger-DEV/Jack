const client = require("./bot/index");

client.on("ready", () => {
  console.log("Listeners count for messageCreate:", client.listenerCount("messageCreate"));
  const listeners = client.listeners("messageCreate");
  listeners.forEach((l, i) => console.log(`Listener ${i}:`, l.toString().substring(0, 100)));
  process.exit();
});
