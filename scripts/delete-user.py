#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "psycopg2-binary",
# ]
# ///
"""Look up (and optionally delete) a user account and its dependent data.

Handles an account-deletion / right-to-erasure request. With no flags,
only reports what exists for the given email (read-only). Pass --delete
to actually remove the user row and all dependent rows found.

Usage:
  uv run scripts/delete-user.py "postgresql://user:pass@host:5432/dbname" --email someone@example.com
  uv run scripts/delete-user.py "postgresql://..." --email someone@example.com --delete
"""

import argparse
import sys

import psycopg2


def report(cur, uid, email):
    print(f"\nuser id={uid} email={email}", file=sys.stderr)

    cur.execute("SELECT token, action, expires FROM users_reset WHERE uid = %s", (uid,))
    rows = cur.fetchall()
    print(f"  users_reset: {len(rows)} row(s)", file=sys.stderr)

    cur.execute("SELECT name, token, created FROM users_tokens WHERE uid = %s", (uid,))
    rows = cur.fetchall()
    print(f"  users_tokens: {len(rows)} row(s)", file=sys.stderr)

    cur.execute("SELECT id, created FROM exports WHERE uid = %s", (uid,))
    rows = cur.fetchall()
    print(f"  exports: {len(rows)} row(s)", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("db_uri", help="Postgres connection URI")
    parser.add_argument("--email", required=True, help="Email address of the account to look up/delete")
    parser.add_argument("--delete", action="store_true", help="Actually delete the user and dependent rows (default: report only)")
    args = parser.parse_args()

    db_uri = args.db_uri.replace("sslmode=no-verify", "sslmode=require")
    conn = psycopg2.connect(db_uri)
    cur = conn.cursor()

    cur.execute("SELECT id, email, username, level, access, oc_contribution_id FROM users WHERE email = %s", (args.email,))
    row = cur.fetchone()
    if not row:
        print(f"No user found with email {args.email}", file=sys.stderr)
        cur.close()
        conn.close()
        sys.exit(1)

    uid, email, username, level, access, oc_contribution_id = row
    print(f"Found user: id={uid} username={username} email={email} level={level} access={access} oc_contribution_id={oc_contribution_id}", file=sys.stderr)

    report(cur, uid, email)

    if not args.delete:
        print("\nRead-only report complete. Re-run with --delete to remove this account.", file=sys.stderr)
        cur.close()
        conn.close()
        return

    print("\nDeleting...", file=sys.stderr)
    cur.execute("DELETE FROM users_reset WHERE uid = %s", (uid,))
    print(f"  deleted {cur.rowcount} row(s) from users_reset", file=sys.stderr)

    cur.execute("DELETE FROM users_tokens WHERE uid = %s", (uid,))
    print(f"  deleted {cur.rowcount} row(s) from users_tokens", file=sys.stderr)

    cur.execute("DELETE FROM exports WHERE uid = %s", (uid,))
    print(f"  deleted {cur.rowcount} row(s) from exports", file=sys.stderr)

    cur.execute("DELETE FROM users WHERE id = %s", (uid,))
    print(f"  deleted {cur.rowcount} row(s) from users", file=sys.stderr)

    conn.commit()
    print("Done.", file=sys.stderr)

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
