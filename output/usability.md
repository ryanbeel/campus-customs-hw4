# Campus Customs: Usability Improvements (Problem 9)

Four improvements were added to the Campus Customs website and shopping assistant: two on the front end and two in the agent/backend. Each section covers what was added, how it works, how it helps a shopper or the business, and the test result.

| # | Improvement | Type | Main benefit |
|---|---|---|---|
| 1 | **"Bull Dog"** menu item: random 7-second bulldog show | Front end | Delight and word-of-mouth traffic |
| 2 | **"Surprise Me"** menu item: 5 random products from 5 different categories | Front end | Helps undecided shoppers discover products |
| 3 | **Compare products**: the agent compares the viewed item with 3 similar ones, and offers to after 15 seconds | Agent / backend | Faster, more confident decisions; surfaces cheaper and premium options |
| 4 | **Price range**: the agent asks for a budget and only recommends products inside it | Agent / backend | Relevant suggestions; fewer abandoned visits |

---

## Front end improvement 1: "Bull Dog" (a 7-second bulldog show)

### What we added
- A **"Bull Dog"** item, the **last** option in the top menu.
- Clicking it plays a large, animated bulldog event in the **middle of the screen** for **exactly 7 seconds**: the site dims, a 640×440 stage pops up, and a gold timer bar counts down. Then the bulldog disappears and the site goes back to normal.
- **5 different events**, picked at random, never the same one twice in a row:

| Event | What happens | Caption |
|---|---|---|
| 🛹 Skateboard kickflip | The bulldog rolls in on a skateboard, launches into a full backflip while the board spins underneath, lands it, does a victory hop, and rolls off screen | "Sk8er Dog! Handsome Dan just landed a kickflip 🛹" |
| 🪩 Disco dog | A disco ball drops, colored party lights swirl, and the bulldog dances in black sunglasses while music notes float up | "Bulldog Boogie! Somebody has been practicing 🪩" |
| 🚀 Rocket launch | The bulldog pilots a rocket that shakes, puffs smoke, and blasts off into space, then floats back down on a parachute | "3… 2… 1… BARK-OFF! 🚀" |
| 🌭 Hot dog eating contest | The bulldog chomps 5 hot dogs one after another, its belly gets visibly fuller, and a speech bubble pops: "*BURP*… BOOLA BOOLA!" | "Hot dog eating champion. Zero regrets. 🌭" |
| 🏈 Field goal | The bulldog kicks a spinning football that arcs through the Yale-blue goal posts; "IT'S GOOD!" pops up and confetti rains | "IT'S GOOD! Bulldogs win The Game! 🏈" |

**Files:** `frontend/src/components/BulldogShow.tsx` (the 5 scenes, 7-second timer), `frontend/src/App.tsx` (random pick, no back-to-back repeats), `frontend/src/components/NavBar.tsx` (menu button), `frontend/src/index.css` (animations). Pure CSS animations, so it needs no extra libraries or image downloads. Shoppers who turn on "reduce motion" in their device settings get a still version.

### How it helps
- **Shoppers:** a quick, funny surprise that makes the site memorable, and the store feel friendly and fun.
- **Business:** shareable moments ("you have to click the Bull Dog button") bring **word-of-mouth traffic**, and 5 random events give people a reason to click again and stay longer. Because it never interrupts shopping (it only plays when clicked and lasts 7 seconds), it adds delight without hurting sales.

### Test
Clicked "Bull Dog" repeatedly until all 5 events had appeared:

| Play | Event | On screen |
|---|---|---|
| 1 | rocket | 7.1 s, then removed |
| 2 | hotdog | 7.1 s, then removed |
| 3 | fieldgoal | 7.1 s, then removed |
| 4 | skate | 7.1 s, then removed |
| 5 | fieldgoal | 7.1 s, then removed |
| 6 | disco | 7 s |

✅ All 5 events appeared, each lasted about 7 seconds (7.1 s includes the browser check) and then disappeared, and there were no back-to-back repeats. Screenshots confirmed the skateboard mid-kickflip, the rocket mid-launch, the hot dog contest (2 eaten, 3 to go), and the disco dog in sunglasses. The menu order is Home, Products, About Us, Log In, Create Account, **Surprise Me**, **Bull Dog**.

*Fixed during testing:* the disco bulldog first wore a 😎 emoji, which covered its whole face with a yellow smiley. It now wears real black sunglasses drawn in CSS.

---

## Front end improvement 2: "Surprise Me" (5 random products, 5 different types)

