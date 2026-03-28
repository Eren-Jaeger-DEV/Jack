# JACK DEVELOPER RULEBOOK (v2.2.0)

This is a STRICT RULEBOOK. Failure to comply will result in immediate PR rejection.

---

## 1. GENERAL PRINCIPLES
* MUST follow the **Modular Plugin-First Architecture**.
* MUST NOT hardcode any Channel IDs, Role IDs, or User IDs.
* MUST use the Core Layer (`/core`) for all discovery and loading.
* MUST maintain 100% isolation between plugins.

---

## 2. PLUGIN CREATION
* MUST contain a `plugin.json` manifest with `id`, `name`, `version`, and `main`.
* MUST include an `index.js` if the plugin requires lifecycle management.
* MUST implement `load(client)` and `unload(client)` for global state.
* MUST implement `enable(guild)` and `disable(guild)` for guild-specific setup.

---

## 3. COMMAND STANDARDS
* MUST export: `name`, `category`, `permissions`, `cooldown`, `data`, and `run`.
* `permissions` MUST be an Array of `PermissionFlagsBits`.
* `cooldown` MUST be an Object: `{ user: ms, guild: ms }`.
* `data` MUST be an instance of `SlashCommandBuilder`.
* `run(ctx)` MUST be the only entry point for execution.
* MUST use `ctx.reply()` or `ctx.defer()` for all responses.

---

## 4. EVENT STANDARDS
* MUST export: `name` and `execute`.
* `execute` MUST receive `client` as the final argument (if not in the event object).
* MUST verify if the plugin is enabled for the specific guild before processing.

---

## 5. SERVICE STANDARDS
* MUST contain PURE business logic only.
* MUST NOT accept Discord objects (`client`, `ctx`, `message`, `interaction`).
* MUST accept raw primitives or database IDs only.

---

## 6. DATABASE STANDARDS
* MUST use Mongoose models located in `bot/database/models/`.
* MUST NOT define inline schemas in plugins or commands.
* MUST NOT perform direct database writes inside `command.run`. Use Services.

---

## 7. CONFIGURATION STANDARDS
* MUST use `configManager.getGuildConfig(guildId)` for all settings.
* MUST NOT bypass the `GuildConfig` database for feature-specific IDs.

---

## 8. FORBIDDEN ACTIONS
* MUST NOT use `require()` to import files from other plugins.
* MUST NOT use `message.reply()` or `interaction.reply()` directly.
* MUST NOT modify the `Context` (ctx) object post-initialization.
* MUST NOT bypass the `Command Executor` for command logic.
* MUST NOT use `console.log()`. Use the structured `logger` utility.

---

## 9. NAMING CONVENTIONS
* FILES: Use `kebab-case.js` (e.g., `member-kick.js`).
* FOLDERS: Use `kebab-case` (e.g., `member-classification`).
* MODELS: Use `PascalCase.js` (e.g., `GuildConfig.js`).
* FUNCTIONS: Use `camelCase`.

---

## 10. PRE-COMMIT CHECKLIST
* [ ] Code passes `validator.js` checks.
* [ ] No cross-plugin imports detected.
* [ ] `plugin.json` contains all mandatory fields.
* [ ] All `command.run` calls use `ctx` methods.
* [ ] No hardcoded IDs present.
* [ ] `STRICT_MODE=true` boot test passes without errors.
