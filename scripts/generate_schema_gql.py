#!/usr/bin/env python3
"""
generate_schema_gql.py
======================
Reads the live Cloud SQL PostgreSQL schema and generates a complete,
non-destructive schema.gql for Firebase Data Connect (COMPATIBLE mode).

Safety rules for COMPATIBLE mode:
  1. Enum columns: declared as String — DC reads the stored value without
     trying to retype the column from Prisma's PascalCase enum to DC's enum.
  2. NOT NULL columns (bool, int, timestamp): always safe to declare.
     DC validates they exist; it does NOT ADD DEFAULT or DROP NOT NULL.
  3. Timestamp precision: 'timestamp(3)' and 'timestamp' are compatible in PG.
  4. @ref directives are intentionally omitted — FK constraints stay with Prisma.

Usage:
    python3 scripts/generate_schema_gql.py [--diff]

    --diff  also runs: firebase dataconnect:sql:diff --project gobookme-app

Requires: psycopg2-binary  (pip install psycopg2-binary)
"""

import argparse
import psycopg2
import subprocess
import sys
from typing import Optional

# ── Config ────────────────────────────────────────────────────────────────────
DB_URL = "postgresql://postgres:gobookme_secure_pwd_2026@34.59.217.96:5432/gobookme_main"
OUTPUT_FILE = "dataconnect/schema/schema.gql"
FIREBASE_PROJECT = "gobookme-app"

# All tables to expose via Data Connect (in logical order).
# Each entry: (postgres_table_name, GQL_type_name)
TARGET_TABLES = [
    # Core user/auth tables
    ("users",               "User"),
    ("Team",                "Team"),
    ("Membership",          "Membership"),
    ("Profile",             "Profile"),
    # Scheduling
    ("EventType",           "EventType"),
    ("Schedule",            "Schedule"),
    ("Availability",        "Availability"),
    # Bookings
    ("Booking",             "Booking"),
    ("Attendee",            "Attendee"),
    ("BookingReference",    "BookingReference"),
    ("BookingSeat",         "BookingSeat"),
    # Calendars / integrations
    ("Credential",          "Credential"),
    ("SelectedCalendar",    "SelectedCalendar"),
    ("DestinationCalendar", "DestinationCalendar"),
    # Payments / webhooks
    ("Payment",             "Payment"),
    ("Webhook",             "Webhook"),
    # App store
    ("App",                 "App"),
    # Misc
    ("VerificationToken",   "VerificationToken"),
    ("ApiKey",              "ApiKey"),
    ("Account",             "Account"),
    ("Session",             "Session"),
    ("SecondaryEmail",      "SecondaryEmail"),
    ("OutOfOfficeEntry",    "OutOfOfficeEntry"),
    ("OutOfOfficeReason",   "OutOfOfficeReason"),
    ("CalendarCache",       "CalendarCache"),
    ("Feature",             "Feature"),
]

# Columns to always skip for a given table (FK columns that Prisma owns).
ALWAYS_SKIP: dict[str, set[str]] = {
    "users":        {"movedToProfileId", "organizationId"},
    "Team":         {"createdByOAuthClientId", "parentId"},
    "EventType":    {"parentId", "profileId", "instantMeetingScheduleId",
                     "restrictionScheduleId"},
    "Credential":   {"delegationCredentialId"},
    # CalendarCache: skip the nullable 'id' text column — real PK is composite
    "CalendarCache": {"id"},
}

# Tables with composite primary keys: (table, [pk_cols])
# These use @table(key: [...]) syntax instead of a single @col(dataType:"serial")
COMPOSITE_PK_TABLES: dict[str, list[str]] = {
    "CalendarCache": ["credentialId", "key"],
}

# Tables whose single PK column is NOT named 'id'.
# Value = the actual PK column name. Generates @table(key: ["colName"]).
NON_ID_PK_TABLES: dict[str, str] = {
    "App":     "slug",
    "Feature": "slug",
}

