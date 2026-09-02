# iOS Shortcut — Save a recipe to Mise

This shortcut lives in your share sheet. When you see a recipe on TikTok, Instagram, or anywhere else, tap Share → Mise and it saves automatically.

**Replace `YOUR_INGEST_URL` with your actual Pages URL** (e.g. `https://mise-abc123.pages.dev`) before using.

---

## Build the shortcut

1. Open the **Shortcuts** app on your iPhone
2. Tap **+** (top right) to create a new shortcut
3. Tap the shortcut name at the top and rename it **Mise**

### Add these actions in order:

**Action 1 — Accept share sheet input**
- Search for and add: **Receive** (full name: "Receive input from Share Sheet")
- Set "Receive" to: **Images and Media** and **URLs** (check both)
- Check: **If there's no input** → choose **Stop and output nothing** (or leave default)

**Action 2 — Get images from input**
- Search for and add: **Get Images from Input**
- Input: **Shortcut Input** (the variable from Action 1)

**Action 3 — Make the request**
- Search for and add: **Get Contents of URL**
- URL: `YOUR_INGEST_URL/api/ingest`
- Tap **Show More**
  - Method: **POST**
  - Request Body: **Form**
  - Tap **Add new field** → **File**
    - Key: `images[]`
    - Value: tap the variable picker → select **Images** (from Action 2)
- (Optional) Add another field → **Text**, key `source_url`, value: **Shortcut Input** filtered to URL

**Action 4 — Parse the response**
- Search for and add: **Get Dictionary Value**
- Get: **Value** for key `status`
- From: **Contents of URL** (from Action 3)

**Action 5 — Notify you**
- Search for and add: **If**
  - Input: **Dictionary Value** (from Action 4)
  - Condition: **is** → `cold`
- Inside the **If** branch: add **Show Notification**
  - Title: **Mise**
  - Body: `Recipe saved`
- Tap **Otherwise**: add another **Show Notification**
  - Title: **Mise**
  - Body: `Couldn't find a recipe in that`
- Add **End If**

### Enable share sheet

- Tap the **settings icon** (bottom of the shortcut editor)
- Turn on **Show in Share Sheet**
- Under "Receive input from": make sure **Images** and **URLs** are checked

---

## How to use it

**From TikTok (or Instagram, YouTube, etc.):**
1. Pause on the recipe video
2. Take a screenshot (or two — if the caption is long)
3. Open Photos → tap the screenshot → Share → **Mise**

**From a recipe website:**
1. Tap Share in Safari
2. Scroll down in the share sheet → tap **Mise**

---

## Notes

- If a video caption is cut off, screenshot it in two parts and share both at once from Photos (select multiple → Share)
- The shortcut works on any image — cookbook pages, handwritten cards, photos of recipes
- "Couldn't find a recipe" means the screenshot had no parseable recipe (emoji-only captions, restaurant posts, etc.) — the item is still saved for searching
- Jill can install the same shortcut on her phone pointing to the same URL
