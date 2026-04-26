# 🧪 TESTING & VALIDATION

This document outlines how to ensure the Jack system remains stable and secure.

## 1. Automated Validation
The system includes a `core/aiValidator.js` that checks for permission breaches. Before proposing changes to tools, verify they adhere to the validation logic.

## 2. Running Tests
We use Node.js's built-in test runner for high-speed, zero-dependency unit tests.

### Run all tests:
```bash
npm test
```

### Run specific test file:
```bash
node --test ./tests/core/my-test.js
```

## 3. Pre-Commit Checklist
Follow this checklist before proposing any code change:
1. [ ] No hardcoded IDs in plugins.
2. [ ] `logger` used instead of `console.log`.
3. [ ] `plugin.json` version incremented if features were added.
4. [ ] `npm run docs` executed to sync documentation.

---
*Testing framework: Node.js Native Test Runner*
