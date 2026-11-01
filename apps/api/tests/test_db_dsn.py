"""asyncpg must get a URL it accepts, whatever form the connection string was pasted in.

The URLs are hand-built test inputs on a reserved example host; none is a real credential.
"""

from app.db import dsn_for_asyncpg

TEST_HOST = "db.example.test"


def test_channel_binding_is_dropped_and_sslmode_kept() -> None:
    url = f"postgresql://u:p@{TEST_HOST}/app?sslmode=require&channel_binding=require"
    assert dsn_for_asyncpg(url) == f"postgresql://u:p@{TEST_HOST}/app?sslmode=require"


def test_channel_binding_as_the_only_parameter_leaves_no_query() -> None:
    assert dsn_for_asyncpg(f"postgresql://u:p@{TEST_HOST}/app?channel_binding=require") == (
        f"postgresql://u:p@{TEST_HOST}/app"
    )


def test_sqlalchemy_schemes_are_normalised() -> None:
    assert dsn_for_asyncpg(f"postgresql+psycopg://u:p@{TEST_HOST}/app").startswith("postgresql://")
    assert dsn_for_asyncpg(f"postgresql+asyncpg://u:p@{TEST_HOST}/app").startswith("postgresql://")


def test_a_plain_url_is_unchanged() -> None:
    url = f"postgresql://u:p@{TEST_HOST}:5432/app"
    assert dsn_for_asyncpg(url) == url


def test_other_parameters_and_their_order_survive() -> None:
    url = f"postgresql://u:p@{TEST_HOST}/app?application_name=khet&sslmode=require&channel_binding=require"
    assert (
        dsn_for_asyncpg(url)
        == f"postgresql://u:p@{TEST_HOST}/app?application_name=khet&sslmode=require"
    )
