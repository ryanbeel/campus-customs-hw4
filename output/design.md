# Campus Customs: Website Design Changes (Problem 10)

Problem 10 gave the site more personality (a bulldog theme), made the chat assistant easier to notice, added a seasonal welcome, and made shopping easier with a category menu and filters. For each change: **what we changed** and **how it improves the site**.

| # | Change | Main benefit |
|---|---|---|
| 1 | Big cartoon bulldog on the home page + bulldog theme across the site | Personality; shoppers stay longer |
| 2 | Chat bulldog shows a bark or short joke bubble every 30 seconds | Shoppers notice the assistant exists |
| 3 | Welcome pop-up with an animated bulldog, themed for upcoming holidays (Halloween now) | Feels personal and timely; highlights seasonal products |
| 4 | Products menu dropdown with categories that open the filtered page | Faster browsing by type |
| 5 | Filters on the Products page: category, size, color, price, search, sort | Shoppers find exactly what they want |

---

## 1. Cartoon bulldog on the home page + bulldog theme

### What we changed
- **A big cartoon bulldog at the top right of the home page** (`CartoonBulldog.tsx`, drawn in SVG so it's sharp at any size). It's a chubby fawn bulldog with a wrinkly forehead, an eye patch, an underbite with a tongue out, and a **Yale-blue sweater with a white "Y"**.
  - It **waves**, **blinks**, gently **bounces**, and tilts its head, all looping.
  - A speech bubble above it pops in: **"Woof! Boola Boola! 🐾"**
  - Size: up to 360px wide on a computer (about 40% of the hero, so it's big but leaves room for the headline) and about 250px on phones, where it sits above the text.
- **Bulldog theme everywhere:**
  - **Logo:** a small bulldog face next to "CAMPUS CUSTOMS" that tilts when hovered.
  - **Paw-print pattern** in the background of the hero, category tiles, perks strip, Products banner, and footer.
  - **Dog-themed wording:** "Fetch your fit →", "Top dog favorites", "Visit the doghouse", "need a paw", "Fetching products… 🐾", and "Ruh-roh, no matches."
  - **🐾 paw icons** before section headings, plus a 🦴 bone divider between sections.
  - **Product cards** show a paw stamp in the corner when hovered.
  - **New "Shop by category" tiles** on the home page, each with a real product photo and item count.
  - **New Yale-blue footer** with paw prints and "Woof! Thanks for stopping by. Boola Boola! 💙"
  - **A fun 404 page:** "Ruh-roh! This page ran off chasing a squirrel." with the cartoon bulldog.
- Shoppers who turn on "reduce motion" in their device settings get a still bulldog.

### How it helps
The site went from a plain store template to something with a **recognizable mascot and voice** that matches Yale's Handsome Dan. A friendly, moving character draws the eye, makes the brand memorable, and gives shoppers a reason to stay and explore. The category tiles also give first-time visitors an obvious next step.

---

## 2. Chat bulldog barks and tells jokes every 30 seconds

### What we changed
- Every **30 seconds** (while the chat is closed), the bulldog chat button in the bottom right **wiggles** and shows a **speech bubble** for 7 seconds with a random bark or super short joke, never the same one twice in a row (`bubbles.ts`, `ChatWidget.tsx`). For example:
  - "Woof! Need a paw finding your size? 🐾"
  - "What do you call a frozen dog? A pupsicle! 🧊"
  - "Sleeping bulldog? A bull-dozer! 💤"
  - "Dalmatians hate hide and seek. Always spotted! 🐕"
  - "Bow-wow! Psst… try the Surprise Me button 🎁"
- **Clicking the bubble opens the chat.** Bubbles stop while the chat is open.

### How it helps
Many shoppers never notice a chat button. A friendly bark or joke every 30 seconds **draws attention to the assistant** without blocking anything, tells shoppers what it can do ("finding your size", "what's in stock"), and keeps the playful bulldog personality going on every page.

---

## 3. Welcome pop-up with a bulldog and seasonal theme

### What we changed
- The **first time someone opens the site** (once per browser session), a welcome pop-up appears (`WelcomePopup.tsx`).
- **× in the top right** closes it (so do "Just browsing", clicking outside, or Esc).
- **An animated bulldog scene.** It changes with the occasion. **Right now (Halloween):**
  - A jack-o'-lantern wobbles, then the cartoon bulldog **pops out of the pumpkin wearing a witch hat** and waves.
  - Bats 🦇, a ghost 👻 and candy 🍬 fly across a purple night sky under a full moon.
  - Headline: **"Happy Halloween from Campus Customs!"** with a countdown pill: **"🎃 Only 10 days until Halloween!"**
- **Occasions in the next 20 days are found automatically** (`occasions.ts`). The pop-up checks today's date against a calendar of holidays and campus moments:
  - Halloween, The Game (Harvard–Yale), Thanksgiving, the holidays, New Year's
  - Valentine's Day, St. Patrick's Day, Mother's Day, Father's Day, the Fourth of July
  
  It themes itself around the soonest one: colors, flying emoji, bulldog hat (witch, Santa, party), headline, message, and matching product picks. Others coming up are listed too. With no occasion in the next 20 days, it shows a general welcome where the bulldog pops up waving.
- **Seasonal product picks:** 3 real, in-stock products that fit the occasion. For Halloween that's black items (Davenport College Crewneck $58, Grace Hopper Logo T Shirt $32, Morse 1/4 Zip $72), plus a **"Shop Halloween picks →"** button that opens Products filtered to black.
- **Specials/sales:** the pop-up has a **Specials** section that lists any active sales from `promotions.ts`. **The Campus Customs database has no sales or discounts, so none are shown right now; we didn't invent any.** To run a real sale, add it to `promotions.ts` (title, details, start and end dates) and it appears automatically during those dates. (Also tell the chat assistant in `prompts/prompt.md`, so it can answer questions about the sale.)
- Previewing other dates: add `?today=2026-11-20` to the URL (e.g. to see the Game-week or Thanksgiving theme), or `?welcome` to show the pop-up again.

### How it helps
A warm, timely greeting makes the store feel **personal and current**, like a shop window decorated for the season. It points first-time visitors to relevant products straight away (Halloween picks now, Thanksgiving crewnecks later), and once real sales are added to `promotions.ts`, it's the most visible place to announce them.

---

## 4. Products menu with categories

### What we changed
- **Hovering over "Products"** in the top menu opens a dropdown of categories (`NavBar.tsx`): 🐾 All products, Hoodies, Crewnecks & Sweatshirts, T-Shirts, Quarter-Zips, Jackets & Fleece, Long-Sleeve Shirts, Mocknecks.
- **Clicking a category opens the Products page already filtered**, e.g. T-Shirts → `/products?category=t-shirts` shows all 25 T-shirts, with the banner "T-Shirts" and a "T-Shirts ×" filter chip.
- Clicking "Products" itself still shows everything. On phones, the categories appear under Products in the ☰ menu (tap the ▾ arrow).
- The categories come from grouping the catalogue's 22 inconsistent garment-type names (found in Problem 2) into 7 clean groups.

### How it helps
Shoppers usually know the *type* of item they want. Getting from the menu to "all T-shirts" in **one click** removes scrolling through 102 products and makes the store feel organized.

---

## 5. Filters on the Products page

### What we changed
A **Filters panel** on the Products page (left side on computers; a "⚙️ Filters" button on phones) (`Products.tsx`, `catalog.ts`):

| Filter | Options | How it works |
|---|---|---|
| **Category** | All + the 7 categories | One at a time; same as the menu |
| **Size** | XS · S · M · L · XL · XXL | Shows products **in stock** in the chosen size(s), from the `inventory` table |
| **Color** | Navy, Blue, Gray, White, Black, Red, Yellow & Gold, Green, Pink & Coral, Multicolor (with color swatches) | The catalogue's 22 color names ("navy blue", "heather charcoal gray", "cream"…) are grouped into 10 shopper-friendly colors. Matches the garment *or* its logo/print colors. |
| **Price** | Under $40 · $40–$60 · $60–$80 · $80+ | Pick one or more ranges |
| **Search** | Free text | Name, type, description, colors, tags |
| **Sort** | Featured · Price low→high · Price high→low · Name A→Z | |

- **Live counts** next to each option show how many products it would show with your other filters. Options with no matches are dimmed or hidden, so you never click into an empty page.
- **Active filter chips** above the results ("Hoodies ×", "Size M ×", "Navy ×") remove one filter at a time, and **Clear all** resets.
- Shows "**19 of 102 products**", and a friendly "Ruh-roh, no matches" with a Clear button if nothing fits.
- Filters are saved in the **web address** (e.g. `/products?category=hoodies&size=M&color=Navy&sort=price-desc`), so the menu links work, the back button works, and shoppers can share a filtered view.
- The backend's `/api/products` now returns each product's `category`, `color_families`, and `sizes_in_stock`, so filtering is instant in the browser.

### How it helps
Shoppers can narrow 102 products to **exactly what they want and what's actually available in their size** in a few clicks, with no dead ends. That means less frustration, faster decisions, and fewer people leaving because they couldn't find something.

---

## Test results

| Change | Test | Result |
|---|---|---|
| 1. Bulldog + theme | Home page on a computer and a phone | ✅ Cartoon bulldog at the top right, waving and blinking, with "Woof! Boola Boola! 🐾"; paw pattern, category tiles with product photos, themed footer; no sideways scrolling on a 375px phone |
| 2. Bark bubbles | Watched the page for over a minute | ✅ Bubbles at 11.6 s and 41.6 s (exactly 30 s apart), each visible 7 s and the bulldog wiggled; texts: "Woof! Need a paw finding your size? 🐾", "Sleeping bulldog? A bull-dozer! 💤", "What do you call a frozen dog? A pupsicle! 🧊", "Dalmatians hate hide and seek. Always spotted! 🐕" |
| 3. Welcome pop-up | First visit on Oct 21, 2026 | ✅ Halloween theme: pumpkin, bulldog in a witch hat popping out, bats/ghost, "🎃 Only 10 days until Halloween!", 3 black in-stock picks, "Shop Halloween picks →"; × closed it; did not reappear on reload in the same session; no specials shown (none exist) |
| 4. Products menu | Hovered "Products", clicked T-Shirts | ✅ Dropdown with 8 options; opened `/products?category=t-shirts` with **25** T-shirts (matches the database); dropdown closed after the click; on a phone the categories appear under Products |
| 5. Filters | T-Shirts + XL + Red | ✅ 15 T-shirts in stock in XL, then **2** with red (2025 Yale Vs Harvard T Shirt, Morse Logo T Shirt), matching the database exactly |
| 5. Filters | $60–$80 | ✅ **34** products (matches the database) |
| 5. Filters | Hoodies + M + Navy, sorted high→low | ✅ **19** products (matches the database), starting at $88, $88, $68… |

### Fixed while testing
- The hero speech bubble first overlapped the bulldog's head, so it was moved above it.
- The 🤐 emoji used for Quarter-Zips looked odd on the home-page tiles, so the tiles now show a real product photo instead.
- The banner read "Every t-shirts…", reworded to "Browse all of our t-shirts…".
- The Products dropdown stayed open after clicking a category; it now closes.
- The bark bubble first rendered as a tall, narrow column; it now sizes to its text.

### Notes
- Data quality: the database description for "Benjamin Franklin T Shirt" reads like a placeholder ("Campus Customs product photo… Vision blocked…"). It's shown as-is because we don't change catalogue data.
- "The Game" date is estimated as the Saturday before Thanksgiving (when it's usually played). Check the official schedule each year.
