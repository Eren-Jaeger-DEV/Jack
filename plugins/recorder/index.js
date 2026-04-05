const path = require("path");
const fs = require("fs");

module.exports = {
  name: "recorder",
  activeRecordings: new Map(),
  
  load(client) {
    // Attach to client for access in commands
    client.recorder = this;
    
    // Create recordings directory if it doesn't exist
    const recordingsDir = path.join(__dirname, "../../data/recordings");
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }
    
    // Scheduled cleanup (every hour, check for files older than 24h)
    setInterval(() => {
      this.cleanupRecordings(recordingsDir);
    }, 60 * 60 * 1000);
    
    console.log("Jack Recorder Plugin Loaded!");
  },

  cleanupRecordings(directory) {
    const now = Date.now();
    const expiration = 24 * 60 * 60 * 1000; // 24 hours
    
    fs.readdir(directory, (err, files) => {
      if (err) return;
      files.forEach(file => {
        const filePath = path.join(directory, file);
        fs.stat(filePath, (err, stats) => {
          if (err) return;
          if (now - stats.mtimeMs > expiration) {
            // Check if it's a file or directory
            if (stats.isDirectory()) {
              fs.rmSync(filePath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(filePath);
            }
          }
        });
      });
    });
  }
};
