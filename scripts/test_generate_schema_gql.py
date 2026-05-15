#!/usr/bin/env python3
"""
test_generate_schema_gql.py
============================
Tests for the schema.gql generator.

Test groups:
  1. Unit tests — is_safe_column() logic (no DB required)
  2. Integration tests — queries the live DB to verify known facts
  3. Output tests — runs the generator and validates the produced GQL

Run with: python3 scripts/test_generate_schema_gql.py
"""

import sys
import os
import re
import unittest

# Make the scripts directory importable
sys.path.insert(0, os.path.dirname(__file__))
from generate_schema_gql import (
    is_safe_column,
    PG_TO_GQL,
    PRISMA_ENUM_UDT_NAMES,
    GQL_ENUMS,
    GQL_TYPE_NAMES,
    TARGET_TABLES,
    DB_URL,
    OUTPUT_FILE,
    get_columns,
    get_primary_keys,
    get_foreign_keys,
    generate_type_block,
)

# ── Helpers ────────────────────────────────────────────────────────────────────

def make_col(name, data_type, udt_name, is_nullable="YES", default=None):
    """Build a fake column tuple matching psycopg2 row format."""
    return (name, data_type, udt_name, is_nullable, default, 1)


# ══════════════════════════════════════════════════════════════════════════════
# 1. UNIT TESTS — No DB connection needed
# ══════════════════════════════════════════════════════════════════════════════

class TestIsSafeColumn(unittest.TestCase):
    """Tests for the is_safe_column() safety filter."""

    def test_nullable_text_column_is_safe(self):
        col = make_col("bio", "text", "text", is_nullable="YES")
        include, gql_type, ann = is_safe_column(col, pks=set(), skip_set=set())
        self.assertTrue(include)
        self.assertEqual(gql_type, "String")
        self.assertIn("bio", ann)

    def test_nullable_int_column_is_safe(self):
        col = make_col("parentId", "integer", "int4", is_nullable="YES")
        include, gql_type, ann = is_safe_column(col, pks=set(), skip_set=set())
        self.assertTrue(include)
        self.assertEqual(gql_type, "Int")

    def test_nullable_jsonb_maps_to_any(self):
        col = make_col("metadata", "jsonb", "jsonb", is_nullable="YES")
        include, gql_type, ann = is_safe_column(col, pks=set(), skip_set=set())
        self.assertTrue(include)
        self.assertEqual(gql_type, "Any")

    def test_nullable_uuid_is_safe(self):
        col = make_col("uuid", "uuid", "uuid", is_nullable="NO", default=None)
        # uuid NOT NULL without default is still safe if it's treated as not a bool/enum
        # In practice uuid not null is a PK candidate — here pks is empty so treated as nullable logic
        include, gql_type, ann = is_safe_column(col, pks={"uuid"}, skip_set=set())
        self.assertTrue(include)
        self.assertEqual(gql_type, "UUID")

    def test_enum_column_is_excluded(self):
        """Enum-typed columns (USER-DEFINED) must be excluded to prevent ALTER TABLE."""
        col = make_col("status", "USER-DEFINED", "BookingStatus", is_nullable="NO")
        include, _, _ = is_safe_column(col, pks=set(), skip_set=set())
        self.assertFalse(include, "Enum columns should be excluded")

    def test_boolean_not_null_non_pk_is_excluded(self):
        """NOT NULL booleans cause DC to DROP NOT NULL — must be excluded."""
        col = make_col("hideBranding", "boolean", "bool", is_nullable="NO", default="false")
        include, _, _ = is_safe_column(col, pks=set(), skip_set=set())
        self.assertFalse(include, "NOT NULL boolean should be excluded")

    def test_nullable_boolean_is_safe(self):
        col = make_col("noShow", "boolean", "bool", is_nullable="YES")
        include, gql_type, _ = is_safe_column(col, pks=set(), skip_set=set())
        self.assertTrue(include)
        self.assertEqual(gql_type, "Boolean")

    def test_time_column_is_excluded(self):
        """TIME columns not supported by Data Connect."""
        col = make_col("startTime", "time without time zone", "time", is_nullable="NO")
        include, _, _ = is_safe_column(col, pks=set(), skip_set=set())
        self.assertFalse(include, "TIME columns should be excluded")

    def test_not_null_timestamp_non_pk_excluded(self):
        """NOT NULL timestamp causes DC to DROP NOT NULL — exclude."""
        col = make_col("createdAt", "timestamp without time zone", "timestamp", is_nullable="NO", default="now()")
        include, _, _ = is_safe_column(col, pks=set(), skip_set=set())
        self.assertFalse(include)

    def test_nullable_timestamp_is_safe(self):
        col = make_col("emailVerified", "timestamp without time zone", "timestamp", is_nullable="YES")
        include, gql_type, ann = is_safe_column(col, pks=set(), skip_set=set())
        self.assertTrue(include)
        self.assertEqual(gql_type, "Timestamp")
        self.assertIn("timestamp", ann)

    def test_integer_array_maps_to_int_list(self):
        col = make_col("days", "ARRAY", "_int4", is_nullable="YES")
        include, gql_type, _ = is_safe_column(col, pks=set(), skip_set=set())
        self.assertTrue(include)
        self.assertEqual(gql_type, "[Int]")

    def test_explicitly_skipped_column_is_excluded(self):
        col = make_col("organizationId", "integer", "int4", is_nullable="YES")
        include, _, _ = is_safe_column(col, pks=set(), skip_set={"organizationId"})
        self.assertFalse(include, "Explicitly skipped columns must be excluded")

    def test_unknown_user_defined_type_excluded(self):
        col = make_col("weirdField", "USER-DEFINED", "SomePrismaEnum", is_nullable="YES")
        include, _, _ = is_safe_column(col, pks=set(), skip_set=set())
        self.assertFalse(include)

    def test_date_column_is_safe(self):
        col = make_col("periodDate", "date", "date", is_nullable="YES")
        include, gql_type, ann = is_safe_column(col, pks=set(), skip_set=set())
        self.assertTrue(include)
        self.assertEqual(gql_type, "Date")
        self.assertIn("date", ann)


