"""Tools the Campus Customs agent can call. All data comes from the SQLite database.

Fields used (see output/harness.md, sections 1-2 and 8):
- catalogue: product_id, name, garment_type, description, colors, search_tags, price, image_file_path
- inventory: product_id, size, quantity
- users: id, first_name, last_name, email, created_at (never password_hash)
- chat_messages: user_id, role, content, products_json, created_at
"""

import json
import random
import re
import sqlite3
from dataclasses import dataclass
from pathlib import Path

from models import (
    ChatResponse,
    Comparison,
    ComparisonResult,
    ComparisonRow,
    ComparedProduct,
    CurrentPage,
    CustomerProfile,
    OutOfStockNotice,
    PageContext,
    PriceRange,
    ProductCard,
    ProductDetails,
    ProductMatch,
    ProductSummary,
    RestockRequestResult,
    SearchResults,
    SearchSpec,
    SavedChatMessage,
    SearchToolResult,
    SizeStock,
    StockCheck,
)

SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"]
SIZE_ALIASES = {
    "EXTRA SMALL": "XS", "SMALL": "S", "MEDIUM": "M", "MED": "M", "LARGE": "L",
    "EXTRA LARGE": "XL", "X-LARGE": "XL", "XXXL": "XXL", "2XL": "XXL", "XX-LARGE": "XXL",
}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Item-type words a shopper might use -> text that must appear in catalogue.garment_type.
# Built from the garment types found in Problem 2 (e.g. "pullover hoodie",
# "hooded sweatshirt", "short-sleeve T-shirt", "quarter-zip pullover").
GARMENT_GROUPS = {
    "hoodie": ["hood"], "hood": ["hood"], "hooded": ["hood"],
    "crewneck": ["crewneck"], "crew": ["crewneck"],
    # "quarter-zip" is listed explicitly because some are typed "quarter-zip pullover"
    # and others "quarter-zip pullover sweatshirt" (found in Problem 2/8).
    "sweatshirt": ["sweatshirt", "hood", "crewneck", "mockneck", "quarter-zip"],
    "sweater": ["sweatshirt", "hood", "crewneck", "mockneck", "fleece", "quarter-zip"],
    "shirt": ["t-shirt", "performance shirt"], "tee": ["t-shirt"], "t-shirt": ["t-shirt"], "tshirt": ["t-shirt"],
    "quarter-zip": ["quarter-zip"], "quarterzip": ["quarter-zip"], "1/4": ["quarter-zip"],
    "zip": ["quarter-zip", "full-zip"],
    "jacket": ["jacket"], "coat": ["jacket"], "fleece": ["fleece"], "bomber": ["bomber"],
    "mockneck": ["mockneck"],
    "long-sleeve": ["long-sleeve"], "performance": ["performance"],
}

# Extra words to look for in the other fields.
SYNONYMS = {
    "grey": ["gray"],
    "blue": ["navy"],
}

STOPWORDS = {
    "a", "an", "the", "and", "or", "for", "with", "in", "of", "to", "me", "my", "i",
    "do", "you", "have", "any", "some", "show", "want", "need", "looking", "something",
    "yale", "please", "is", "are", "that", "this", "it", "what", "your", "all", "got",
    "sell", "see", "find",
}


@dataclass
class ShopDeps:
    """Things every tool call can use."""

    db_path: Path
    customer_first_name: str | None = None
    customer_last_name: str | None = None
    customer_email: str | None = None
    user_id: int | None = None
    page: PageContext | None = None
    price_range: PriceRange | None = None  # shopper's budget; recommendations stay inside it
    restock_saved: bool = False  # set when request_restock_email saves a request this turn


