"""
QueryMind — Sample Database Seeder
Generates a SQLite database with 3 tables and 100 realistic rows each.
Tables: users, orders, products
Idempotent: skips creation if the database already exists.
"""

import sqlite3
import random
import os
from datetime import datetime, timedelta


# ─── Realistic data pools ──────────────────────────────────────

FIRST_NAMES = [
    "Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia", "Mason",
    "Isabella", "William", "Mia", "James", "Charlotte", "Benjamin", "Amelia",
    "Lucas", "Harper", "Henry", "Evelyn", "Alexander", "Abigail", "Daniel",
    "Emily", "Michael", "Ella", "Sebastian", "Scarlett", "Jack", "Grace",
    "Aiden", "Chloe", "Owen", "Victoria", "Samuel", "Riley", "Ryan",
    "Aria", "John", "Lily", "Nathan", "Aurora", "Caleb", "Zoey", "Dylan",
    "Penelope", "Luke", "Layla", "Andrew", "Nora", "Isaac",
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
    "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark",
    "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
    "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green",
    "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
    "Carter", "Roberts",
]

EMAIL_DOMAINS = [
    "gmail.com", "outlook.com", "yahoo.com", "protonmail.com",
    "icloud.com", "fastmail.com", "hey.com", "pm.me",
]

PLANS = ["free", "starter", "pro", "enterprise"]
PLAN_WEIGHTS = [40, 30, 20, 10]

PRODUCT_NAMES = [
    ("Wireless Headphones", "electronics", 79.99),
    ("Mechanical Keyboard", "electronics", 149.99),
    ("USB-C Hub", "electronics", 49.99),
    ("4K Monitor", "electronics", 399.99),
    ("Webcam HD", "electronics", 69.99),
    ("Standing Desk", "furniture", 549.99),
    ("Ergonomic Chair", "furniture", 329.99),
    ("Desk Lamp", "furniture", 45.99),
    ("Monitor Arm", "furniture", 89.99),
    ("Cable Organizer", "furniture", 19.99),
    ("Notebook Set", "stationery", 14.99),
    ("Fountain Pen", "stationery", 34.99),
    ("Sticky Notes Pack", "stationery", 8.99),
    ("Planner 2025", "stationery", 24.99),
    ("Whiteboard Markers", "stationery", 12.99),
    ("Coffee Beans 1kg", "food", 22.99),
    ("Green Tea Box", "food", 15.99),
    ("Protein Bars 12pk", "food", 29.99),
    ("Dark Chocolate", "food", 6.99),
    ("Trail Mix", "food", 11.99),
    ("Yoga Mat", "fitness", 39.99),
    ("Resistance Bands", "fitness", 24.99),
    ("Water Bottle", "fitness", 19.99),
    ("Jump Rope", "fitness", 14.99),
    ("Foam Roller", "fitness", 29.99),
    ("Python Book", "books", 44.99),
    ("SQL Cookbook", "books", 39.99),
    ("Design Patterns", "books", 49.99),
    ("Clean Code", "books", 37.99),
    ("AI Handbook", "books", 54.99),
    ("Laptop Sleeve", "accessories", 29.99),
    ("Phone Case", "accessories", 19.99),
    ("Screen Protector", "accessories", 9.99),
    ("Laptop Stand", "accessories", 59.99),
    ("Mouse Pad XL", "accessories", 24.99),
    ("Bluetooth Speaker", "electronics", 59.99),
    ("Smart Watch", "electronics", 249.99),
    ("Desk Shelf", "furniture", 79.99),
    ("Pen Holder", "stationery", 16.99),
    ("Energy Drink 6pk", "food", 18.99),
    ("Kettlebell 10kg", "fitness", 44.99),
    ("Data Science Book", "books", 42.99),
    ("Charging Cable 3pk", "accessories", 14.99),
    ("Noise Machine", "electronics", 34.99),
    ("Filing Cabinet", "furniture", 129.99),
    ("Colored Pens Set", "stationery", 11.99),
    ("Matcha Powder", "food", 27.99),
    ("Ab Wheel", "fitness", 19.99),
    ("Algorithms Book", "books", 46.99),
    ("AirTag Case", "accessories", 12.99),
]

