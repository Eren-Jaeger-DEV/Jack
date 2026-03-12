const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// --- Mock Mongoose Query Chain ---
const mockDoc = { 
  id: "mock_id",
  name: "mock_string",
  stickers: ["mock_string"], // for packAdd.js, packImport.js
  emojiList: ["mock_string"], // for emojiRemove.js
  format: "png",
  url: "https://mock.com",
  roles: [], // for rrRemove.js
  sellerID: "mock_id", // cancelpop
  listingID: "mock_id", // cancelpop
  sellerName: "mock_user", // cancelpop
  popAmount: 100, // cancelpop
  price: 100, // cancelpop
  save: async () => mockDoc,
  deleteOne: async () => mockDoc,
};

const mockQuerySingle = {
  sort: function() { return this; },
  limit: function() { return this; },
  skip: function() { return this; },
  lean: function() { return this; },
  exec: async function() { return mockDoc; },
  then: function(resolve) { resolve(mockDoc); }
};

const mockQueryArray = {
  ...mockQuerySingle,
  exec: async function() { return [mockDoc]; },
  then: function(resolve) { resolve([mockDoc]); }
};

mongoose.Model.findOneAndUpdate = function() { return mockQuerySingle; };
mongoose.Model.findOne = function() { return mockQuerySingle; };
mongoose.Model.find = function() { return mockQueryArray; };
mongoose.Model.save = async () => mockDoc;
mongoose.Model.updateOne = function() { return mockQuerySingle; };
mongoose.Model.updateMany = function() { return mockQuerySingle; };
mongoose.Model.deleteOne = function() { return mockQuerySingle; };
mongoose.Model.deleteMany = function() { return mockQuerySingle; };
mongoose.Model.create = async () => mockDoc;
mongoose.Model.countDocuments = function() { return mockQuerySingle; };
mongoose.Model.findOneAndDelete = function() { return mockQuerySingle; };
mongoose.Model.findOneAndUpdate = function() { return mockQuerySingle; };

// --- Mock Fetch ---
global.fetch = async () => ({
  json: async () => ({ results: [{ url: "https://mock.com/gif.gif" }] })
});

// --- Mock Context ---
function createMock(overrides = {}) {
  const target = function() {};
  
  return new Proxy(target, {
    get: (t, prop) => {
      if (prop in overrides) return overrides[prop];
      
      if (prop === 'then' || prop === 'catch' || prop === 'finally' || prop === 'toJSON') return undefined;
      if (prop === Symbol.toPrimitive) return () => 'mock_string';
      if (prop === 'toString' || prop === 'valueOf') return () => 'mock_string';
      if (prop === Symbol.iterator || prop === Symbol.asyncIterator) return undefined;
      
      if (typeof prop === 'string') {
          if (['id', 'name', 'value', 'type', 'title', 'description', 'username', 'discriminator', 'tag', 'url', 'iconURL'].includes(prop)) {
             return 'mock_string';
          }
          if (prop === 'displayAvatarURL') {
             return () => "https://mock.com/avatar.png";
          }
      }
      
      return createMock();
    },
    // Synchronous mock so that options.getUser() doesn't return a Promise wrapper
    apply: (t, thisArg, argumentsList) => {
      return createMock();
    }
  });
}

const commandsPath = path.join(__dirname, 'bot', 'commands');
const commandFolders = fs.readdirSync(commandsPath);

let total = 0;
let passed = 0;
let failed = 0;

(async () => {
  console.log("Starting deep command execution validation...\n");

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      total++;
      const filePath = path.join(folderPath, file);
      try {
        const command = require(filePath);
        
        const mockOptions = createMock({
            getString: (name) => name === 'color' ? '#0000ff' : "mock_string",
            getChannel: () => createMock({ id: "mock_channel_id", name: "mock_channel" }),
            getUser: () => createMock({ id: "mock_user_id", username: "mock_user", tag: "mock#1234", displayAvatarURL: () => "https://mock.com/avatar.png" }),
            getMember: () => createMock({ id: "mock_member_id", user: createMock({ id: "mock_user_id", username: "mock" }) }),
            getBoolean: () => true,
            getInteger: () => 1,
            getNumber: () => 1.0,
            getRole: () => createMock({ id: "mock_role_id", name: "mock_role" }),
        });

        // Mock context specifically for "slash" as standard
        const mockCtx = createMock({
          type: "slash",
          options: mockOptions,
          interaction: createMock({
              options: mockOptions,
              user: createMock({ id: "mock_user_id", username: "mock_user", tag: "mock#1234", displayAvatarURL: () => "https://mock.com/avatar.png" }),
          }),
          user: createMock({ id: "mock_user_id", username: "mock_user", tag: "mock#1234", displayAvatarURL: () => "https://mock.com/avatar.png" }),
          member: createMock({ 
            id: "mock_member_id",
            permissions: createMock({ has: () => true })
          }),
          guild: createMock({ 
            id: "mock_guild_id", 
            name: "mock_guild",
            iconURL: () => "https://mock.com/icon.png",
            members: createMock({
                cache: createMock({ get: () => createMock() }),
                fetch: async () => createMock()
            }),
            roles: createMock({
                cache: createMock({ get: () => createMock({ name: "mock_role", id: "mock" }), find: () => createMock() })
            }),
            emojis: createMock({
                create: async () => createMock({ id: "mock_emoji_id" }),
                fetch: async () => createMock({ delete: async () => {} })
            })
          }),
          channel: createMock({ 
            id: "mock_channel_id", 
            send: async () => createMock({ id: "mock_message_id" }),
            messages: createMock({ fetch: async () => ({}) }),
            bulkDelete: async () => {}
          }),
          client: createMock({
            channels: createMock({ 
              fetch: async () => createMock({
                messages: createMock({ fetch: async () => createMock({ edit: async () => {} }) }),
                send: async () => createMock({ id: "mock_id" })
              }) 
            }),
            user: createMock({ id: "mock_bot_id" })
          }),
          reply: async () => createMock(),
          deferReply: async () => createMock(),
          editReply: async () => createMock()
        });
        
        // Try executing command.run
        if (typeof command.run === 'function') {
           await Promise.race([
             command.run(mockCtx),
             new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout after 1000ms")), 1000))
           ]);
           console.log(`✅ [${folder}/${file}] Executed without crashing.`);
           passed++;
        } else {
           console.error(`❌ [${folder}/${file}] "run" is not a function.`);
           failed++;
        }
      } catch (error) {
        console.error(`💥 [${folder}/${file}] Execution crashed:\n`, error.message || error);
        failed++;
      }
    }
  }

  console.log(`\n--- Deep Test Summary ---`);
  console.log(`Total: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  process.exit(failed > 0 ? 1 : 0);
})();
