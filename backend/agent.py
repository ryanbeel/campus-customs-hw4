"""Campus Customs chatbot: wires the prompt file, model, and tools into a PydanticAI agent."""

import asyncio
import json
import os
import re
import threading
import uuid
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

os.environ.setdefault("PYDANTIC_AI_NO_BANNER", "1")

from dotenv import load_dotenv
from pydantic_ai import Agent, ModelRetry, RunContext, capture_run_messages
from pydantic_ai.exceptions import ModelHTTPError, UsageLimitExceeded
from pydantic_ai.messages import (
    ModelMessage,
    ModelRequest,
    ModelResponse,
    RetryPromptPart,
    TextPart,
    ToolCallPart,
    ToolReturnPart,
    UserPromptPart,
)
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.usage import UsageLimits

import tools
from models import (
    AgentReply,
    ChatResponse,
    ChatTurn,
    ComparisonResult,
    CurrentPage,
    CustomerProfile,
    PageContext,
    PriceRange,
    ProductDetails,
    RestockRequestResult,
    SearchToolResult,
    StockCheck,
)
from tools import ShopDeps, pick_dog_joke

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
PROMPT_PATH = HERE / "prompts" / "prompt.md"
DB_PATH = ROOT / "data" / "campus_customs.db"

PORTKEY_BASE_URL = "https://api.portkey.ai/v1"
DEFAULT_MODEL = "gpt-5.6-luna"
PAGE_SIZE = 5  # product cards per page of chat search results
HISTORY_TURNS = 20  # saved messages given to the model as memory

# Safety limits for one chat turn (Problem 12). Env vars allow testing with small values.
MAX_RUN_SECONDS = float(os.getenv("AGENT_MAX_RUN_SECONDS", "180"))  # stop after 3 minutes
MAX_LOOP_ITERATIONS = int(os.getenv("AGENT_MAX_ITERATIONS", "20"))  # stop after 20 agent-loop iterations

TIMEOUT_REPLY = (
    "Ruh-roh, that took me too long, so I stopped to keep things speedy. "
    "Could you try asking again, maybe a little more simply?"
)
LOOP_LIMIT_REPLY = (
    "Woof, I went in circles on that one, so I stopped myself. "
    "Could you ask in a slightly different way? I'm happy to help!"
)

# Shown when the model provider's own safety filter blocks a message.
BLOCKED_REPLY = (
    "Let's keep things friendly! I can only help with Campus Customs gear, "
    "like finding a hoodie, checking a price, or seeing what sizes are in stock."
)

# PORTKEY_API_KEY and OPENAI_MODEL live in .env in the project root (see .env.example).
load_dotenv(ROOT / ".env")


