# Language Dex

## Install

- [Play Store](https://play.google.com/store/apps/details?id=dev.arthurcose.languagedex)

## Develop

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

1. Install dependencies

```bash
yarn
cd modules/recording-module
yarn
cd ../..

npm run liceneses
```

2. Connect your phone with debugging enabled and start the app

```bash
npm run android
```

## Build

```bash
npm run build-android
```

## Structure

- `/app`: Page level components using [file-based routing](https://docs.expo.dev/router/introduction).
- `/lib`: Components and utility files
- `/assets`: App assets (icons, splash screens)
- `/licenses`: Extra license files for license-ripper
- `/scripts`: Tools and build scripts

`@/` in `import` statements point to the project root. (`@/lib` points to `/lib`)
