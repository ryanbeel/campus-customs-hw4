"""Campus Customs backend: products, stock, product images, user accounts, and the chatbot.

Run from the backend/ folder:
    uvicorn main:app --reload --port 8000
"""

import base64
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import sqlite3
import time
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from agent import DB_PATH as AGENT_DB_PATH, run_chat
from models import ChatHistoryResponse, ChatRequest, ChatResponse, SearchResults, SearchSpec
from tools import ShopDeps, clear_chat_history, color_families, garment_category, ensure_restock_table, load_chat_history, search_page, surprise_me

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "campus_customs.db"
SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"]

app = FastAPI(title="Campus Customs API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Image paths in the database look like "products/<file>.jpg", so serving
# DATA_DIR/products at /images/products makes "/images/" + image_file_path work.
app.mount("/images/products", StaticFiles(directory=DATA_DIR / "products"), name="images")


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def product_from_row(row: sqlite3.Row) -> dict:
    return {
        "product_id": row["product_id"],
        "name": row["name"],
        "garment_type": row["garment_type"],
        "description": row["description"],
        "colors": json.loads(row["colors"]),
        "search_tags": json.loads(row["search_tags"]),
        "image_url": f"/images/{row['image_file_path']}",
        "price": row["price"],
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/products")
def list_products():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM catalogue ORDER BY name").fetchall()
        totals = dict(
            conn.execute(
                "SELECT product_id, SUM(quantity) FROM inventory GROUP BY product_id"
            ).fetchall()
        )
        in_stock = {}
        for pid, size in conn.execute(
            "SELECT product_id, size FROM inventory WHERE quantity > 0"
        ).fetchall():
            in_stock.setdefault(pid, []).append(size)
    return [
        {
            **product_from_row(r),
            "total_stock": totals.get(r["product_id"], 0),
            # Problem 10 filters
            "category": garment_category(r["garment_type"]),
            "color_families": color_families(json.loads(r["colors"])),
            "sizes_in_stock": sorted(
                in_stock.get(r["product_id"], []),
                key=lambda sz: SIZE_ORDER.index(sz) if sz in SIZE_ORDER else 99,
            ),
        }
        for r in rows
    ]


@app.get("/api/products/{product_id}")
def get_product(product_id: str):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM catalogue WHERE product_id = ?", (product_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Product not found")
        stock = conn.execute(
            "SELECT size, quantity FROM inventory WHERE product_id = ?", (product_id,)
        ).fetchall()
    sizes = sorted(
        ({"size": s["size"], "quantity": s["quantity"]} for s in stock),
        key=lambda s: SIZE_ORDER.index(s["size"]) if s["size"] in SIZE_ORDER else 99,
    )
    product = product_from_row(row)
    product["sizes"] = sizes
    product["total_stock"] = sum(s["quantity"] for s in sizes)
    return product


# ---------------------------------------------------------------------------
# Accounts
# ---------------------------------------------------------------------------

# Password hashing and session tokens for Campus Customs.
#
# Stored password format (matches the existing users in the database):
#
#     pbkdf2_sha256$<salt>$<hex digest>
#
# - Hash function: PBKDF2-HMAC-SHA256, 120,000 iterations
# - Salt: random text, unique per user, used as UTF-8 bytes
# - Digest: 32-byte result, written as 64 hex characters
#
# Signup and login must use these exact settings or correct passwords won't match.

ALGORITHM = "pbkdf2_sha256"
ITERATIONS = 120_000

# Secret used to sign login tokens. Set SESSION_SECRET in .env to keep users
# logged in across server restarts; otherwise a random one is made at startup.
SESSION_SECRET = os.environ.get("SESSION_SECRET") or secrets.token_hex(32)
SESSION_TTL_SECONDS = 7 * 24 * 60 * 60


def _pbkdf2(password: str, salt: str) -> str:
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), ITERATIONS
    )
    return digest.hex()


def hash_password(password: str) -> str:
    """Hash a new password with a fresh random salt (used at signup)."""
    salt = secrets.token_urlsafe(12)  # 16 URL-safe characters, never contains "$"
    return f"{ALGORITHM}${salt}${_pbkdf2(password, salt)}"


def verify_password(password: str, stored: str) -> bool:
    """Check a typed password against a stored hash (used at login).

    The stored hash is never reversed. We read the salt out of the stored
    string, hash the typed password with that same salt, and compare the two
    hashes in constant time.
    """
    try:
        algorithm, salt, expected = stored.split("$")
    except ValueError:
        return False
    if algorithm != ALGORITHM:
        return False
    return hmac.compare_digest(_pbkdf2(password, salt), expected)


def create_token(user_id: int) -> str:
    """Make a signed login token: '<user_id>.<expiry>.<signature>'."""
    payload = f"{user_id}.{int(time.time()) + SESSION_TTL_SECONDS}"
    sig = hmac.new(SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).digest()
    return f"{payload}.{base64.urlsafe_b64encode(sig).decode().rstrip('=')}"