### What we added
- A **"Surprise Me"** item, the **second-to-last** option in the top menu.
- Clicking it shows **5 random product cards** in the same panel style as the Problem 7 chat search results: image, category, name, price, short description, and sizes in stock.
- **Every card is a different type of product.** The backend groups the catalogue's 22 inconsistent `garment_type` values into 7 categories (Hoodie 27, Crewneck 28, T-shirt 25, Quarter-zip 11, Jacket 8, Long-sleeve 2, Mockneck 1), picks 5 different categories at random, then one random **in-stock** product from each.
- **🔀 Shuffle again** gives a fresh mix. Clicking a card opens the single-item page from Problem 3, and the panel shrinks to a "🎁 Back to your surprise picks" bar.
- Note: the catalogue has **no hats** (or other accessories), so the mix comes from the 7 apparel categories we actually sell. Nothing is invented.

**Files:** `GET /api/surprise` in `backend/main.py` → `tools.surprise_me()` and `tools.garment_category()` in `backend/tools.py`; `frontend/src/chatResults.tsx` (`surprise()`), `frontend/src/components/ChatResultsPanel.tsx` (Surprise layout and Shuffle).

### How it helps
- **Shoppers who don't know what they want** get an instant, varied starting point instead of a 102-item list, plus an easy way to see more.
- **Business:** shows off the range of the catalogue (jackets, mocknecks, and long-sleeves get seen, not just T-shirts), which can lead to bigger or unplanned purchases. Only in-stock items are shown, so a surprise never leads to a sold-out product.

### Test
Five back-to-back calls to Surprise Me, plus the website:

| Call | Categories (5 different every time) |
|---|---|
| 1 | Crewneck, Quarter-zip, Mockneck, Hoodie, Jacket |
| 2 | Long-sleeve, Hoodie, Quarter-zip, Mockneck, Crewneck |
| 3 | Jacket, Quarter-zip, Crewneck, T-shirt, Hoodie |
| 4 | Mockneck, Jacket, Crewneck, Long-sleeve, T-shirt |
| 5 | Mockneck, T-shirt, Long-sleeve, Hoodie, Crewneck |
| Website | Quarter-zip (School Of Architecture Crewneck, $72), Long-sleeve (Dry Zone Long Sleeve, $45), Hoodie (Yale Sports Hoodie Hockey, $68), Crewneck (Hype And Vice Premium Crewneck, $58), T-shirt (Football Left Chest T Shirt, $32) |
| Shuffle again | New mix: Hoodie, Jacket, Long-sleeve, T-shirt, Mockneck |

✅ Always 5 cards from 5 different categories; Shuffle changed the picks; clicking a card opened `/products/yale-sports-hoodie-hockey`.
(Data note: "School Of Architecture Crewneck" shows as a quarter-zip because its `garment_type` and description in the database say quarter-zip pullover.)

---

## Agent / backend improvement 1: Compare a product with 3 similar products