def build_model() -> OpenAIChatModel:
    key = os.getenv("PORTKEY_API_KEY", "").strip()
    if not key:
        raise RuntimeError("PORTKEY_API_KEY is missing. Copy .env.example to .env in the project root and add your key.")
    model_name = os.getenv("OPENAI_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
    provider = OpenAIProvider(api_key=key, base_url=PORTKEY_BASE_URL)
    return OpenAIChatModel(model_name, provider=provider)


def load_prompt() -> str:
    return PROMPT_PATH.read_text(encoding="utf-8")


@lru_cache(maxsize=1)
def get_agent() -> Agent[ShopDeps, AgentReply]:
    """Create the agent once, on first use."""
    agent = Agent(
        build_model(),
        deps_type=ShopDeps,
        output_type=AgentReply,
        instructions=load_prompt(),
        retries=2,
    )

    @agent.instructions
    def customer_context(ctx: RunContext[ShopDeps]) -> str:
        """Who the shopper is, added fresh every turn."""
        d = ctx.deps
        if d.user_id is None:
            return (
                "The shopper is NOT logged in (guest). Their chat is not saved. "
                "To save a back-in-stock request, ask for their email."
            )
        return (
            f"The shopper is logged in as {d.customer_first_name} {d.customer_last_name or ''} "
            f"(email: {d.customer_email}). Their chat history is saved and reloads when they return. "
            "request_restock_email can use their account email without asking."
        )

    @agent.instructions
    def page_context(ctx: RunContext[ShopDeps]) -> str:
        """What page the shopper is on, added fresh every turn."""
        return tools.page_summary(ctx.deps)

    @agent.instructions
    def budget_context(ctx: RunContext[ShopDeps]) -> str:
        """The shopper's price range, added fresh every turn."""
        budget = ctx.deps.price_range
        if budget is None:
            return "The shopper has not given a price range yet."
        return (
            f"The shopper's price range is {budget.label()} "
            f"(min_price={budget.min_price}, max_price={budget.max_price}). Only recommend products in this range; "
            "search_products, search results on the page, and compare_products already apply it."
        )

    @agent.output_validator
    def check_out_of_stock_rules(ctx: RunContext[ShopDeps], output: AgentReply) -> AgentReply:
        """Enforce the out-of-stock rules from prompt.md."""
        if output.out_of_stock and not output.tell_dog_joke:
            raise ModelRetry("out_of_stock is not empty, so set tell_dog_joke=true.")
        if output.out_of_stock and not output.offer_restock_email and not ctx.deps.restock_saved:
            raise ModelRetry(
                "out_of_stock is not empty, so set offer_restock_email=true and ask if they want "
                "an email when it's back in stock (unless a restock request was just saved)."
            )
        return output

    @agent.tool
    def search_products(
        ctx: RunContext[ShopDeps],
        query: str = "",
        max_price: float | None = None,
        size: str | None = None,
        limit: int = 8,
        min_price: float | None = None,
    ) -> SearchToolResult:
        """Search the catalogue by keywords (type, color, team, college, design...).

        Item-type words (hoodie, shirt, crewneck, quarter-zip, jacket...) only match
        that type of garment. Returns total_matches plus the best results.

        Args:
            query: Words describing what the shopper wants, e.g. "navy hoodie" or "Harvard game tee".
            max_price: Only return products at or below this price in dollars.
            size: A size to check (XS, S, M, L, XL, XXL). Sold-out items are still returned,
                with requested_size_quantity = 0, so you can tell the shopper honestly.
            limit: Max results (1-12).
            min_price: Only return products at or above this price in dollars.

        If the shopper gave a price range, it is applied automatically.
        """
        return tools.search_products(ctx.deps, query, max_price, size, limit, min_price)

    @agent.tool
    def compare_products(ctx: RunContext[ShopDeps], product_id: str) -> ComparisonResult | str:
        """Compare one product (usually the one on screen) with 3 similar products.

        Picks the most similar item, the best cheaper option, and the best premium option
        in the same category (in stock, within the shopper's price range), and returns
        each price difference. After calling it, set compare_product_id to the same id
        so the comparison table shows in the chat.
        """
        return tools.compare_products(ctx.deps, product_id)

    @agent.tool
    def get_current_page(ctx: RunContext[ShopDeps]) -> CurrentPage:
        """What the shopper is looking at right now: the page, and (on a product page) the
        product's full description, colors, price, and stock by size.

        Use this when the shopper says "this", "this one", "it", or "the one I'm looking at".
        """
        return tools.get_current_page(ctx.deps)

    @agent.tool
    def get_customer_profile(ctx: RunContext[ShopDeps]) -> CustomerProfile | str:
        """The logged-in shopper's first name, last name, email, member-since date, and how many
        chat messages are saved. Returns a note if they're a guest."""
        return tools.get_customer_profile(ctx.deps)

    @agent.tool
    def get_product_details(ctx: RunContext[ShopDeps], product_id: str) -> ProductDetails | str:
        """Get the full description, colors, price, and stock for every size of one product."""
        return tools.get_product_details(ctx.deps, product_id)

    @agent.tool
    def check_stock(ctx: RunContext[ShopDeps], product_id: str, size: str) -> StockCheck | str:
        """Check how many of one product are in stock in one size (XS, S, M, L, XL, XXL).

        Always use this (or get_product_details) before saying whether a size is in stock.
        """
        return tools.check_stock(ctx.deps, product_id, size)

    @agent.tool
    def request_restock_email(
        ctx: RunContext[ShopDeps], product_id: str, size: str, email: str | None = None
    ) -> RestockRequestResult | str:
        """Save the shopper's request to be emailed when a sold-out size is back in stock.

        Only call this after the shopper says yes. Logged-in shoppers don't need to give an email.

        Args:
            product_id: The sold-out product.
            size: The sold-out size.
            email: The shopper's email (only needed if they are not logged in).
        """
        return tools.request_restock_email(ctx.deps, product_id, size, email)

    return agent


def to_message_history(history: list[ChatTurn]) -> list[ModelMessage]:
    """Convert the website's chat history into PydanticAI messages."""
    messages: list[ModelMessage] = []
    for turn in history[-20:]:
        if turn.role == "user":
            messages.append(ModelRequest(parts=[UserPromptPart(content=turn.content)]))
        elif turn.role == "assistant":
            text = f"{turn.content}\n\n(Dog joke shown: {turn.dog_joke})" if turn.dog_joke else turn.content
            messages.append(ModelResponse(parts=[TextPart(content=text)]))
    return messages


def saved_history_as_turns(user_id: int) -> list[ChatTurn]:
    """A logged-in shopper's saved messages, as chat turns for the model."""
    return [
        ChatTurn(role=m.role, content=m.content, dog_joke=m.dog_joke)
        for m in tools.load_chat_history(DB_PATH, user_id, limit=HISTORY_TURNS)
    ]


async def run_chat(
    message: str,
    history: list[ChatTurn],
    user: dict | None = None,
    page: PageContext | None = None,
    price_range: PriceRange | None = None,
) -> ChatResponse:
    """Run one chat turn and return the reply plus product cards.

    Logged-in shoppers: history comes from the database (so it survives refreshes and
    new devices) and the turn is saved afterwards. Guests: history comes from the browser.
    """
    deps = ShopDeps(
        db_path=DB_PATH,
        customer_first_name=user["first_name"] if user else None,
        customer_last_name=user["last_name"] if user else None,
        customer_email=user["email"] if user else None,
        user_id=user["id"] if user else None,
        page=page,
        price_range=price_range,
    )
    if user:
        history = saved_history_as_turns(user["id"])
    prior = to_message_history(history)

    # Run the agent loop with a time limit and an iteration limit, and audit every run.
    run_id = uuid.uuid4().hex[:12]
    started = datetime.now(timezone.utc)
    stop_reason, stop_detail, early_reply, result = "completed", None, None, None
    failure: Exception | None = None
    with capture_run_messages() as captured:
        try:
            result = await asyncio.wait_for(
                get_agent().run(
                    message,
                    deps=deps,
                    message_history=prior,
                    usage_limits=UsageLimits(request_limit=MAX_LOOP_ITERATIONS),
                ),
                timeout=MAX_RUN_SECONDS,
            )
        except asyncio.TimeoutError:
            stop_reason, stop_detail, early_reply = "timeout", f"stopped after {MAX_RUN_SECONDS:g} s", TIMEOUT_REPLY
        except UsageLimitExceeded as err:
            stop_reason, stop_detail, early_reply = "loop_limit", str(err), LOOP_LIMIT_REPLY
        except ModelHTTPError as err:
            if "content_filter" in str(err.body):
                stop_reason, stop_detail, early_reply = "content_filter", "blocked by the model provider's safety filter", BLOCKED_REPLY
            else:
                stop_reason, stop_detail, failure = "error", f"{type(err).__name__}: {err.status_code}", err
        except Exception as err:  # noqa: BLE001 - logged, then re-raised
            stop_reason, stop_detail, failure = "error", type(err).__name__, err
        finally:
            run_messages = captured[len(prior):] if len(captured) >= len(prior) else list(captured)
            append_audit(build_record(
                run_id=run_id,
                started=started,
                finished=datetime.now(timezone.utc),
                model=os.getenv("OPENAI_MODEL", DEFAULT_MODEL),
                user_id=deps.user_id,
                page_path=page.path if page else None,
                message=message,
                messages=run_messages,
                stop_reason=stop_reason,
                stop_detail=stop_detail,
                reply=early_reply or (result.output.reply if result else None),
                limits={"max_seconds": MAX_RUN_SECONDS, "max_iterations": MAX_LOOP_ITERATIONS},
            ))
    if failure is not None:
        raise failure
    if early_reply is not None:
        return ChatResponse(reply=early_reply)  # stopped early: not saved to chat history
    output = result.output

    # Budget: a range given this turn replaces the old one; "no limit" clears it.
    if output.clear_price_range:
        deps.price_range = None
    elif output.price_range and (output.price_range.min_price is not None or output.price_range.max_price is not None):
        deps.price_range = output.price_range

    # Browsing a type of item -> first page of structured matches for the website.
    matches = tools.search_page(deps, output.search, offset=0, limit=PAGE_SIZE) if output.search else None
    if matches is not None and matches.total == 0:
        matches = None

    # Recommendations stay inside the budget (the product on screen is always allowed).
    card_ids = [] if matches else output.product_ids
    if deps.price_range:
        viewed = page.product_id if page else None
        prices = {c.product_id: c.price for c in tools.product_cards(deps, card_ids)}
        card_ids = [i for i in card_ids if i == viewed or (i in prices and deps.price_range.contains(prices[i]))]

    comparison = tools.comparison_table(deps, output.compare_product_id) if output.compare_product_id else None

    jokes_told = [t.dog_joke for t in history if t.dog_joke]
    response = ChatResponse(
        reply=output.reply,
        # When results or a comparison are shown, skip the small in-chat cards unless something is sold out.
        products=tools.product_cards(
            deps, [] if comparison else card_ids, output.out_of_stock
        ),
        comparison=comparison,
        ask_price_range=output.ask_price_range,
        price_range=deps.price_range,
        matches=matches,
        offer_restock_email=output.offer_restock_email,
        suggest_login=output.suggest_login and user is None,
        dog_joke=pick_dog_joke(jokes_told) if output.tell_dog_joke else None,
    )
    if user:
        tools.save_chat_turn(DB_PATH, user["id"], message, response)
        response.saved = True
    return response


# ---------------------------------------------------------------------------
# Audit trail (output/audit_trail.json)
#
# One record per agent run (each chat message that reaches the agent): when it ran, who asked (user id only), every tool the
# agent called (short args / short result), how many loop iterations it took, and
# why it stopped. Records are only ever added. The file is never cleared between
# runs or server restarts.
#
# Personal information is protected: emails are masked, long digit strings (card
# numbers, phone numbers) are hidden, and passwords never reach the agent at all.
# ---------------------------------------------------------------------------

AUDIT_PATH = ROOT / "output" / "audit_trail.json"
SHORT_LIMIT = 200  # max characters kept for any arg/result/message preview

_lock = threading.Lock()
_EMAIL = re.compile(r"([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})")
_DIGITS = re.compile(r"\b(?:\d[ -]?){9,}\b")


def redact(text: str) -> str:
    """Mask emails (b***@yale.edu) and long digit runs (cards, phones)."""
    text = _EMAIL.sub(lambda m: f"{m.group(1)}***@{m.group(2)}", text)
    return _DIGITS.sub("[number hidden]", text)


def short(value: Any, limit: int = SHORT_LIMIT) -> str:
    """Compact, redacted, length-capped text for the log."""
    if hasattr(value, "model_dump"):
        value = value.model_dump()
    text = value if isinstance(value, str) else json.dumps(value, default=str, ensure_ascii=False)
    text = redact(" ".join(text.split()))
    return text if len(text) <= limit else text[: limit - 1] + "…"


def _iso(ts: datetime | None) -> str:
    return (ts or datetime.now(timezone.utc)).astimezone(timezone.utc).isoformat(timespec="milliseconds")


def steps_from_messages(messages: list[ModelMessage]) -> tuple[list[dict], int]:
    """Turn this run's messages into audit steps. Returns (steps, loop iterations)."""
    steps: list[dict] = []
    by_call_id: dict[str, dict] = {}
    iteration = 0
    for msg in messages:
        if isinstance(msg, ModelResponse):
            iteration += 1
            for part in msg.parts:
                if isinstance(part, ToolCallPart):
                    step = {
                        "time": _iso(msg.timestamp),
                        "iteration": iteration,
                        "tool": part.tool_name,
                        "args": short(part.args),
                        "result": None,
                    }
                    steps.append(step)
                    by_call_id[part.tool_call_id] = step
                elif isinstance(part, TextPart) and part.content.strip():
                    steps.append({
                        "time": _iso(msg.timestamp), "iteration": iteration,
                        "tool": "(model text)", "args": None, "result": short(part.content),
                    })
        elif isinstance(msg, ModelRequest):
            for part in msg.parts:
                if isinstance(part, ToolReturnPart) and part.tool_call_id in by_call_id:
                    by_call_id[part.tool_call_id]["result"] = short(part.content)
                elif isinstance(part, RetryPromptPart):
                    target = by_call_id.get(part.tool_call_id or "")
                    note = f"RETRY: {short(part.content, 120)}"
                    if target is not None:
                        target["result"] = note
                    else:
                        steps.append({"time": _iso(part.timestamp), "iteration": iteration,
                                      "tool": "(output check)", "args": None, "result": note})
    return steps, iteration


def append_audit(record: dict) -> None:
    """Add one record to output/audit_trail.json without removing anything.

    Read the list, append, write to a temp file, then atomically replace. If the
    file is ever unreadable, it is kept as a backup instead of being overwritten.
    """
    AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _lock:
        entries: list = []
        if AUDIT_PATH.exists():
            try:
                entries = json.loads(AUDIT_PATH.read_text(encoding="utf-8") or "[]")
                if not isinstance(entries, list):
                    raise ValueError("audit trail is not a list")
            except ValueError:
                backup = AUDIT_PATH.with_name(f"audit_trail.corrupt-{datetime.now():%Y%m%d-%H%M%S}.json")
                AUDIT_PATH.rename(backup)
                entries = []
        entries.append(record)
        tmp = AUDIT_PATH.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(entries, indent=2, ensure_ascii=False), encoding="utf-8")
        os.replace(tmp, AUDIT_PATH)


def build_record(
    *,
    run_id: str,
    started: datetime,
    finished: datetime,
    model: str,
    user_id: int | None,
    page_path: str | None,
    message: str,
    messages: list[ModelMessage],
    stop_reason: str,
    stop_detail: str | None = None,
    reply: str | None = None,
    limits: dict | None = None,
) -> dict:
    steps, iterations = steps_from_messages(messages)
    return {
        "run_id": run_id,
        "time": _iso(started),
        "finished": _iso(finished),
        "duration_s": round((finished - started).total_seconds(), 2),
        "model": model,
        "user": f"user:{user_id}" if user_id is not None else "guest",
        "page": page_path,
        "message": short(message),
        "loop_iterations": iterations,
        "tool_calls": sum(1 for s in steps if not s["tool"].startswith("(")),
        "steps": steps,
        "stop_reason": stop_reason,
        "stop_detail": stop_detail,
        "reply": short(reply) if reply else None,
        "limits": limits or {},
    }