# Postgres UDTs that are Prisma-managed PascalCase enum types.
# Columns with these UDTs are declared as String in DC.
PRISMA_ENUM_UDTS: set[str] = {
    "BookingStatus", "UserPermissionRole", "MembershipRole", "IdentityProvider",
    "SchedulingType", "PeriodType", "SMSLockState", "RRResetInterval",
    "RRTimestampBasis", "EventTypeCustomInputType", "CreationSource",
    "FeatureType", "FilterSegmentScope", "PaymentOption", "TimeUnit",
    "PhoneNumberSubscriptionStatus", "ProrationStatus", "RedirectType",
    "ReminderType", "RoleType", "SeatChangeType", "SystemReportStatus",
    "UserPermissionRole", "WatchlistAction", "WatchlistSource", "WatchlistType",
    "WebhookTriggerEvents", "WrongAssignmentReportStatus", "OAuthClientStatus",
    "OAuthClientType", "CancellationReasonRequirement", "BookingAuditAction",
    "BookingAuditSource", "BookingAuditType", "BookingReportReason",
    "BookingReportStatus", "AuditActorType", "BillingMode", "BillingPeriod",
    "CalendarCacheEventStatus", "AppCategories", "AssignmentReasonEnum",
    "EventTypeAutoTranslatedField", "WatchlistType", "RRResetInterval",
    "AccessScope",
}

# Postgres data_type → GQL scalar
PG_TO_GQL: dict[str, Optional[str]] = {
    "integer":                      "Int",
    "bigint":                       "Int",
    "smallint":                     "Int",
    "serial":                       "Int",
    "bigserial":                    "Int",
    "text":                         "String",
    "character varying":            "String",
    "character":                    "String",
    "uuid":                         "UUID",
    "boolean":                      "Boolean",
    "jsonb":                        "Any",
    "json":                         "Any",
    "double precision":             "Float",
    "real":                         "Float",
    "numeric":                      "Float",
    "date":                         "Date",
    "timestamp without time zone":  "Timestamp",
    "timestamp with time zone":     "Timestamp",
    "time without time zone":       None,   # DC does not support TIME
    "time with time zone":          None,
    "ARRAY":                        None,   # handled below
    "USER-DEFINED":                 None,   # enum — handled below
}

# Enum declarations for the GQL header.
# DC creates NEW lowercase PG enum types (additive, never touches Prisma's types).
GQL_ENUMS: dict[str, list[str]] = {
    "BookingStatus":     ["cancelled", "accepted", "rejected", "pending", "awaiting_host"],
    "UserPermissionRole":["USER", "ADMIN"],
    "MembershipRole":    ["MEMBER", "ADMIN", "OWNER"],
    "IdentityProvider":  ["CAL", "GOOGLE", "SAML", "AZUREAD"],
    "SchedulingType":    ["roundRobin", "collective", "managed"],
    "PeriodType":        ["unlimited", "rolling", "rolling_window", "range"],
    "SmsLockState":      ["LOCKED", "UNLOCKED", "REVIEW_NEEDED"],
    "RrResetInterval":   ["MONTH", "DAY"],
    "RrTimestampBasis":  ["CREATED_AT", "START_TIME"],
}


# ── Utilities ────────────────────────────────────────────────────────────────

def snake_to_camel(name: str) -> str:
    """Convert snake_case to camelCase for GQL field names."""
    parts = name.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


def gql_field_name(col_name: str) -> str:
    """Return GQL field name (camelCase) and whether it differs from col_name."""
    gql_name = snake_to_camel(col_name)
    return gql_name


# ── DB helpers ────────────────────────────────────────────────────────────────

def get_columns(cur, table: str) -> list[tuple]:
    cur.execute("""
        SELECT column_name, data_type, udt_name, is_nullable,
               column_default, ordinal_position
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position
    """, (table,))
    return cur.fetchall()


