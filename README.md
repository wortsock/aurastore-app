# AuraStore Mobile App

Android app for the AuraStore shop. It uses the same Supabase project, tables, Google login and `place-order` function as the website, so one account and one cart work on both.

Website: https://wortsock.github.io/aurastore/
Website repo: https://github.com/wortsock/aurastore

## Features
- Sign in with Google (same account as the website)
- Browse products with search and category filters, product details
- Cart that syncs live with the website in both directions (Supabase Realtime)
- Checkout (Pay on Delivery), order confirmation email, order history

## Tech
Expo (React Native) with Expo Router, Supabase (Auth, Postgres, Realtime, Edge Function), built with EAS Build.

## Run locally
1. Install Node.js and run `npm install`
2. Create a `.env` file (never commit it):
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` (the publishable key)
3. `npx expo start --tunnel`, then open it in Expo Go

## Build the APK
`npx eas-cli@latest build -p android --profile preview`
The two public values above are set as EAS environment variables (preview environment) on expo.dev, not in the repo. No secret keys are used anywhere in the app.

## How login and sync work
- Google sign-in opens in the phone browser through Supabase and returns to the app through the `aurastore://` link. Because the website uses the same Supabase Google provider, the same Google account gives the same user, cart and orders on both.
- The website and the app each write one cart row at a time to the `cart_items` table. Each subscribes to changes on that table and refetches, so a cart change shows on the other within seconds. The app also refetches when it returns to the foreground and every 15 seconds on the Cart tab.

## Known limits
- Android only. Pay on Delivery only.
- Order emails are sent from a verified Mailgun domain and may land in spam.

## Install and test
Open the APK link from the submission, install it, sign in with Google, then add items to the cart on the website and watch them appear in the app.
