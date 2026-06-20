# FrugalGPT

FrugalGPT is a React + Firebase chat app where each signed-in user can bring their own provider API keys.
The app supports OpenAI, Anthropic, Google, and Mistral models and stores chat history in Firestore.
All provider API calls are executed on Firebase Cloud Functions, not in the browser.

## Features

- Google sign-in and passwordless email link sign-in with Firebase Auth
- Chat history persisted per user in Firestore
- Rename/delete/share chat threads from the sidebar
- Markdown and code block rendering in assistant responses
- Theme preferences (system, light, dark)

## Provider setup

1. Sign in to the app.
2. Open user settings.
3. Save one or more provider API keys.

You do not need to provide an Assistant ID anymore. The app sends conversation history directly to provider chat APIs.
The frontend calls the streaming HTTPS function `generateChatResponseStreamHttp`.
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

### Email link sign-in (Firebase Console)

In **Authentication → Sign-in method**:

1. Enable **Email/Password**
2. Enable **Email link (passwordless sign-in)**

In **Authentication → Settings → Authorized domains**, include your production domain and `localhost` for local dev.
