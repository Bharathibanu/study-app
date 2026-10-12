# Bharathi's Study Tracker: setup guide

An app for Android and PC that tracks study time, daily tasks, revision, mock tests, expenses and meetings.
It carries unfinished work to the next day and moves anything pending more than 3 days into a red Critical Zone.

Everything here is free.

## What is in this folder

| File | What it does |
|---|---|
| `index.html` | The page the app opens |
| `styles.css` | Colours, layout, animations |
| `app.js` | All the app logic |
| `cloud.js` | Connects to Firebase (only used if you turn on sync) |
| `firebase-config.js` | The place you paste your Firebase settings |
| `manifest.json` | Name and icon, so it can be installed like an app |
| `sw.js` | Makes the app open fast and work without internet |
| `icons/` | The app icons |

## Step 1. Try it on your PC (5 minutes)

1. Install **VS Code** (free) from code.visualstudio.com.
2. In VS Code choose File, Open Folder, and open this `study-app` folder.
3. Open the Extensions panel (the squares icon on the left) and install **Live Server**.
4. Right-click `index.html` and choose **Open with Live Server**.
5. The first time, the app asks you to **create your login**. Type a user name (for example `Bharathi`) and a password. Your password is stored on this device only, scrambled.
6. Click the **+** button or **More, Settings, Load sample data** to see how every screen looks. Remove the sample data when you start for real.

At this point the app works on this computer, and your data is saved in this browser.

## Step 2. Put it online so your phone can open it (10 minutes)

1. Create a free account at github.com.
2. Click **New repository**, name it `study-app`, set it to **Public**, and create it.
3. Click **uploading an existing file**, drag in everything from this folder (including the `icons` folder), and click **Commit changes**.
4. Open the repository's **Settings, Pages**. Under "Branch" choose `main` and `/ (root)`, then Save.
5. After about a minute your link appears: `https://YOUR-USERNAME.github.io/study-app/`

## Step 3. Install it like an app

**Android:** open your link in Chrome, tap the three dots, then **Install app** (or "Add to Home Screen"). The icon appears on your home screen.

**PC:** open the link in Chrome or Edge and click the **Install** icon at the right end of the address bar. It opens in its own window with a desktop shortcut.

## Step 4 (optional). Make phone and PC share the same data

Without this step, each device keeps its own separate data. Use **Settings, Export backup** and **Import backup** to move data by hand, or turn on sync with Firebase (free):

1. Go to console.firebase.google.com and sign in with your Google account.
2. Click **Add project**, name it `study-tracker`, and turn Google Analytics off.
3. Click the **web icon (`</>`)** on the project page, name the app, and click **Register app**. Firebase shows a block of settings. Copy `apiKey`, `authDomain`, `projectId` and `appId` into `firebase-config.js`, replacing the `PASTE_` values. Save.
4. In the left menu choose **Build, Authentication, Get started**, then enable **Email/Password**.
5. In the left menu choose **Build, Firestore Database, Create database**. Pick any region near you and start in **production mode**.
6. Open the **Rules** tab, replace everything with the text below, and click **Publish**. This makes each person's data readable only by that person.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

7. In Firebase, open **Authentication, Settings, Authorized domains** and add `YOUR-USERNAME.github.io`.
8. Upload the changed `firebase-config.js` to GitHub again (see "How to update" below).
9. Open the app. The login screen now asks for an **email and password**. Tap **Create account** the first time. Firebase needs a password of at least 6 characters.
10. Sign in with the same email on your phone and your PC. The small label at the top right shows "Synced".

## Sections added later

- **DHANAM Canteen:** four rows per day (morning tea, afternoon tea, snacks, lunch). Type how many you had, or use the minus and plus buttons, and the amount and day total are worked out instantly. Default prices are tea 12, snack 10, lunch 52. Change them on the same page. A price change applies from the day you are viewing onward, and earlier days keep their old price. The month table and chart show your canteen spending, and it is included in the totals on Home, Money and Reports.
- **To-Do:** separate cards with priority, due date and an optional reminder. Each card shows the gap: how long it has been waiting, how many days until it is due or how many days it is overdue, and for finished cards how long it took. The top of the page shows open, overdue, longest waiting and average days to finish.
- **Learning:** add books with total pages and log the pages you cover each day. You see progress, pages today, pages this week and an estimate of days left at your pace. Below that are learning cards where you type what you learned, tag it and link it to a book.
- **Diary:** write dated entries with an optional title and mood, star the important ones, filter to important only, and search.

**About reminders:** they ring while the app is open on your phone or PC (the app checks every 20 seconds). If you turn on notifications in Settings, you also get a phone or desktop alert. A web app cannot ring after you fully close it, so keep the installed app open in the background when you need a reminder.

## Uploading your 200-day plan

Open **More, SSC Plan**. Upload a CSV file or paste text with these columns:

`Day, Date, Subject, Topic, Planned Hours, Notes`

Use **Download sample CSV** to see the format. Date is optional if you set the Day 1 date. In Excel, choose Save As, CSV. Each day's lines appear in Today's schedule automatically. Anything left unfinished is marked as carried and moves to the next day.

## How the carry-forward rule works

- Anything not finished moves to the next day with a tag such as "Carried from yesterday".
- If you finish only part of a task, use **Part** and enter the minutes. Only the remaining time carries forward.
- A task carried for **more than 3 days** moves to the red **Critical Zone** on Home.
- Skipping Quick Revision for one day shows a warning. Skipping 2 or more days in a row adds it to the Critical Zone.

## How to update the app later

1. Change the files (ask Claude for the change and replace the file in this folder).
2. Open `sw.js` and increase the number in `const CACHE = 'study-tracker-v1'` (for example `v2`). This makes phones and PCs pick up the new files.
3. Upload the changed files to your GitHub repository again (open the file in GitHub, click the pencil or "Add file, Upload files", and commit).
4. Close and reopen the app once or twice on each device.

## Good to know

- **Backups:** if sync is off, use Settings, Export backup now and then. Clearing browser data erases local data.
- **Privacy:** the page is public on the internet, but your data is not. With sync on, Firestore rules keep it private to your login. With sync off, data never leaves your device.
- **Reminders:** Settings, Turn on reminders shows alerts when you open the app (overdue items, skipped revision) and when the timer ends.
- **Not included yet:** a ready-made `.apk` or `.exe`. The installed app already behaves like one. If you want a real `.apk`, upload your link to pwabuilder.com (free).
