#!/usr/bin/env python3
"""
prepare_dc_migration.py
=======================
Prepares Cloud SQL for Firebase Data Connect COMPATIBLE mode migration by:
  1. Dropping ALL foreign-key constraints (safe because DB has zero rows).
  2. Running firebase dataconnect:sql:migrate --force.

Why drop FKs?
  DC's COMPATIBLE migration needs to rename / drop indexes and unique constraints
  that belong to columns referenced by other tables' FK constraints. Postgres
  refuses to drop those indexes while the FK constraints still exist.
  Since this database has zero rows the FK constraints carry no data integrity
  value and can be safely removed before DC takes ownership of the schema.

Usage:
    python3 scripts/prepare_dc_migration.py [--dry-run] [--skip-migrate]

    --dry-run     Print the ALTER TABLE statements without executing them.
    --skip-migrate  Drop FKs only; do not run firebase migrate.
"""

import argparse
import subprocess
import sys

import psycopg2

DB_URL = "postgresql://postgres:gobookme_secure_pwd_2026@34.59.217.96:5432/gobookme_main"
FIREBASE_PROJECT = "gobookme-app"


def get_all_fk_constraints(cur) -> list[tuple[str, str]]:
    """Return list of (table_name, constraint_name) for every FK in the DB."""
    cur.execute("""
        SELECT tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema    = 'public'
        ORDER BY tc.table_name, tc.constraint_name
    """)
    return cur.fetchall()


def drop_all_fk_constraints(conn, dry_run: bool = False) -> int:
    cur = conn.cursor()
    fks = get_all_fk_constraints(cur)

    if not fks:
        print("  No FK constraints found — nothing to drop.")
        cur.close()
        return 0

    print(f"  Found {len(fks)} FK constraint(s).")
    dropped = 0

    for table, constraint in fks:
        sql = f'ALTER TABLE "{table}" DROP CONSTRAINT "{constraint}";'
        if dry_run:
            print(f"  [dry-run] {sql}")
        else:
            try:
                cur.execute(f'ALTER TABLE "{table}" DROP CONSTRAINT "{constraint}"')
                print(f"  ✓  Dropped {table}.{constraint}")
                dropped += 1
            except psycopg2.Error as exc:
                print(f"  ✗  FAILED {table}.{constraint}: {exc}")
                conn.rollback()
                # Re-open cursor after rollback
                cur = conn.cursor()

    if not dry_run:
        conn.commit()
        print(f"\n  Committed. Dropped {dropped}/{len(fks)} FK constraints.")

    cur.close()
    return dropped


def convert_timestamps_to_timestamptz(conn) -> None:
    """Convert all timestamp without time zone columns to timestamptz in gobookme_dc.
    Firebase DC's Timestamp GQL scalar requires timestamptz in PostgreSQL.
    """
    cur = conn.cursor()
    cur.execute("""
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND data_type = 'timestamp without time zone'
        ORDER BY table_name, column_name
    """)
    cols = cur.fetchall()
    if not cols:
        print("  No timestamp columns to convert.")
        cur.close()
        return
    print(f"  Converting {len(cols)} timestamp columns to timestamptz...")
    for table, col in cols:
        cur.execute(f'ALTER TABLE "{table}" ALTER COLUMN "{col}" TYPE timestamptz USING "{col}"::timestamptz')
        print(f"    ✓  {table}.{col}")
    conn.commit()
    cur.close()


def run_firebase_migrate() -> int:
    """Run firebase dataconnect:sql:migrate --force and stream output."""
    print("\n─── Running firebase dataconnect:sql:migrate ───────────────────────────────")
    result = subprocess.run(
        [
            "npx", "firebase", "dataconnect:sql:migrate",
            "--project", FIREBASE_PROJECT,
            "--force",
        ],
        capture_output=False,  # stream to terminal
    )
    return result.returncode


def run_firebase_diff() -> int:
    """Run firebase dataconnect:sql:diff to preview schema changes."""
    print("\n─── Running firebase dataconnect:sql:diff (preview) ───────────────────────")
    result = subprocess.run(
        [
            "npx", "firebase", "dataconnect:sql:diff",
            "--project", FIREBASE_PROJECT,
        ],
        capture_output=False,
    )
    return result.returncode


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Print ALTER TABLE statements without executing them."
    )
    parser.add_argument(
        "--skip-migrate", action="store_true",
        help="Drop FKs only; skip the firebase migrate step."
    )
    parser.add_argument(
        "--diff-only", action="store_true",
        help="Skip FK drops; just run firebase dataconnect:sql:diff."
    )
    args = parser.parse_args()

    if args.diff_only:
        sys.exit(run_firebase_diff())

    print("Connecting to Cloud SQL (gobookme_main)…")
    try:
        conn = psycopg2.connect(DB_URL)
    except Exception as exc:
        print(f"ERROR: Cannot connect — {exc}")
        sys.exit(1)

    print("\n─── Step 1: Drop all FK constraints ────────────────────────────────────────")
    drop_all_fk_constraints(conn, dry_run=args.dry_run)
    conn.close()

    if args.dry_run:
        print("\n[dry-run] No changes committed. Exiting.")
        return

    if args.skip_migrate:
        print("\n--skip-migrate set. Skipping firebase migrate.")
        return

    print("\n─── Step 2: Convert timestamp → timestamptz (required by DC) ───────────────")
    conn2 = psycopg2.connect(DB_URL.replace("/gobookme_main", "/gobookme_dc"))
    convert_timestamps_to_timestamptz(conn2)
    conn2.close()

    print("\n─── Step 3: Apply Data Connect schema migration ─────────────────────────────")
    rc = run_firebase_migrate()
    if rc == 0:
        print("\n✅  Migration succeeded!")
    else:
        print(f"\n❌  Migration exited with code {rc}.")
        print("    Run 'python3 scripts/prepare_dc_migration.py --diff-only' to inspect the SQL diff.")
    sys.exit(rc)


if __name__ == "__main__":
    main()
