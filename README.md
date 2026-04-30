# FrugalGPT

FrugalGPT is a React + Firebase chat app where each signed-in user can bring their own OpenAI API key.
The app uses the OpenAI Responses API with `gpt-5` by default and stores chat history in Firestore.
All OpenAI calls are executed on Firebase Cloud Functions, not in the browser.

## Features

- Email/password and Google sign-in with Firebase Auth
- Chat history persisted per user in Firestore
- Rename/delete/share chat threads from the sidebar
- Markdown and code block rendering in assistant responses
- Theme preferences (system, light, dark)

## OpenAI setup

1. Sign in to the app.
2. Open user settings.
3. Save your OpenAI API key.

You do not need to provide an Assistant ID anymore. The app sends conversation history directly to the Responses API.
The frontend calls the HTTPS function `generateChatResponseHttp`.
Functions are deployed in `europe-north1` by default.

## Local development

```bash
npm install
cd functions && npm install && cd ..
npm start
```

The app expects Firebase config in `src/services/firebase.js`.

## Deploying functions

```bash
firebase deploy --only functions,hosting
```

If you test from `localhost`, make sure functions are either deployed or run in the emulator.

### Use the Functions Emulator (optional)

Create a `.env.local` file in the project root:

```bash
REACT_APP_USE_FUNCTIONS_EMULATOR=true
REACT_APP_FUNCTIONS_EMULATOR_HOST=localhost
REACT_APP_FUNCTIONS_EMULATOR_PORT=5001
```

Then run:

```bash
firebase emulators:start --only functions
npm start
```