def get_primary_keys(cur, table: str) -> set[str]:
    cur.execute("""
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema    = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema    = 'public'
          AND tc.table_name      = %s
    """, (table,))
    return {r[0] for r in cur.fetchall()}


def table_exists(cur, table: str) -> bool:
    cur.execute("""
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = %s
    """, (table,))
    return cur.fetchone() is not None


# ── Column → GQL field ────────────────────────────────────────────────────────

def col_to_gql(col: tuple, pks: set[str], skip: set[str]) -> Optional[str]:
    """
    Convert a DB column row into a GQL field declaration string, or None to skip.

    col = (column_name, data_type, udt_name, is_nullable, column_default, ordinal)
    GQL field names are always camelCase; @col(name:) maps back to the DB column.
    """
    col_name, data_type, udt_name, is_nullable_str, col_default, _ = col
    is_nullable = is_nullable_str == "YES"
    is_pk = col_name in pks
    field = gql_field_name(col_name)           # camelCase GQL name
    col_ann = f'@col(name: "{col_name}")'      # always reference exact DB column

    if col_name in skip:
        return None

    nullable_suffix = "" if is_nullable else "!"

    # ── Primary key (serial / uuid) ──────────────────────────────────────────
    if is_pk:
        if data_type == "integer" or udt_name in ("int4", "int2", "int8"):
            # serial — DC convention: no name annotation needed for 'id'
            if field == "id":
                return f'  {field}: Int! @col(dataType: "serial")'
            return f'  {field}: Int! {col_ann}'
        if data_type == "uuid":
            return f'  {field}: UUID! {col_ann}'
        if data_type in ("text", "character varying"):
            return f'  {field}: String! {col_ann}'
        return f'  {field}: String! {col_ann}'

    # ── Enum columns → String (avoid DC retyping Prisma enum columns) ────────
    if data_type == "USER-DEFINED" and udt_name in PRISMA_ENUM_UDTS:
        return f"  {field}: String{nullable_suffix} {col_ann}"

    # ── Timestamp ─────────────────────────────────────────────────────────────
    # Use default Timestamp (DC maps to timestamptz) — no dataType annotation needed.
    if data_type in ("timestamp without time zone", "timestamp with time zone"):
        return f'  {field}: Timestamp{nullable_suffix} {col_ann}'

    # ── Date ──────────────────────────────────────────────────────────────────
    if data_type == "date":
        return f'  {field}: Date{nullable_suffix} @col(name: "{col_name}", dataType: "date")'

    # ── UUID (non-PK) ─────────────────────────────────────────────────────────
    if data_type == "uuid":
        return f"  {field}: UUID{nullable_suffix} {col_ann}"

    # ── ARRAY columns ─────────────────────────────────────────────────────────
    if data_type == "ARRAY":
        if udt_name == "_int4":
            gql_arr = "[Int]"
        elif udt_name == "_text":
            gql_arr = "[String]"
        else:
            return None
        suffix = "" if is_nullable else "!"
        return f"  {field}: {gql_arr}{suffix} {col_ann}"

    # ── Standard scalars ──────────────────────────────────────────────────────
    gql_type = PG_TO_GQL.get(data_type)
    if gql_type is None:
        return None

    return f"  {field}: {gql_type}{nullable_suffix} {col_ann}"


# ── Type block generator ──────────────────────────────────────────────────────

