# Turning on sync (one-time setup, about 10 minutes)

Sync stores your records in a **hidden app folder in your own Google Drive**. They are locked with your sync password on your phone **before** they're uploaded, so Google can't read them. You need to create a free "Client ID" once, which lets your app ask Google for permission.

Do this on your PC, signed in to the Google account whose Drive you want to use.

## 1. Create a project
1. Go to **console.cloud.google.com** and accept the terms if asked.
2. At the top, click the project picker, then **New project**. Name it `Health Records` and click **Create**. Make sure it's selected.

## 2. Turn on the Google Drive API
1. In the search bar at the top, type **Google Drive API** and open it.
2. Click **Enable**.

## 3. Set up the sign-in screen
1. In the search bar, open **Google Auth Platform** (it may be called **OAuth consent screen**). Click **Get started**.
2. App name: `Health Records`. Support email: your Gmail. **Next**.
3. Audience: **External**. **Next**.
4. Contact email: your Gmail. **Next**, agree, then **Create**.
5. Open **Audience**. Under **Test users**, click **Add users**, add your own Gmail, and **Save**. (Add anyone else who will sign in.)

## 4. Create the Client ID
1. Open **Clients**, then **Create client**.
2. Application type: **Web application**. Name: `Health Records web`.
3. Under **Authorized JavaScript origins**, click **Add URI** and enter your app's address **without** the folder part, for example
   `https://problem-surgeon.github.io`
4. Click **Create**, then copy the **Client ID** (it ends in `.apps.googleusercontent.com`).

## 5. Paste it into the app
1. On GitHub, open your repository and click **config.js**.
2. Click the **pencil** (Edit), paste the Client ID between the quotes:
   `window.GOOGLE_CLIENT_ID = '1234...apps.googleusercontent.com';`
3. Click **Commit changes**.

## 6. Turn sync on
1. Wait a minute, then close and reopen the app.
2. Go to **Backup & sync**, tap **Turn on sync**, sign in to Google and allow access.
   You may see "Google hasn't verified this app". That's normal for your own app: tap **Continue**.
3. Create a **sync password** (at least 8 characters). **Write it down.** If you lose it, the cloud copy can't be opened.
4. On your PC or other phone: open the same app address, set a PIN, go to **Backup & sync**, tap **Turn on sync**, and enter the same sync password.
