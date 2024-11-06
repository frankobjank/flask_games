import random


# Names to randomly assign
NAMES = ["Henk", "Jenkins", "Stone", "Bubbles", "Pickles", "Skwisgaar", "Gertrude"]


def dict_factory(cursor, row):
    """Returns SQL query as a dict."""
    fields = [column[0] for column in cursor.description]
    return {key: value for key, value in zip(fields, row)}


def to_percent(n: float) -> str:
    """Format as a percentage with 1 decimal place."""
    return f"{(n * 100.0):,.1f}%"


# Eventually change to pass in existing names so it can check for duplicates
def get_random_name() -> str:
    """Get a random name if user doesn't have one."""

    return NAMES[random.randint(0, len(NAMES) - 1)]