def _connect(deps: ShopDeps, read_only: bool = True) -> sqlite3.Connection:
    uri = f"file:{deps.db_path}?mode={'ro' if read_only else 'rw'}"
    conn = sqlite3.connect(uri, uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_restock_table(db_path: Path) -> None:
    """Create the table that stores back-in-stock email requests (once)."""
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS restock_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id TEXT NOT NULL,
                size TEXT NOT NULL,
                email TEXT NOT NULL,
                user_id INTEGER,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (product_id) REFERENCES catalogue(product_id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE (product_id, size, email)
            )"""
        )


def normalize_size(size: str) -> str:
    s = size.upper().strip()
    return SIZE_ALIASES.get(s, s)


def garment_category(garment_type: str) -> str:
    """Group the 22 inconsistent garment_type values (Problem 2) into 7 shopper-friendly categories."""
    g = garment_type.lower()
    if "hood" in g:
        return "Hoodie"
    if "t-shirt" in g:
        return "T-shirt"
    if "performance" in g or "long-sleeve" in g:
        return "Long-sleeve"
    if "quarter-zip" in g:
        return "Quarter-zip"
    if "jacket" in g or "fleece" in g:
        return "Jacket"
    if "mockneck" in g:
        return "Mockneck"
    if "crewneck" in g:
        return "Crewneck"
    return "Other"


# Problem 10: the catalogue's 22 color names grouped into shopper-friendly color filters.
COLOR_FAMILIES = [
    ("Navy", ["navy"]),
    ("Blue", ["royal blue", "light blue", "blue"]),
    ("Gray", ["gray", "grey", "charcoal"]),
    ("White", ["white", "cream", "ivory"]),
    ("Black", ["black"]),
    ("Red", ["red", "crimson", "maroon"]),
    ("Yellow & Gold", ["yellow", "gold"]),
    ("Green", ["green"]),
    ("Pink & Coral", ["coral", "pink"]),
    ("Multicolor", ["multicolor"]),
]


def color_family(color: str) -> str | None:
    """'navy blue' -> 'Navy', 'heather charcoal gray' -> 'Gray', 'light blue' -> 'Blue'."""
    c = color.lower()
    for family, words in COLOR_FAMILIES:
        if any(w in c for w in words):
            return family
    return None


def color_families(colors: list[str]) -> list[str]:
    return list(dict.fromkeys(f for f in (color_family(c) for c in colors) if f))


# Categories that are close enough to compare when a category has fewer than 3 items.
RELATED_CATEGORIES = {
    "Hoodie": ["Crewneck", "Quarter-zip"],
    "Crewneck": ["Hoodie", "Mockneck", "Quarter-zip"],
    "Mockneck": ["Crewneck", "Quarter-zip"],
    "Quarter-zip": ["Crewneck", "Hoodie", "Jacket"],
    "Jacket": ["Quarter-zip", "Hoodie"],
    "T-shirt": ["Long-sleeve"],
    "Long-sleeve": ["T-shirt", "Crewneck"],
    "Other": [],
}


def _sorted_stock(rows) -> list[SizeStock]:
    stock = [SizeStock(size=r["size"], quantity=r["quantity"]) for r in rows]
    return sorted(stock, key=lambda s: SIZE_ORDER.index(s.size) if s.size in SIZE_ORDER else 99)


def _stock_map(conn: sqlite3.Connection) -> dict[str, list[SizeStock]]:
    by_product: dict[str, list] = {}
    for r in conn.execute("SELECT product_id, size, quantity FROM inventory"):
        by_product.setdefault(r["product_id"], []).append(r)
    return {pid: _sorted_stock(rows) for pid, rows in by_product.items()}


def _summary(row: sqlite3.Row, stock: list[SizeStock]) -> ProductSummary:
    return ProductSummary(
        product_id=row["product_id"],
        name=row["name"],
        garment_type=row["garment_type"],
        price=row["price"],
        colors=json.loads(row["colors"]),
        sizes_in_stock=[s.size for s in stock if s.quantity > 0],
        sold_out_sizes=[s.size for s in stock if s.quantity == 0],
    )


def _singular(word: str) -> str:
    if len(word) > 3 and word.endswith("s") and not word.endswith("ss"):
        return word[:-1]
    return word


def _parse_query(query: str) -> tuple[list[str], list[str]]:
    """Split a query into (garment_type patterns, other search terms)."""
    words = [_singular(w) for w in re.findall(r"[a-z0-9/'-]+", query.lower()) if w not in STOPWORDS]
    if "long" in words and "sleeve" in words:
        words.append("long-sleeve")
    garment_patterns: list[str] = []
    terms: list[str] = []
    for w in words:
        key = w.replace("-", "") if w.replace("-", "") in GARMENT_GROUPS else w
        if key in GARMENT_GROUPS:
            garment_patterns += GARMENT_GROUPS[key]
        elif w not in ("long", "sleeve"):
            terms.append(w)
            terms += SYNONYMS.get(w, [])
    return list(dict.fromkeys(garment_patterns)), terms


def _short_description(text: str, max_len: int = 110) -> str:
    first = text.split(". ")[0].rstrip(".") + "."
    return first if len(first) <= max_len else first[: max_len - 1].rstrip() + "…"


def rank_products(
    deps: ShopDeps,
    query: str = "",
    max_price: float | None = None,
    size: str | None = None,
    require_size_in_stock: bool = False,
    min_price: float | None = None,
) -> list[tuple[ProductSummary, sqlite3.Row]]:
    """All matching products, best first.

    - Item-type words ("hoodies", "shirts", "quarter-zip") must match
      catalogue.garment_type, so "hoodies" never returns T-shirts.
    - Other words are scored against name (3 points), garment_type, description,
      colors, and search_tags (1 point each); an exact product name gets +20.
    - If any non-type words were given, at least one must match.
    - Price: explicit min/max win; otherwise the shopper's budget (deps.price_range) applies.
    """
    if deps.price_range:
        min_price = deps.price_range.min_price if min_price is None else min_price
        max_price = deps.price_range.max_price if max_price is None else max_price
    size = normalize_size(size) if size else None
    garment_patterns, terms = _parse_query(query)
    with _connect(deps) as conn:
        rows = conn.execute("SELECT * FROM catalogue").fetchall()
        stock = _stock_map(conn)

    scored = []
    for row in rows:
        if max_price is not None and row["price"] > max_price:
            continue
        if min_price is not None and row["price"] < min_price:
            continue
        gtype = row["garment_type"].lower()
        if garment_patterns and not any(g in gtype for g in garment_patterns):
            continue
        product_stock = stock.get(row["product_id"], [])
        summary = _summary(row, product_stock)
        if size:
            summary.requested_size = size
            summary.requested_size_quantity = next(
                (s.quantity for s in product_stock if s.size == size), 0
            )
            if require_size_in_stock and not summary.requested_size_quantity:
                continue
        name = row["name"].lower()
        text = " ".join(
            [name, gtype, row["description"], row["colors"], row["search_tags"]]
        ).lower()
        score = sum(3 if t in name else 1 for t in terms if t in text)
        if terms and score == 0:
            continue
        if query.strip() and name in query.lower():
            score += 20  # shopper named this exact product
        scored.append((score, summary, row))

    # Best match first; in-stock (for the asked size, or at all) beats sold out; then by name.
    def in_stock_rank(summary: ProductSummary) -> int:
        if summary.requested_size_quantity is not None:
            return 0 if summary.requested_size_quantity > 0 else 1
        return 0 if summary.sizes_in_stock else 1

    scored.sort(key=lambda t: (-t[0], in_stock_rank(t[1]), t[1].name))
    return [(summary, row) for _, summary, row in scored]


def search_products(
    deps: ShopDeps,
    query: str = "",
    max_price: float | None = None,
    size: str | None = None,
    limit: int = 8,
    min_price: float | None = None,
) -> SearchToolResult:
    """Search for the agent. Sold-out items are NOT hidden when a size is given
    (the shopper may be asking about a specific item); see requested_size_quantity."""
    ranked = rank_products(deps, query, max_price, size, min_price=min_price)
    prices = [summary.price for summary, _ in ranked]
    return SearchToolResult(
        total_matches=len(ranked),
        lowest_price=min(prices) if prices else None,
        highest_price=max(prices) if prices else None,
        in_stock_in_requested_size=(
            sum(1 for summary, _ in ranked if summary.requested_size_quantity) if size else None
        ),
        results=[summary for summary, _ in ranked[: max(1, min(limit, 12))]],
    )


def search_page(deps: ShopDeps, spec: SearchSpec, offset: int = 0, limit: int = 5) -> SearchResults:
    """One page of product cards for the website (chat search and 'See more')."""
    ranked = rank_products(
        deps, spec.query, spec.max_price, spec.size, require_size_in_stock=True, min_price=spec.min_price
    )
    page = ranked[offset: offset + limit]
    return SearchResults(
        label=spec.label,
        query=spec.query,
        min_price=spec.min_price,
        max_price=spec.max_price,
        size=normalize_size(spec.size) if spec.size else None,
        total=len(ranked),
        offset=offset,
        limit=limit,
        has_more=offset + limit < len(ranked),
        products=[
            ProductMatch(
                category=garment_category(summary.garment_type),
                product_id=summary.product_id,
                name=summary.name,
                garment_type=summary.garment_type,
                price=summary.price,
                image_url=f"/images/{row['image_file_path']}",
                short_description=_short_description(row["description"]),
                sizes_in_stock=summary.sizes_in_stock,
            )
            for summary, row in page
        ],
    )


def get_product_details(deps: ShopDeps, product_id: str) -> ProductDetails | str:
    """Full description, price, colors, and stock for every size of one product."""
    with _connect(deps) as conn:
        row = conn.execute("SELECT * FROM catalogue WHERE product_id = ?", (product_id,)).fetchone()
        if row is None:
            return f"No product with id '{product_id}'. Use search_products to find valid ids."
        stock = _sorted_stock(
            conn.execute("SELECT size, quantity FROM inventory WHERE product_id = ?", (product_id,))
        )
    base = _summary(row, stock)
    return ProductDetails(
        **base.model_dump(),
        description=row["description"],
        search_tags=json.loads(row["search_tags"]),
        stock_by_size=stock,
        total_in_stock=sum(s.quantity for s in stock),
    )


def check_stock(deps: ShopDeps, product_id: str, size: str) -> StockCheck | str:
    """How many of one product are in stock in one size, plus the other sizes in stock."""
    size = normalize_size(size)
    with _connect(deps) as conn:
        row = conn.execute(
            "SELECT name, price FROM catalogue WHERE product_id = ?", (product_id,)
        ).fetchone()
        if row is None:
            return f"No product with id '{product_id}'. Use search_products to find valid ids."
        stock = _sorted_stock(
            conn.execute("SELECT size, quantity FROM inventory WHERE product_id = ?", (product_id,))
        )
    match = next((s for s in stock if s.size == size), None)
    if match is None:
        return f"'{row['name']}' does not come in size '{size}'. Sizes are {', '.join(s.size for s in stock)}."

    others = [s.size for s in stock if s.quantity > 0 and s.size != size]
    if match.quantity > 0:
        next_step = "In stock. Tell the shopper the quantity and price."
    else:
        next_step = (
            "SOLD OUT in this size. Say so clearly, apologize, mention other_sizes_in_stock if any, "
            "ask if they want an email when it is back in stock, add it to out_of_stock, "
            "set offer_restock_email=true, and include a super funny dog joke."
        )
    return StockCheck(
        product_id=product_id,
        name=row["name"],
        price=row["price"],
        size=size,
        quantity=match.quantity,
        in_stock=match.quantity > 0,
        other_sizes_in_stock=others,
        next_step=next_step,
    )


def request_restock_email(
    deps: ShopDeps, product_id: str, size: str, email: str | None = None
) -> RestockRequestResult | str:
    """Save a request to email the shopper when a sold-out size is back in stock.

    Logged-in shoppers default to their account email.
    """
    size = normalize_size(size)
    email = (email or deps.customer_email or "").strip().lower()
    if not email:
        return "No email yet. Ask the shopper which email address we should use."
    if not EMAIL_RE.match(email):
        return f"'{email}' doesn't look like a valid email address. Ask the shopper to check it."

    with _connect(deps) as conn:
        row = conn.execute("SELECT name FROM catalogue WHERE product_id = ?", (product_id,)).fetchone()
        if row is None:
            return f"No product with id '{product_id}'. Use search_products to find valid ids."
        inv = conn.execute(
            "SELECT quantity FROM inventory WHERE product_id = ? AND size = ?", (product_id, size)
        ).fetchone()
    if inv is None:
        return f"'{row['name']}' does not come in size '{size}'."
    if inv["quantity"] > 0:
        return f"'{row['name']}' is already in stock in {size} ({inv['quantity']} available). No alert needed."

    with _connect(deps, read_only=False) as conn:
        cur = conn.execute(
            "INSERT OR IGNORE INTO restock_requests (product_id, size, email, user_id) VALUES (?, ?, ?, ?)",
            (product_id, size, email, deps.user_id),
        )
    already = cur.rowcount == 0
    deps.restock_saved = True
    return RestockRequestResult(
        saved=True,
        product_id=product_id,
        name=row["name"],
        size=size,
        message=(
            "This email was already on the list for this item and size."
            if already
            else "Saved. We'll email the shopper when it's back in stock."
        ),
    )


def product_cards(
    deps: ShopDeps, product_ids: list[str], out_of_stock: list[OutOfStockNotice] | None = None
) -> list[ProductCard]:
    """Turn product ids from the agent into cards for the website.

    Ids that aren't in the catalogue are dropped, so the chat can never show a
    made-up product. Sold-out badges are re-checked against the inventory table
    instead of trusting the model.
    """
    ids = list(dict.fromkeys(product_ids + [n.product_id for n in out_of_stock or []]))
    if not ids:
        return []
    asked_sizes: dict[str, list[str]] = {}
    for n in out_of_stock or []:
        asked_sizes.setdefault(n.product_id, []).append(normalize_size(n.size))

    with _connect(deps) as conn:
        stock = _stock_map(conn)
        cards = []
        for pid in ids:
            row = conn.execute("SELECT * FROM catalogue WHERE product_id = ?", (pid,)).fetchone()
            if row is None:
                continue
            sizes = stock.get(pid, [])
            zero = {s.size for s in sizes if s.quantity == 0}
            cards.append(ProductCard(
                product_id=pid,
                name=row["name"],
                price=row["price"],
                image_url=f"/images/{row['image_file_path']}",
                sizes_in_stock=[s.size for s in sizes if s.quantity > 0],
                sold_out_sizes=[s for s in asked_sizes.get(pid, []) if s in zero],
            ))
    return cards[:4]


# ---------------------------------------------------------------------------
# Customer memory: who the shopper is, what page they're on, saved chat history
# ---------------------------------------------------------------------------

PAGE_NAMES = {
    "/": "Home page",
    "/products": "All Products page",
    "/about": "About Us page",
    "/login": "Log In page",
    "/create-account": "Create Account page",
    "/forgot": "Forgot username or password page",
}


def get_customer_profile(deps: ShopDeps) -> CustomerProfile | str:
    """The logged-in shopper's name, email, and account info (never the password hash)."""
    if deps.user_id is None:
        return "The shopper is not logged in, so there is no profile. You may invite them to log in."
    with _connect(deps) as conn:
        row = conn.execute(
            "SELECT first_name, last_name, email, created_at FROM users WHERE id = ?", (deps.user_id,)
        ).fetchone()
        count = conn.execute(
            "SELECT COUNT(*) FROM chat_messages WHERE user_id = ?", (deps.user_id,)
        ).fetchone()[0]
    if row is None:
        return "Account not found."
    return CustomerProfile(
        first_name=row["first_name"] or "",
        last_name=row["last_name"] or "",
        email=row["email"],
        member_since=row["created_at"][:10],
        saved_chat_messages=count,
    )


def get_current_page(deps: ShopDeps) -> CurrentPage:
    """What the shopper is looking at, including full details of an on-screen product."""
    page = deps.page or PageContext()
    product = None
    if page.product_id:
        details = get_product_details(deps, page.product_id)
        product = details if isinstance(details, ProductDetails) else None
    if product is not None:
        name = f"Product page for {product.name}"
    elif page.path.startswith("/products/"):
        name = "Product page (product not found)"
    else:
        name = PAGE_NAMES.get(page.path, f"Page {page.path}")
    return CurrentPage(
        path=page.path, page_name=name, product=product, showing_search_results=page.search_label
    )


def page_summary(deps: ShopDeps) -> str:
    """One-line page context added to the agent's instructions every turn."""
    current = get_current_page(deps)
    text = f"The shopper is currently on the {current.page_name} ({current.path})."
    if current.product:
        p = current.product
        text += (
            f' "This product" / "this one" / "it" most likely means {p.name} '
            f"(product_id {p.product_id}, ${p.price:.2f}, colors: {', '.join(p.colors) or 'not listed'}). "
            "Call get_current_page for its full description and stock."
        )
    if current.showing_search_results:
        text += f' The page is also showing chat search results: "{current.showing_search_results}".'
    return text


def save_chat_turn(db_path: Path, user_id: int, user_message: str, response: ChatResponse) -> None:
    """Save the shopper's message and the bot's reply to chat_messages."""
    extras = {
        "products": [p.model_dump() for p in response.products],
        "matches": response.matches.model_dump() if response.matches else None,
        "dog_joke": response.dog_joke,
        "emoji": response.emoji,
    }
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            "INSERT INTO chat_messages (user_id, role, content, products_json) VALUES (?, 'user', ?, NULL)",
            (user_id, user_message),
        )
        conn.execute(
            "INSERT INTO chat_messages (user_id, role, content, products_json) VALUES (?, 'assistant', ?, ?)",
            (user_id, response.reply, json.dumps(extras)),
        )