class TestGqlEnums(unittest.TestCase):
    """Validate enum declarations match actual DB values."""

    def test_booking_status_values_are_lowercase(self):
        vals = GQL_ENUMS["BookingStatus"]
        for v in vals:
            self.assertEqual(v, v.lower(), f"BookingStatus value '{v}' should be lowercase")

    def test_user_permission_role_values_uppercase(self):
        for v in GQL_ENUMS["UserPermissionRole"]:
            self.assertEqual(v, v.upper())

    def test_all_expected_enums_present(self):
        required = {"BookingStatus", "MembershipRole", "IdentityProvider",
                    "SchedulingType", "PeriodType"}
        self.assertTrue(required.issubset(set(GQL_ENUMS.keys())))

    def test_enum_names_are_pascal_case(self):
        """Data Connect naming linter requires PascalCase enum names."""
        for name in GQL_ENUMS:
            self.assertTrue(name[0].isupper(), f"Enum {name} must start with uppercase")
            # Must not contain consecutive uppercase (SMSLockState, RRResetInterval → fail)
            bad = re.search(r'[A-Z]{3,}', name)
            self.assertIsNone(bad, f"Enum {name} has 3+ consecutive uppercase — DC linter will reject")


class TestTypeNameMapping(unittest.TestCase):
    def test_all_target_tables_have_gql_names(self):
        for t in TARGET_TABLES:
            self.assertIn(t, GQL_TYPE_NAMES, f"Table '{t}' missing from GQL_TYPE_NAMES")

    def test_users_maps_to_user(self):
        self.assertEqual(GQL_TYPE_NAMES["users"], "User")

    def test_team_maps_to_team(self):
        self.assertEqual(GQL_TYPE_NAMES["Team"], "Team")


# ══════════════════════════════════════════════════════════════════════════════
# 2. INTEGRATION TESTS — Live DB connection
# ══════════════════════════════════════════════════════════════════════════════

try:
    import psycopg2
    conn = psycopg2.connect(DB_URL)
    DB_AVAILABLE = True
    conn.close()
