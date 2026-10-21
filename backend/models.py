"""PydanticAI structured types for the Campus Customs chatbot."""

import random

from pydantic import BaseModel, Field

DOG_EMOJIS = ["🐶", "🐕", "🦮", "🐾", "🦴", "🐩", "🐕‍🦺", "🌭"]


def random_dog_emoji() -> str:
    return random.choice(DOG_EMOJIS)


# ---------------------------------------------------------------------------
# What the agent returns (PydanticAI output type)
# ---------------------------------------------------------------------------


class OutOfStockNotice(BaseModel):
    """One product + size the shopper asked about that has 0 in stock."""

    product_id: str = Field(description="product_id from a tool result.")
    size: str = Field(description="The sold-out size: XS, S, M, L, XL, or XXL.")


class PriceRange(BaseModel):
    """A shopper's budget. Either end may be open."""

    min_price: float | None = Field(default=None, ge=0, description="Lowest price in dollars, or null.")
    max_price: float | None = Field(default=None, ge=0, description="Highest price in dollars, or null.")

    def contains(self, price: float) -> bool:
        return (self.min_price is None or price >= self.min_price) and (
            self.max_price is None or price <= self.max_price
        )

    def label(self) -> str:
        if self.min_price is not None and self.max_price is not None:
            return f"${self.min_price:.0f}–${self.max_price:.0f}"
        if self.max_price is not None:
            return f"under ${self.max_price:.0f}"
        if self.min_price is not None:
            return f"${self.min_price:.0f}+"
        return "any price"


class SearchSpec(BaseModel):
    """The catalogue search to show on the page when a shopper browses a type of item."""

    label: str = Field(description="Short heading for the results, e.g. 'Hoodies' or 'Navy T-shirts under $40'.")
    query: str = Field(description="Search words, e.g. 'hoodie', 'shirt hoodie', 'navy t-shirt', 'Davenport'.")
    min_price: float | None = Field(default=None, description="Only include items at or above this price.")
    max_price: float | None = Field(default=None, description="Only include items at or below this price.")
    size: str | None = Field(default=None, description="Only include items in stock in this size.")


class AgentReply(BaseModel):
    """Structured output the agent must produce for every message."""

    reply: str = Field(description="Friendly message to the shopper, in the Campus Customs voice.")
    product_ids: list[str] = Field(
        default_factory=list,
        max_length=4,
        description="product_id values from tool results about specific items discussed, best first.",
    )
    search: SearchSpec | None = Field(
        default=None,
        description="Set when the shopper is browsing a type of item; the website shows the matches as product cards on the page.",
    )
    out_of_stock: list[OutOfStockNotice] = Field(
        default_factory=list,
        description="Every product + size from this turn that a tool showed has quantity 0.",
    )
    offer_restock_email: bool = Field(
        default=False,
        description="True when the reply asks the shopper if they want an email when an item is back in stock.",
    )
    tell_dog_joke: bool = Field(
        default=False,
        description="True to add a dog joke under the reply. Required when out_of_stock is not empty.",
    )
    suggest_login: bool = Field(
        default=False,
        description="True (guests only, once per chat) to show Log in / Create account buttons under the reply.",
    )
    compare_product_id: str | None = Field(
        default=None,
        description="Set to a product_id after calling compare_products, to show the comparison table in the chat.",
    )
    ask_price_range: bool = Field(
        default=False,
        description="True when the reply asks the shopper for a price range (shows quick budget buttons).",
    )
    price_range: PriceRange | None = Field(
        default=None,
        description="Set when the shopper states or changes their budget this turn.",
    )
    clear_price_range: bool = Field(default=False, description="True when the shopper says they have no budget limit.")


# ---------------------------------------------------------------------------
# What tools return to the agent
# ---------------------------------------------------------------------------


class SizeStock(BaseModel):
    size: str
    quantity: int


class ProductSummary(BaseModel):
    """Short product info returned by search_products."""

    product_id: str
    name: str
    garment_type: str
    price: float
    colors: list[str]
    sizes_in_stock: list[str]
    sold_out_sizes: list[str]
    requested_size: str | None = None
    requested_size_quantity: int | None = Field(
        default=None, description="Stock in the size passed to search_products (0 = sold out in that size)."
    )


class ProductDetails(ProductSummary):
    """Full product info returned by get_product_details."""

    description: str
    search_tags: list[str]
    stock_by_size: list[SizeStock]
    total_in_stock: int


class ComparedProduct(BaseModel):
    """One similar product in a comparison."""

    product_id: str
    name: str
    garment_type: str
    price: float
    price_difference: float = Field(description="This price minus the viewed product's price (negative = cheaper).")
    colors: list[str]
    sizes_in_stock: list[str]
    why_similar: str