### What we added
- **New agent tool `compare_products(product_id)`** (`backend/tools.py`). For the product the shopper is viewing, it picks **3 similar in-stock products** in the same category (or related categories if there aren't enough), choosing a useful spread:
  1. the **most similar** item (closest price + most shared `search_tags`),
  2. the **best cheaper option**,
  3. the **best premium option**,

  and returns each one's **price difference** (e.g. "$23 less"), colors, and sizes in stock. If the shopper has a budget (improvement 4), only products inside it are used.
- **The agent** calls it when asked ("How does this compare?", "Anything similar but cheaper?") and sets `compare_product_id`. The chat then shows a **comparison table**: image, name, price, a colored badge (**viewing** / **$23 less** / **same price** / **$20 more**), and sizes in stock. Every row links to that product's page.
- **15-second prompt:** if a shopper stays on the same product page for **15 seconds**, the chat opens by itself and asks: *"Still deciding on the [product]? I can compare it with 3 similar items, including price, so you can pick the best one. Want me to?"*, with **⚖️ Yes, compare** / **No thanks** buttons. It's offered once per product per visit, so it never nags.
- **Honest pricing:** most categories have one price in this catalogue (every crewneck $58, T-shirt $32, quarter-zip $72; hoodies vary $45/$68/$88), so the prompt tells the agent to say when prices are the same and compare design, colors, and sizes instead.

**Files:** `tools.compare_products()`, `tools.comparison_table()`, `tools.RELATED_CATEGORIES` (backend/tools.py); `compare_products` tool and `compare_product_id` output (backend/agent.py, backend/models.py); "Comparing products" section in `prompts/prompt.md`; comparison table and 15-second timer in `frontend/src/components/ChatWidget.tsx`.

### How it helps
- **Shoppers** who are hesitating get a side-by-side answer to "is this the best one for me?" without opening 4 tabs, including a cheaper option they might not have found.
- **Business:** catching hesitation (15 seconds of looking without buying) turns a likely exit into a guided choice; showing premium options can raise order value, and showing cheaper ones keeps price-sensitive shoppers from leaving.

### Test
On the **Yale Sports Hoodie Hockey** page, waited without touching anything:
- ✅ After about 15 seconds, the chat opened with: *"Still deciding on the Yale Sports Hoodie Hockey? I can compare it with 3 similar items, including price, so you can pick the best one. Want me to?"* plus ⚖️ Yes, compare / No thanks.
- Clicked **Yes, compare**. Agent reply: *"The Yale Sports Hoodie Hockey is $68.00. The Tennis hoodie is the cheapest at $45.00—$23 less—with all sizes in stock; the Soccer hoodie is the same price, while the Brooks Brothers full-zip is $20 more at $88.00…"*
- Comparison table shown in the chat:

| Product | Price | Badge | Sizes in stock |
|---|---|---|---|
| Yale Sports Hoodie Hockey | $68.00 | viewing | S · M · L · XL · XXL |
| Yale Sports Hoodie Tennis | $45.00 | $23 less | XS · S · M · L · XL · XXL |
| Yale Sports Hoodie Soccer | $68.00 | same price | XS · S · L · XL · XXL |
| Brooks Brothers Double Knit Full Zip Hoodie Yale | $88.00 | $20 more | S · M · L · XL · XXL |

✅ Backend check on the Basic Hoodie Big Yale ($68): compared with Yale Sports Hoodie Tennis ($45, −$23), The Forest School Hoodie ($68, same), Champion Full Zip Hood ($88, +$20).

*Improved during testing:* the first version picked the 3 "closest price" hoodies, which were all $68, making for a dull comparison. It now picks a similar, a cheaper, and a premium option.

---

## Agent / backend improvement 2: Ask for a price range, then stay inside it

### What we added
- **The agent asks for a budget.** When a shopper asks for help choosing ("Can you help me pick something for my roommate?", "I need a gift for my dad") and hasn't given a budget, the agent asks *"Do you have a price range in mind?"* and the chat shows quick buttons: **Under $40 · $40–$60 · $60–$80 · $80 and up · No limit**. Shoppers can also type a range ("under $50", "around $70").
- **Only products inside the range are recommended.** The agent returns the range as structured output (`price_range: {min_price, max_price}`), and from then on it is **enforced in code**, not just in the prompt:
  - `search_products`, the on-page search results, and `compare_products` all filter on `catalogue.price` using the shopper's range (`tools.rank_products` / `compare_products`).
  - Small product cards in the chat that fall outside the range are removed before they reach the website (the product the shopper is viewing is always allowed).
- **The website remembers the budget** for the rest of the chat and shows it as a green **💲 Budget: $40–$60 ×** bar. Clicking × or saying "no limit" clears it.
- If nothing fits, the agent says so honestly and offers to widen the range rather than quietly breaking it.

**Files:** `PriceRange` (backend/models.py); `price_range` / `min_price` support in `tools.rank_products`, `search_products`, `search_page`, `compare_products` (backend/tools.py); budget instructions, `ask_price_range` / `price_range` / `clear_price_range` output and card filtering (backend/agent.py); `GET /api/search?min_price=…`; "Price range (budget)" section in `prompts/prompt.md`; budget buttons and pill in `ChatWidget.tsx`.

### How it helps
- **Shoppers** see only what they can afford, so there's no scrolling past $98 jackets on a $40 budget, and they get answers faster.
- **Business:** relevant, budget-fit suggestions raise the chance of a purchase and build trust; knowing a shopper's budget is also useful information about who is shopping.

### Test
Website, as a guest:
1. "Can you help me pick something for my roommate?" → ✅ *"Absolutely! I can help you find a great Yale gift for your roommate. Do you have a price range in mind—under $40, $40–$60, $60–$80, $80+, or no limit?"* with the 5 budget buttons.
2. Clicked **$40–$60** → ✅ the 💲 Budget: $40–$60 bar appeared; picks: Davenport College Crewneck **$58**, District Vit Crewneck Vintage Bulldog **$58**, Dry Zone Long Sleeve **$45**, all inside the range.
3. "He loves hoodies. What hoodies do you have?" → ✅ *"I found 2 hoodies in your $40–$60 range…"*; on-page results "Hoodies from $40–$60: 2 of 2": Ua Gameday Double Knit Hood **$45**, Yale Sports Hoodie Tennis **$45**. The other 25 hoodies ($68 and $88) were correctly left out.

Backend check: with a $40–$60 budget, "What about quarter-zips or jackets?" → ✅ *"I'm sorry—there aren't any quarter-zips or jackets available between $40 and $60 right now…"* (correct: quarter-zips are $72 and jackets $98).

---

## Summary of test results

| Improvement | Result |
|---|---|
| Bull Dog: 5 random 7-second events, then back to normal | ✅ Pass |
| Surprise Me: 5 products from 5 different categories | ✅ Pass |
| Compare with 3 similar products + 15-second prompt | ✅ Pass |
| Ask for a price range and only recommend inside it | ✅ Pass |
