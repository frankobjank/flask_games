def dict_factory(cursor, row):
    """Returns SQL query as a dict."""
    fields = [column[0] for column in cursor.description]
    return {key: value for key, value in zip(fields, row)}


def to_percent(n: float) -> str:
    """Format as a percentage with 1 decimal place."""
    return f"{(n * 100.0):,.1f}%"