class ComparisonResult(BaseModel):
    """What compare_products returns: the viewed product + 3 similar ones."""

    product: ProductSummary
    category: str
    similar: list[ComparedProduct]
    cheapest: str
    most_expensive: str
    note: str | None = None


class SearchToolResult(BaseModel):
    """What search_products returns to the agent."""

    total_matches: int = Field(description="How many catalogue items match in total (any stock).")
    lowest_price: float | None = Field(default=None, description="Lowest price across ALL matches (not just the results shown).")
    highest_price: float | None = Field(default=None, description="Highest price across ALL matches.")
    in_stock_in_requested_size: int | None = Field(
        default=None,
        description="When a size was given: how many matches have that size in stock. "
        "This is the number of cards the page will show for a search with that size.",
    )
    results: list[ProductSummary] = Field(description="The best matches, best first.")


class StockCheck(BaseModel):
    """Result of check_stock for one product in one size."""

    product_id: str
    name: str
    price: float
    size: str
    quantity: int
    in_stock: bool
    other_sizes_in_stock: list[str] = Field(
        description="Sizes of this product that are in stock (useful when the asked size is sold out)."
    )
    next_step: str = Field(description="What the agent should do next with this result.")


class CustomerProfile(BaseModel):
    """Who the logged-in shopper is (returned by get_customer_profile)."""

    first_name: str
    last_name: str
    email: str
    member_since: str
    saved_chat_messages: int


class CurrentPage(BaseModel):
    """What the shopper is looking at right now (returned by get_current_page)."""

    path: str
    page_name: str
    product: ProductDetails | None = Field(
        default=None, description="Full details of the product on screen, when on a product page."
    )
    showing_search_results: str | None = Field(
        default=None, description="Label of the 'Bulldog's picks' results shown on the page, if any."
    )


class RestockRequestResult(BaseModel):
    """Result of saving a back-in-stock email request."""

    saved: bool
    product_id: str
    name: str
    size: str
    message: str


# ---------------------------------------------------------------------------
# What the /api/chat route sends to the website
# ---------------------------------------------------------------------------


class ProductCard(BaseModel):
    """A product card the chat widget shows under the bot's reply."""

    product_id: str
    name: str
    price: float
    image_url: str
    sizes_in_stock: list[str]
    sold_out_sizes: list[str] = Field(
        default_factory=list,
        description="Sizes the shopper asked about this turn that are sold out (shown as a badge).",
    )


class ProductMatch(BaseModel):
    """One product card shown on the page for a chat search."""

    category: str | None = None
    product_id: str
    name: str
    garment_type: str
    price: float
    image_url: str
    short_description: str
    sizes_in_stock: list[str]


class SearchResults(BaseModel):
    """Structured product matches sent to the website (one page of results)."""

    kind: str = "search"  # "search" (chat) or "surprise" (Surprise me button)
    label: str
    query: str
    min_price: float | None = None
    max_price: float | None = None
    size: str | None = None
    total: int
    offset: int
    limit: int
    has_more: bool
    products: list[ProductMatch]


class ChatTurn(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    dog_joke: str | None = None  # joke shown with an assistant turn (so it isn't repeated)


class PageContext(BaseModel):
    """Sent by the website with every chat message: where the shopper is."""

    path: str = Field(default="/", max_length=300)
    product_id: str | None = Field(default=None, max_length=200, description="Set on /products/<product_id> pages.")
    search_label: str | None = Field(default=None, max_length=200, description="Label of on-page chat results, if shown.")


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=40)
    page: PageContext | None = None
    price_range: PriceRange | None = None  # the shopper's current budget, remembered by the website


class ComparisonRow(BaseModel):
    product_id: str
    name: str
    price: float
    price_difference: float
    image_url: str
    sizes_in_stock: list[str]
    is_viewed: bool


class Comparison(BaseModel):
    """Comparison table shown in the chat."""

    category: str
    rows: list[ComparisonRow]


class ChatResponse(BaseModel):
    reply: str
    products: list[ProductCard] = Field(default_factory=list)
    matches: SearchResults | None = None
    offer_restock_email: bool = False
    suggest_login: bool = False
    comparison: Comparison | None = None
    ask_price_range: bool = False
    price_range: PriceRange | None = None  # budget now in effect (website remembers it)
    dog_joke: str | None = None
    emoji: str = Field(default_factory=random_dog_emoji)
    saved: bool = Field(default=False, description="True when this turn was saved to the shopper's chat history.")


class SavedChatMessage(BaseModel):
    """One message from a logged-in shopper's saved chat history."""

    role: str
    content: str
    products: list[ProductCard] = Field(default_factory=list)
    matches: SearchResults | None = None
    dog_joke: str | None = None
    emoji: str | None = None
    created_at: str


class ChatHistoryResponse(BaseModel):
    first_name: str
    messages: list[SavedChatMessage]