def generate_type_block(cur, pg_table: str, gql_name: str) -> str:
    pks = get_primary_keys(cur, pg_table)
    columns = get_columns(cur, pg_table)
    skip = ALWAYS_SKIP.get(pg_table, set())
    composite_pk = COMPOSITE_PK_TABLES.get(pg_table)

    # Build @table directive
    non_id_pk = NON_ID_PK_TABLES.get(pg_table)
    if composite_pk:
        key_fields = "[" + ", ".join(f'"{f}"' for f in composite_pk) + "]"
        table_directive = f'@table(name: "{pg_table}", key: {key_fields})'
        # For composite key tables, no single field is @id — all PK fields are
        # declared as regular NOT NULL fields; DC uses the composite key.
        effective_pks: set[str] = set()  # skip special serial treatment
    elif non_id_pk:
        # Single non-'id' PK (e.g. slug): tell DC which field is the key
        table_directive = f'@table(name: "{pg_table}", key: ["{non_id_pk}"])'
        effective_pks = pks  # still mark the PK column for proper type emission
    else:
        table_directive = f'@table(name: "{pg_table}")'
        effective_pks = pks

    lines: list[str] = [f"type {gql_name} {table_directive} {{"]

    # PK fields first (single-column PK tables only)
    pk_fields_done: set[str] = set()
    if not composite_pk:
        for col in columns:
            if col[0] in pks:
                field_line = col_to_gql(col, effective_pks, skip)
                if field_line:
                    lines.append(field_line)
                    pk_fields_done.add(col[0])

    # Remaining fields
    for col in columns:
        col_name = col[0]
        if col_name in pk_fields_done:
            continue
        field_line = col_to_gql(col, effective_pks, skip)
        if field_line:
            lines.append(field_line)

    lines.append("}")
    return "\n".join(lines)


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--diff", action="store_true",
                        help="Run firebase dataconnect:sql:diff after generating")
    args = parser.parse_args()

    print("Connecting to Cloud SQL (gobookme_main)…")
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
    except Exception as exc:
        print(f"ERROR: {exc}")
        sys.exit(1)

    # ── Header ────────────────────────────────────────────────────────────────
    out: list[str] = ["""\
# GoBookMe Data Connect Schema
# =====================================================================
# AUTO-GENERATED by scripts/generate_schema_gql.py
# Strategy: COMPATIBLE schemaValidation
#
# All scalar fields are declared with @col(name:) annotations so that
# Data Connect reads from the exact Prisma-managed column names.
# Enum columns are declared as String — DC reads the stored value
# without attempting to retype the Prisma PascalCase enum columns.
# @ref directives are omitted — all FK constraints remain Prisma-managed.
# =====================================================================
"""]

    # ── Enums ─────────────────────────────────────────────────────────────────
    out.append("# ─── Enums (DC creates new lowercase PG types — additive only) ─────────────────")
    for enum_name, values in GQL_ENUMS.items():
        out.append(f"enum {enum_name} {{")
        for v in values:
            out.append(f"  {v}")
        out.append("}\n")

    # ── Types ─────────────────────────────────────────────────────────────────
    out.append("# ─── Types ──────────────────────────────────────────────────────────────────────")
    skipped: list[str] = []

    for pg_table, gql_name in TARGET_TABLES:
        if not table_exists(cur, pg_table):
            skipped.append(f"{pg_table} (table not found in DB)")
            continue

        print(f"  ✓  {pg_table} → {gql_name}")
        out.append(f"\n# ─── {gql_name}")
        try:
            block = generate_type_block(cur, pg_table, gql_name)
            out.append(block)
        except Exception as exc:
            skipped.append(f"{pg_table} ({exc})")
            out.append(f"# SKIPPED: {pg_table} — {exc}")

    cur.close()
    conn.close()

    # ── Write output ──────────────────────────────────────────────────────────
    content = "\n".join(out) + "\n"
    with open(OUTPUT_FILE, "w") as fh:
        fh.write(content)

    print(f"\n✅  Written → {OUTPUT_FILE}")
    if skipped:
        print(f"\n⚠️  Skipped tables:")
        for s in skipped:
            print(f"     • {s}")

    # ── Optional: Firebase diff ───────────────────────────────────────────────
    if args.diff:
        print("\n─── Running firebase dataconnect:sql:diff ───────────────────────────────────")
        result = subprocess.run(
            ["firebase", "dataconnect:sql:diff", "--project", FIREBASE_PROJECT],
            capture_output=False,
        )
        sys.exit(result.returncode)


if __name__ == "__main__":
    main()