ORDER_STATUSES = ["completed", "pending", "shipped", "cancelled", "refunded"]
STATUS_WEIGHTS = [50, 20, 15, 10, 5]


def random_date(start_days_ago: int = 365, end_days_ago: int = 0) -> str:
    """Generate a random datetime string within a range of days ago."""
    days_ago = random.randint(end_days_ago, start_days_ago)
    hours = random.randint(0, 23)
    minutes = random.randint(0, 59)
    dt = datetime.now() - timedelta(days=days_ago, hours=hours, minutes=minutes)
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def seed_database(db_path: str = "./sample.db") -> bool:
    """
    Create and seed the sample database.

    Args:
        db_path: Path to the SQLite database file.

    Returns:
        True if database was created, False if it already existed.
    """
    if os.path.exists(db_path):
        # Check if tables exist
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
        )
        if cursor.fetchone():
            conn.close()
            return False  # Already seeded
        conn.close()

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # ─── Create tables ─────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at TEXT NOT NULL,
            plan TEXT NOT NULL DEFAULT 'free'
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            stock INTEGER NOT NULL DEFAULT 0
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            product TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # ─── Seed users ────────────────────────────────────────────
    used_emails = set()
    users_data = []
    for i in range(100):
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        name = f"{first} {last}"

        # Ensure unique email
        domain = random.choice(EMAIL_DOMAINS)
        email = f"{first.lower()}.{last.lower()}@{domain}"
        suffix = 1
        while email in used_emails:
            email = f"{first.lower()}.{last.lower()}{suffix}@{domain}"
            suffix += 1
        used_emails.add(email)

        created_at = random_date(365, 0)
        plan = random.choices(PLANS, weights=PLAN_WEIGHTS, k=1)[0]
        users_data.append((name, email, created_at, plan))

    cursor.executemany(
        "INSERT INTO users (name, email, created_at, plan) VALUES (?, ?, ?, ?)",
        users_data,
    )

    # ─── Seed products ─────────────────────────────────────────
    products_data = []
    for name, category, base_price in PRODUCT_NAMES[:100]:
        # Add slight price variation
        price = round(base_price * random.uniform(0.9, 1.1), 2)
        stock = random.randint(0, 500)
        products_data.append((name, category, price, stock))

    # If we have fewer than 100 products, duplicate with variations
    while len(products_data) < 100:
        base = random.choice(PRODUCT_NAMES)
        name = f"{base[0]} v{len(products_data)}"
        price = round(base[2] * random.uniform(0.8, 1.2), 2)
        stock = random.randint(0, 500)
        products_data.append((name, base[1], price, stock))

    cursor.executemany(
        "INSERT INTO products (name, category, price, stock) VALUES (?, ?, ?, ?)",
        products_data,
    )

    # ─── Seed orders ───────────────────────────────────────────
    orders_data = []
    product_names = [p[0] for p in products_data]
    for i in range(100):
        user_id = random.randint(1, 100)
        product = random.choice(product_names)
        # Find the product's price
        amount = round(random.uniform(5.0, 600.0), 2)
        status = random.choices(ORDER_STATUSES, weights=STATUS_WEIGHTS, k=1)[0]
        created_at = random_date(180, 0)
        orders_data.append((user_id, product, amount, status, created_at))

    cursor.executemany(
        "INSERT INTO orders (user_id, product, amount, status, created_at) VALUES (?, ?, ?, ?, ?)",
        orders_data,
    )

    conn.commit()
    conn.close()

    print(f"[OK] Seeded database at {db_path}")
    print(f"     - 100 users")
    print(f"     - {len(products_data)} products")
    print(f"     - 100 orders")

    return True


if __name__ == "__main__":
    seed_database()