def read_token(token: str) -> int | None:
    """Return the user id in a valid, unexpired token, or None."""
    try:
        user_id, expiry, sig = token.split(".")
    except ValueError:
        return None
    payload = f"{user_id}.{expiry}"
    expected = hmac.new(SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).digest()
    expected_b64 = base64.urlsafe_b64encode(expected).decode().rstrip("=")
    if not hmac.compare_digest(sig, expected_b64):
        return None
    if not expiry.isdigit() or int(expiry) < time.time():
        return None
    return int(user_id) if user_id.isdigit() else None


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LENGTH = 8
LOGIN_FAILED = "Incorrect email or password."


class SignupRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    confirm_password: str


class LoginRequest(BaseModel):
    email: str
    password: str


def public_user(row: sqlite3.Row) -> dict:
    """User fields that are safe to send to the browser (never the password hash)."""
    return {
        "id": row["id"],
        "name": row["name"],
        "first_name": row["first_name"],
        "last_name": row["last_name"],
        "email": row["email"],
    }


@app.post("/api/signup", status_code=201)
def signup(body: SignupRequest):
    first = body.first_name.strip()
    last = body.last_name.strip()
    email = body.email.strip().lower()
    if not first or not last:
        raise HTTPException(400, "First and last name are required.")
    if not EMAIL_RE.match(email):
        raise HTTPException(400, "Please enter a valid email address.")
    if len(body.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(400, f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")
    if body.password != body.confirm_password:
        raise HTTPException(400, "Passwords do not match.")

    with get_db() as conn:
        exists = conn.execute(
            "SELECT 1 FROM users WHERE lower(email) = ?", (email,)
        ).fetchone()
        if exists:
            raise HTTPException(409, "An account with this email already exists.")
        cur = conn.execute(
            "INSERT INTO users (name, email, password_hash, first_name, last_name) "
            "VALUES (?, ?, ?, ?, ?)",
            (f"{first} {last}", email, hash_password(body.password), first, last),
        )
        row = conn.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
    return {"token": create_token(row["id"]), "user": public_user(row)}


@app.post("/api/login")
def login(body: LoginRequest):
    email = body.email.strip().lower()
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE lower(email) = ?", (email,)
        ).fetchone()
    # Same message whether the email or the password is wrong, so the form
    # doesn't reveal which emails have accounts.
    if row is None or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(401, LOGIN_FAILED)
    return {"token": create_token(row["id"]), "user": public_user(row)}


def current_user(authorization: str) -> sqlite3.Row | None:
    """The logged-in user for an 'Authorization: Bearer <token>' header, or None."""
    token = authorization.removeprefix("Bearer ").strip()
    user_id = read_token(token) if token else None
    if user_id is None:
        return None
    with get_db() as conn:
        return conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()


@app.get("/api/me")
def me(authorization: str = Header(default="")):
    row = current_user(authorization)
    if row is None:
        raise HTTPException(401, "Not logged in.")
    return public_user(row)


# ---------------------------------------------------------------------------
# Chatbot
# ---------------------------------------------------------------------------

logger = logging.getLogger("campus_customs.chat")

# Table for "email me when it's back in stock" requests.
ensure_restock_table(AGENT_DB_PATH)


@app.post("/api/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, authorization: str = Header(default="")):
    """Send one shopper message to the PydanticAI agent and return its reply."""
    user = current_user(authorization)
    try:
        return await run_chat(
            body.message,
            body.history,
            user=public_user(user) if user else None,  # id, names, email only; never password_hash
            page=body.page,
            price_range=body.price_range,
        )
    except Exception:
        logger.exception("Chat agent failed")
        raise HTTPException(502, "Ruh-roh! The Bulldog Assistant hit a snag. Please try again in a moment.")


@app.get("/api/chat/history", response_model=ChatHistoryResponse)
def chat_history(authorization: str = Header(default="")):
    """A logged-in shopper's saved chat, so it reloads when they come back."""
    user = current_user(authorization)
    if user is None:
        raise HTTPException(401, "Log in to see your saved chat.")
    return ChatHistoryResponse(
        first_name=user["first_name"] or user["name"],
        messages=load_chat_history(AGENT_DB_PATH, user["id"]),
    )


@app.delete("/api/chat/history")
def delete_chat_history(authorization: str = Header(default="")):
    """Let a logged-in shopper clear their saved chat."""
    user = current_user(authorization)
    if user is None:
        raise HTTPException(401, "Log in to manage your saved chat.")
    return {"deleted": clear_chat_history(AGENT_DB_PATH, user["id"])}


@app.get("/api/search", response_model=SearchResults)
def search(
    query: str = "",
    label: str = "Results",
    min_price: float | None = None,
    max_price: float | None = None,
    size: str | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(5, ge=1, le=24),
):
    """More pages of a chat search ("See more"). Same ranking the chat used."""
    spec = SearchSpec(label=label, query=query, min_price=min_price, max_price=max_price, size=size)
    return search_page(ShopDeps(db_path=AGENT_DB_PATH), spec, offset=offset, limit=limit)


@app.get("/api/surprise", response_model=SearchResults)
def surprise():
    """'Surprise me': 5 random in-stock products, each from a different category."""
    return surprise_me(ShopDeps(db_path=AGENT_DB_PATH), count=5)