except Exception:
    DB_AVAILABLE = False


@unittest.skipUnless(DB_AVAILABLE, "Live DB not available")
class TestLiveDBColumns(unittest.TestCase):
    """Verify known DB facts that the generator relies on."""

    def setUp(self):
        self.conn = psycopg2.connect(DB_URL)
        self.cursor = self.conn.cursor()

    def tearDown(self):
        self.cursor.close()
        self.conn.close()

    def _col_map(self, table):
        cols = get_columns(self.cursor, table)
        return {c[0]: c for c in cols}

    def test_users_email_column_exists_and_not_null(self):
        cols = self._col_map("users")
        self.assertIn("email", cols)
        self.assertEqual(cols["email"][3], "NO")  # NOT NULL

    def test_users_avatar_url_camelcase(self):
        cols = self._col_map("users")
        self.assertIn("avatarUrl", cols, "Expected camelCase 'avatarUrl', not 'avatar_url'")

    def test_users_identity_provider_is_enum(self):
        cols = self._col_map("users")
        self.assertIn("identityProvider", cols)
        self.assertEqual(cols["identityProvider"][1], "USER-DEFINED")
        self.assertEqual(cols["identityProvider"][2], "IdentityProvider")

    def test_booking_status_is_enum(self):
        cols = self._col_map("Booking")
        self.assertIn("status", cols)
        self.assertEqual(cols["status"][2], "BookingStatus")

    def test_booking_status_values_match_gql(self):
        self.cursor.execute("""
            SELECT enumlabel FROM pg_enum
            JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
            WHERE pg_type.typname = 'BookingStatus'
            ORDER BY enumsortorder
        """)
        db_values = {row[0] for row in self.cursor.fetchall()}
        gql_values = set(GQL_ENUMS["BookingStatus"])
        self.assertEqual(db_values, gql_values,
            f"BookingStatus mismatch.\nDB:  {sorted(db_values)}\nGQL: {sorted(gql_values)}")

    def test_team_has_camelcase_columns(self):
        cols = self._col_map("Team")
        self.assertIn("logoUrl", cols)
        self.assertIn("hideBranding", cols)
        self.assertIn("rrResetInterval", cols)
        self.assertNotIn("logo_url", cols)

    def test_availability_start_time_is_time_type(self):
        """startTime/endTime are TIME columns — must be excluded from GQL."""
        cols = self._col_map("Availability")
        self.assertIn("startTime", cols)
        self.assertIn("time", cols["startTime"][1])

    def test_membership_primary_key_is_id(self):
        pks = get_primary_keys(self.cursor, "Membership")
        self.assertIn("id", pks)

    def test_users_primary_key_is_id(self):
        pks = get_primary_keys(self.cursor, "users")
        self.assertIn("id", pks)

    def test_booking_user_fk_points_to_users(self):
        fks = get_foreign_keys(self.cursor, "Booking")
        self.assertIn("userId", fks)
        ref_table, ref_col = fks["userId"]
        self.assertEqual(ref_table, "users")
        self.assertEqual(ref_col, "id")

    def test_attendee_booking_fk(self):
        fks = get_foreign_keys(self.cursor, "Attendee")
        self.assertIn("bookingId", fks)
        self.assertEqual(fks["bookingId"][0], "Booking")

    def test_schedule_user_fk(self):
        fks = get_foreign_keys(self.cursor, "Schedule")
        self.assertIn("userId", fks)
        self.assertEqual(fks["userId"][0], "users")


# ══════════════════════════════════════════════════════════════════════════════
# 3. OUTPUT TESTS — Run generator, parse the GQL, validate structure
# ══════════════════════════════════════════════════════════════════════════════