def load_chat_history(db_path: Path, user_id: int, limit: int = 50) -> list[SavedChatMessage]:
    """A shopper's most recent saved messages, oldest first.

    products_json comes in two formats: a plain list of product dicts (the rows that
    shipped with the database) or our dict with products/matches/dog_joke/emoji.
    Product cards are rebuilt from the catalogue so prices and stock are current.
    """
    deps = ShopDeps(db_path=db_path)
    with _connect(deps) as conn:
        rows = conn.execute(
            "SELECT role, content, products_json, created_at FROM chat_messages "
            "WHERE user_id = ? ORDER BY id DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()

    messages = []
    for row in reversed(rows):
        extras = {}
        try:
            extras = json.loads(row["products_json"]) if row["products_json"] else {}
        except json.JSONDecodeError:
            pass
        if isinstance(extras, list):  # original format: list of product dicts
            extras = {"products": extras}
        ids = [p.get("product_id") for p in extras.get("products") or [] if isinstance(p, dict)]
        sold_out = [
            OutOfStockNotice(product_id=p["product_id"], size=size)
            for p in extras.get("products") or [] if isinstance(p, dict)
            for size in p.get("sold_out_sizes") or []
        ]
        matches = None
        if extras.get("matches"):
            try:
                matches = SearchResults.model_validate(extras["matches"])
            except ValueError:
                matches = None
        messages.append(SavedChatMessage(
            role=row["role"],
            content=row["content"],
            products=product_cards(deps, [i for i in ids if i], sold_out),
            matches=matches,
            dog_joke=extras.get("dog_joke"),
            emoji=extras.get("emoji"),
            created_at=row["created_at"],
        ))
    return messages


def clear_chat_history(db_path: Path, user_id: int) -> int:
    with sqlite3.connect(db_path) as conn:
        return conn.execute("DELETE FROM chat_messages WHERE user_id = ?", (user_id,)).rowcount


# ---------------------------------------------------------------------------
# Problem 9: compare similar products, price ranges, Surprise me
# ---------------------------------------------------------------------------


def _all_products(deps: ShopDeps) -> list[tuple[ProductSummary, sqlite3.Row]]:
    with _connect(deps) as conn:
        rows = conn.execute("SELECT * FROM catalogue").fetchall()
        stock = _stock_map(conn)
    return [(_summary(r, stock.get(r["product_id"], [])), r) for r in rows]


def compare_products(deps: ShopDeps, product_id: str, count: int = 3) -> ComparisonResult | str:
    """Find `count` products most similar to one product and compare their prices.

    Similar = same category first (then related categories), in stock, closest in
    price, and sharing search_tags. Stays inside the shopper's budget if one is set.
    """
    products = _all_products(deps)
    base = next(((s, r) for s, r in products if s.product_id == product_id), None)
    if base is None:
        return f"No product with id '{product_id}'. Use search_products to find valid ids."
    base_summary, base_row = base
    category = garment_category(base_summary.garment_type)
    base_tags = {t.lower() for t in json.loads(base_row["search_tags"])} - {"yale", "campus customs"}
    budget = deps.price_range

    def candidates(categories: list[str]):
        """(similarity score, summary, shared tags), most similar first."""
        out = []
        for summary, row in products:
            if summary.product_id == product_id or garment_category(summary.garment_type) not in categories:
                continue
            if not summary.sizes_in_stock:
                continue
            if budget and not budget.contains(summary.price):
                continue
            tags = {t.lower() for t in json.loads(row["search_tags"])} & base_tags
            score = abs(summary.price - base_summary.price) / 10 - len(tags)  # lower = more similar
            out.append((score, summary, tags))
        return sorted(out, key=lambda t: (t[0], t[1].name))

    pool = candidates([category])
    note = None
    if len(pool) < count:
        pool += candidates(RELATED_CATEGORIES.get(category, []))
        note = f"Fewer than {count} other {category.lower()}s matched, so similar categories were included."

    # Pick a useful spread: the most similar item, the best cheaper option, and the
    # best premium option (when they exist), then fill with the next most similar.
    picked: list = []
    def take(entry):
        if entry and entry[1].product_id not in {p[1].product_id for p in picked} and len(picked) < count:
            picked.append(entry)
    take(pool[0] if pool else None)
    take(next((c for c in pool if c[1].price < base_summary.price), None))
    take(next((c for c in pool if c[1].price > base_summary.price), None))
    for c in pool:
        take(c)
    picked.sort(key=lambda c: c[1].price)
    if budget:
        note = (note + " " if note else "") + f"Only products in the shopper's price range ({budget.label()}) were considered."

    similar = [
        ComparedProduct(
            product_id=summ.product_id,
            name=summ.name,
            garment_type=summ.garment_type,
            price=summ.price,
            price_difference=round(summ.price - base_summary.price, 2),
            colors=summ.colors,
            sizes_in_stock=summ.sizes_in_stock,
            why_similar=(
                f"Also a {garment_category(summ.garment_type).lower()}"
                + (f"; shares: {', '.join(sorted(tags)[:3])}" if tags else "")
            ),
        )
        for _, summ, tags in picked
    ]
    everything = [(base_summary.name, base_summary.price)] + [(c.name, c.price) for c in similar]
    return ComparisonResult(
        product=base_summary,
        category=category,
        similar=similar,
        cheapest=min(everything, key=lambda t: t[1])[0],
        most_expensive=max(everything, key=lambda t: t[1])[0],
        note=note,
    )


def comparison_table(deps: ShopDeps, product_id: str) -> Comparison | None:
    """The comparison as a table for the chat (same picks the agent saw)."""
    result = compare_products(deps, product_id)
    if not isinstance(result, ComparisonResult):
        return None
    with _connect(deps) as conn:
        images = {
            r["product_id"]: f"/images/{r['image_file_path']}"
            for r in conn.execute("SELECT product_id, image_file_path FROM catalogue")
        }
    base = result.product
    rows = [ComparisonRow(
        product_id=base.product_id, name=base.name, price=base.price, price_difference=0,
        image_url=images[base.product_id], sizes_in_stock=base.sizes_in_stock, is_viewed=True,
    )] + [
        ComparisonRow(
            product_id=c.product_id, name=c.name, price=c.price, price_difference=c.price_difference,
            image_url=images[c.product_id], sizes_in_stock=c.sizes_in_stock, is_viewed=False,
        )
        for c in result.similar
    ]
    return Comparison(category=result.category, rows=rows)


def surprise_me(deps: ShopDeps, count: int = 5) -> SearchResults:
    """`count` random in-stock products, each from a DIFFERENT category."""
    by_category: dict[str, list[tuple[ProductSummary, sqlite3.Row]]] = {}
    for summary, row in _all_products(deps):
        if summary.sizes_in_stock:
            by_category.setdefault(garment_category(summary.garment_type), []).append((summary, row))
    categories = random.sample(sorted(by_category), k=min(count, len(by_category)))
    picks = [random.choice(by_category[c]) for c in categories]
    return SearchResults(
        kind="surprise",
        label="Surprise picks",
        query="",
        total=len(picks),
        offset=0,
        limit=len(picks),
        has_more=False,
        products=[
            ProductMatch(
                category=garment_category(summary.garment_type),
                product_id=summary.product_id,
                name=summary.name,
                garment_type=summary.garment_type,
                price=summary.price,
                image_url=f"/images/{row['image_file_path']}",
                short_description=_short_description(row["description"]),
                sizes_in_stock=summary.sizes_in_stock,
            )
            for summary, row in picks
        ],
    )


# ---------------------------------------------------------------------------
# Dog joke book. The agent decides *when* to tell a joke (AgentReply.tell_dog_joke);
# the backend picks *which* one here, skipping jokes already told in this chat.
# ---------------------------------------------------------------------------

DOG_JOKES = [
    # Shopping, clothes, and sizes
    "What do you call a dog wearing a hoodie on a cold day? A chili dog.",
    "Why did the dog get a job at the clothing store? He'd always wanted to work in re-tail.",
    "Why did the dog refuse to buy the cheap sweater? It was too ruff around the edges.",
    "What do you call a dog that sells sweatshirts? A hood-hound.",
    "Why did the dog wear a sweater to the game? Because it was a little nippy out.",
    "What's a dog's favorite part of shopping online? Clicking 'add to bark-it.'",
    # Yale and campus
    "What's a dog's favorite class at Yale? Any course with a lab.",
    "Why did the bulldog ace his Yale exam? He was the teacher's pet.",
    "What do you call a sleeping bulldog? A bull-dozer.",
    "Why did Handsome Dan bring a pencil to The Game? In case they needed to draw a tie.",
    # Classic winners
    "What do you call a dog magician? A Labracadabrador.",
    "What do you call a frozen dog? A pupsicle.",
    "What do you call a famous dog detective? Sherlock Bones.",
    "Where do dogs park their cars? In the barking lot.",
    "How does a dog stop a video? He hits the paws button.",
    "What's a dog's favorite pizza? Pupperoni.",
    "What's a dog's favorite city? New Yorkie.",
    "Why are Dalmatians terrible at hide and seek? They're always spotted.",
    "What do you call a dog that loves bubble baths? A shampoodle.",
    "What happens when it rains cats and dogs? You might step in a poodle.",
    "What's a dog's favorite instrument? The trom-bone.",
    "Why don't dogs ever win at poker? Every time they get a good hand, they wag their tail.",
    "Why are dogs such great storytellers? Every one of them has a tale.",
    "What kind of dog does a vampire have? A bloodhound.",
    "What do you call a dog that can tell time? A watchdog.",
    "Why did the dog chase his tail? He was trying to make ends meet.",
    "Why did the dog sit in the shade? He didn't want to be a hot dog.",
    "What did the dog say when he sat on sandpaper? 'Ruff!'",
    "Why do dogs run in circles? Because it's really hard to run in squares.",
    "What do you call a dog who meditates? Aware wolf.",
]


def pick_dog_joke(already_told: list[str] | None = None) -> str:
    """Return a random joke the shopper hasn't heard in this chat (if possible)."""
    told = set(already_told or [])
    fresh = [j for j in DOG_JOKES if j not in told]
    return random.choice(fresh or DOG_JOKES)
