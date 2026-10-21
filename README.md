# Campus Customs Shop + Chatbot (MGT 409 Homework 4)

An online store for Campus Customs (officially licensed Yale apparel) with a **bulldog shopping assistant**: a PydanticAI agent behind a FastAPI backend, plugged into a React + Vite + TypeScript website.

Shoppers can browse and filter products, create an account and log in, and chat with the bulldog. It answers with **real prices and stock by size** from the database, shows matching products as cards on the page, compares similar items, respects a budget, and remembers logged-in shoppers.

## Repository layout

```
hw4/
├── AI_prompts.md          # every prompt given to the AI coding assistant, by problem
├── requirements.txt       # Python packages for the backend
├── .env.example           # template for .env (placeholders only)
├── .gitignore
├── README.md
├── frontend/              # Vite React TypeScript app
├── backend/
│   ├── main.py            # FastAPI app (products, accounts, chat routes); run with: uvicorn main:app --reload --port 8000
│   ├── agent.py           # PydanticAI agent wiring: prompt + model + tools, limits, audit trail
│   ├── models.py          # PydanticAI structured types (agent output, tool results, API shapes)
│   ├── tools.py           # tools the agent calls (search, stock, details, compare, restock, page, profile)
│   └── prompts/
│       └── prompt.md      # system prompt (voice, safety rules, truthfulness, tool use)
└── output/
    ├── harness.md         # how the whole system works: specs, models, tools, safety, run steps
    ├── design.md          # website design changes (Problem 10)
    ├── usability.md       # usability improvements (Problem 9)
    ├── app_check.html     # site test report with screenshots (Problem 11)
    ├── app_check_images/  # screenshots linked from app_check.html
    └── audit_trail.json   # append-only log of agent runs
```

**The agent** is the four files in `backend/`: `prompts/prompt.md`, `agent.py`, `tools.py`, and `models.py`. `main.py` is the FastAPI app that serves it.

## 1. Place the data pack (not in git)

The database and product images are **not** included in this repository. Put the data pack in the project root so it looks like this:

```
data/
├── campus_customs.db
└── products/              # product images referenced by the catalogue
```

## 2. Create your `.env`

```bash
cp .env.example .env
```

Then edit `.env` and set your own `PORTKEY_API_KEY`. `OPENAI_MODEL` defaults to `gpt-5.6-luna`. Never commit `.env`.

## 3. Install (once)

You need Python 3.11+ and Node.js 18+. From the project root:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cd frontend
npm install
```

## 4. Run the backend (terminal 1)

```bash
cd backend
../.venv/bin/uvicorn main:app --reload --port 8000
```

Or activate the virtual environment first (`source .venv/bin/activate`), then `cd backend` and `uvicorn main:app --reload --port 8000`.

Check it's running: http://localhost:8000/api/health → `{"status":"ok"}`

## 5. Run the frontend (terminal 2)

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173**. Vite forwards `/api` and `/images` requests to the backend on port 8000.

## Try it

- **Log in** with the data pack's test user: `test@campuscustoms.yale.edu` / `password`, or create an account.
- **Chat** (bulldog, bottom right):
  - "Is the Davenport College Crewneck in stock in a medium?"
  - "What hoodies do you have?" (cards appear on the page)
  - "Help me find a gift under $60"
- **Product page:** wait 15 seconds and the bulldog offers a comparison with 3 similar items.
- **Menu:**
  - **Products ▾** has category shortcuts, and the Products page has filters for size, color, and price.
  - **Surprise Me** shows 5 random products, each a different type.
  - **Bull Dog** plays a random 7-second bulldog show.
- **URL options:**
  - `?welcome` shows the welcome pop-up again.
  - `?today=2026-11-20` previews another date's holiday theme.

## Safety and limits (details in `output/harness.md`)

- Each chat turn stops after **3 minutes** or **20 agent-loop iterations**.
- Prices, stock, and product cards always come from the database. The agent can't read other shoppers or passwords.
- Passwords are stored as PBKDF2-SHA256 hashes (120,000 iterations, a random salt per user).
- Every agent run is appended to `output/audit_trail.json`. Emails and long numbers are masked.

## Notes

- The project folder path must not contain `#` (Vite can't serve from such paths).
- Chat history, back-in-stock requests, and new accounts are written to your local `data/campus_customs.db`.
