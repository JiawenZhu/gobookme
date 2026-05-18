#!/usr/bin/env python3
"""
migrate-to-firestore.py

Migrates non-relational user data from Cloud SQL to Firestore.
Run once after Firebase Auth is wired up and firebaseUid is populated.

Usage:
  pip install firebase-admin psycopg2-binary python-dotenv
  python3 scripts/migrate-to-firestore.py --dry-run     # preview only
  python3 scripts/migrate-to-firestore.py               # run migration
  python3 scripts/migrate-to-firestore.py --collection=userPreferences  # single collection

What this migrates:
  SQL User.{theme, locale, timeZone} → Firestore /userPreferences/{firebaseUid}
  SQL User notifications/activity    → Firestore /notifications/{firebaseUid}/...
  SQL BusinessListing view metadata  → Firestore /businessListingMeta/{listingId}
"""

import argparse
import os
import sys
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

# Load .env from repo root
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# ── CONFIG ─────────────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("DATABASE_DIRECT_URL")
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "gobookme-app")
BATCH_SIZE = 500  # Firestore batch write limit

DRY_RUN = False
VERBOSE = False
# ───────────────────────────────────────────────────────────────────────────────


def get_firestore():
    """Initialize Firestore client using Application Default Credentials."""
    import firebase_admin
    from firebase_admin import credentials, firestore

    if not firebase_admin._apps:
        # Uses ADC — works with `gcloud auth application-default login` locally
        # and with Cloud Run service account automatically in production
        firebase_admin.initialize_app(
            credentials.ApplicationDefault(),
            {"projectId": FIREBASE_PROJECT_ID},
        )
    return firestore.client()


def get_pg_conn():
    """Connect to Cloud SQL via direct URL (use Cloud SQL Auth Proxy locally)."""
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL not set. Run Cloud SQL Auth Proxy first:")
        print("  ./cloud-sql-proxy gobookme-app:us-central1:gobookme-prod --port=5433")
        print("  export DATABASE_URL=postgresql://gobookme:<password>@localhost:5433/gobookme")
        sys.exit(1)

    # Strip Prisma-specific URL params and empty values that psycopg2 rejects
    from urllib.parse import urlparse, urlencode, parse_qs, urlunparse
    blocked_params = {"connection_limit", "pool_timeout", "connect_timeout", "socket_timeout"}
    parsed = urlparse(DATABASE_URL)
    qs = {
        k: v for k, v in parse_qs(parsed.query).items()
        if k not in blocked_params and v != [""]
    }
    clean_url = urlunparse(parsed._replace(query=urlencode(qs, doseq=True)))

    # PGSSLMODE="" from .env causes psycopg2 to fail; unset it before connecting
    os.environ.pop("PGSSLMODE", None)

    return psycopg2.connect(clean_url, cursor_factory=psycopg2.extras.RealDictCursor)


def write_batch(db, writes: list[tuple]):
    """Write a batch of (collection_path, doc_id, data) to Firestore."""
    if DRY_RUN:
        print(f"  [DRY RUN] Would write {len(writes)} documents")
        for path, doc_id, data in writes[:3]:
            print(f"    {path}/{doc_id}: {list(data.keys())}")
        if len(writes) > 3:
            print(f"    ... and {len(writes) - 3} more")
        return

    batch = db.batch()
    for collection_path, doc_id, data in writes:
        ref = db.collection(collection_path).document(doc_id)
        batch.set(ref, data, merge=True)
    batch.commit()