@unittest.skipUnless(DB_AVAILABLE, "Live DB not available (needed to generate schema)")
class TestGeneratedOutput(unittest.TestCase):
    """Run the generator and validate the produced schema.gql."""

    @classmethod
    def setUpClass(cls):
        """Run the generator once for all output tests."""
        import subprocess
        result = subprocess.run(
            [sys.executable, os.path.join(os.path.dirname(__file__), "generate_schema_gql.py")],
            capture_output=True, text=True
        )
        cls.generator_stdout = result.stdout
        cls.generator_returncode = result.returncode
        with open(OUTPUT_FILE) as f:
            cls.gql_content = f.read()

    def test_generator_exits_zero(self):
        self.assertEqual(self.generator_returncode, 0,
            f"Generator failed:\n{self.generator_stdout}")

    def test_output_file_is_not_empty(self):
        self.assertGreater(len(self.gql_content), 100)

    def test_all_target_types_present(self):
        for gql_name in GQL_TYPE_NAMES.values():
            self.assertIn(f"type {gql_name} @table", self.gql_content,
                f"Expected type '{gql_name}' in generated schema")

    def test_all_enums_declared(self):
        for enum_name in GQL_ENUMS:
            self.assertIn(f"enum {enum_name}", self.gql_content,
                f"Expected enum '{enum_name}' in generated schema")

    def test_no_sms_lock_state_all_caps(self):
        """SMSLockState (3 consecutive uppercase) should be renamed to SmsLockState."""
        self.assertNotIn("enum SMSLockState", self.gql_content)
        self.assertNotIn("enum RRResetInterval", self.gql_content)
        self.assertNotIn("enum RRTimestampBasis", self.gql_content)

    def test_no_ref_directives_in_output(self):
        """@ref causes DC to DROP Prisma FK constraints — must not appear."""
        self.assertNotIn("@ref(", self.gql_content,
            "@ref directives cause DROP CONSTRAINT in COMPATIBLE mode")

    def test_no_unique_directives_in_output(self):
        """@unique causes DC to rename indexes — must not appear."""
        self.assertNotIn("@unique", self.gql_content,
            "@unique causes DROP INDEX in COMPATIBLE mode")

    def test_enum_columns_not_in_user_type(self):
        """identityProvider, role, smsLockState must be excluded from User type."""
        # Find the User type block
        user_block = re.search(r'type User @table.*?\}', self.gql_content, re.DOTALL)
        self.assertIsNotNone(user_block, "User type not found")
        block = user_block.group(0)
        self.assertNotIn("identityProvider:", block,
            "identityProvider enum column should be excluded from User")
        self.assertNotIn("smsLockState:", block,
            "smsLockState enum column should be excluded from User")

    def test_boolean_not_null_excluded_from_team(self):
        """hideBranding (boolean NOT NULL) must not appear in Team type."""
        team_block = re.search(r'type Team @table.*?\}', self.gql_content, re.DOTALL)
        self.assertIsNotNone(team_block)
        block = team_block.group(0)
        self.assertNotIn("hideBranding:", block,
            "hideBranding (boolean NOT NULL) should be excluded from Team")

    def test_time_columns_excluded_from_availability(self):
        """startTime/endTime are TIME type — must not appear in Availability."""
        avail_block = re.search(r'type Availability @table.*?\}', self.gql_content, re.DOTALL)
        self.assertIsNotNone(avail_block)
        block = avail_block.group(0)
        self.assertNotIn("startTime:", block)
        self.assertNotIn("endTime:", block)

    def test_timestamp_columns_have_datatype_annotation(self):
        """Timestamp columns must declare dataType: \"timestamp\" to match DB precision."""
        self.assertIn('dataType: "timestamp"', self.gql_content)

    def test_no_syntax_double_parens(self):
        """Check for the )) syntax error that broke compilation before."""
        self.assertNotIn("))", self.gql_content)

    def test_types_have_id_field(self):
        for gql_name in GQL_TYPE_NAMES.values():
            # Find this type's block
            block_match = re.search(
                rf'type {gql_name} @table.*?\}}', self.gql_content, re.DOTALL)
            if block_match:
                block = block_match.group(0)
                self.assertIn("id:", block, f"{gql_name} should have an 'id' field")


# ══════════════════════════════════════════════════════════════════════════════
# Runner
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("GoBookMe Schema Generator — Test Suite")
    print("=" * 60)
    if not DB_AVAILABLE:
        print("⚠  WARNING: Live DB not reachable. Integration & output tests skipped.\n")
    unittest.main(verbosity=2)