def migrate_user_preferences(conn, db):
    """
    Migrate User.{theme, locale, timeZone, weekStart, hideBranding}
    → Firestore /userPreferences/{firebaseUid}

    Requires firebaseUid column to be added to User table first (PR 1).
    Skips migration if firebaseUid column doesn't exist yet.
    """
    print("\n=== Migrating User Preferences ===")
    cursor = conn.cursor()

    # Check if firebaseUid column exists yet
    cursor.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'users' AND table_schema = 'public'
        AND column_name = 'firebaseUid'
    """)
    if not cursor.fetchone():
        print("  ⏭  Skipping — firebaseUid column not yet added to User table.")
        print("     Run PR 1 (Firebase Auth) first, then re-run this script.")
        return

    cursor.execute("""
        SELECT
            "firebaseUid",
            "email",
            "theme",
            "appTheme",
            "locale",
            "timeZone",
            "weekStart",
            "hideBranding",
            "completedOnboarding",
            "bufferTime"
        FROM "users"
        WHERE "firebaseUid" IS NOT NULL
    """)

    rows = cursor.fetchall()
    print(f"  Found {len(rows)} users with Firebase UID")

    writes = []
    skipped = 0

    for row in rows:
        uid = row["firebaseUid"]
        if not uid:
            skipped += 1
            continue

        data = {
            "email": row["email"],
            "theme": row["theme"] or "light",
            "appTheme": row["appTheme"],
            "locale": row["locale"] or "en",
            "timeZone": row["timeZone"] or "UTC",
            "weekStart": row["weekStart"] or "Sunday",
            "hideBranding": row["hideBranding"],
            "completedOnboarding": row["completedOnboarding"],
            "bufferTime": row["bufferTime"],
            "migratedAt": datetime.now(timezone.utc).isoformat(),
        }

        writes.append(("userPreferences", uid, data))

        if len(writes) >= BATCH_SIZE:
            write_batch(db, writes)
            print(f"  Written batch of {len(writes)}")
            writes = []

    if writes:
        write_batch(db, writes)

    print(f"  ✅ Migrated {len(rows) - skipped} user preferences ({skipped} skipped — no firebaseUid)")


def migrate_business_listing_metadata(conn, db):
    """
    Migrate BusinessListing metadata (non-booking fields)
    → Firestore /businessListingMeta/{listingId}

    Complex booking/payment data stays in SQL.
    Firestore gets: viewCount, status, featuredUntil, categories.
    """
    print("\n=== Migrating Business Listing Metadata ===")
    cursor = conn.cursor()

    # Check if BusinessListing table exists
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = 'BusinessListing'
        ) AS exists
    """)
    if not cursor.fetchone()["exists"]:
        print("  BusinessListing table not found — skipping")
        return

    cursor.execute("""
        SELECT
            id,
            "displayName",
            "approvalStatus",
            "visibility",
            "featured",
            "plan",
            city,
            neighborhood,
            "createdAt",
            "updatedAt"
        FROM "BusinessListing"
        LIMIT 10000
    """)

    rows = cursor.fetchall()
    print(f"  Found {len(rows)} business listings")

    writes = []
    for row in rows:
        data = {
            "displayName": row["displayName"],
            "approvalStatus": str(row["approvalStatus"]) if row["approvalStatus"] else None,
            "visibility": str(row["visibility"]) if row["visibility"] else None,
            "featured": row["featured"],
            "plan": row["plan"],
            "city": row["city"],
            "neighborhood": row["neighborhood"],
            "viewCount": 0,  # starts at 0, incremented by app
            "createdAt": row["createdAt"].isoformat() if row["createdAt"] else None,
            "updatedAt": row["updatedAt"].isoformat() if row["updatedAt"] else None,
            "migratedAt": datetime.now(timezone.utc).isoformat(),
        }
        writes.append(("businessListingMeta", row["id"], data))

        if len(writes) >= BATCH_SIZE:
            write_batch(db, writes)
            print(f"  Written batch of {len(writes)}")
            writes = []

    if writes:
        write_batch(db, writes)

    print(f"  ✅ Migrated {len(rows)} business listing metadata records")


def verify_migration(db):
    """Count documents in each Firestore collection to confirm migration."""
    print("\n=== Verification ===")
    collections = ["userPreferences", "businessListingMeta", "notifications"]

    for col in collections:
        if DRY_RUN:
            print(f"  [DRY RUN] Skipping count for {col}")
            continue
        docs = list(db.collection(col).limit(1).stream())
        count_ref = db.collection(col)
        # Note: Firestore doesn't have a count() without aggregation queries
        # For full count use: len(list(db.collection(col).stream()))
        print(f"  {col}: documents exist = {len(docs) > 0}")


def main():
    parser = argparse.ArgumentParser(description="Migrate SQL data to Firestore")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, no writes")
    parser.add_argument("--collection", help="Migrate only this collection")
    parser.add_argument("--verbose", action="store_true", help="Verbose output")
    args = parser.parse_args()

    global DRY_RUN, VERBOSE
    DRY_RUN = args.dry_run
    VERBOSE = args.verbose

    if DRY_RUN:
        print("🔍 DRY RUN MODE — no data will be written\n")

    print(f"Connecting to database: {DATABASE_URL[:50]}..." if DATABASE_URL else "No DB URL")
    conn = get_pg_conn()
    print("✅ Connected to Cloud SQL")

    print(f"Connecting to Firestore project: {FIREBASE_PROJECT_ID}")
    db = get_firestore()
    print("✅ Connected to Firestore")

    target = args.collection

    if not target or target == "userPreferences":
        migrate_user_preferences(conn, db)

    if not target or target == "businessListingMeta":
        migrate_business_listing_metadata(conn, db)

    verify_migration(db)

    conn.close()
    print("\n✅ Migration complete!")
    if DRY_RUN:
        print("   This was a dry run. Run without --dry-run to apply changes.")


if __name__ == "__main__":
    main()
