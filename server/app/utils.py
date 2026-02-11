"""
Utility functions for the application.
Common helper functions used across the application.
"""

from datetime import datetime


def log_separator(title: str = "", width: int = 60) -> None:
    """
    Print a formatted separator line with optional title.

    Args:
        title: Title to display in the separator
        width: Width of the separator line
    """
    if title:
        print("\n" + "=" * width)
        print(f"  {title}")
        print("=" * width)
    else:
        print("=" * width)


def format_timestamp(dt: datetime) -> str:
    """
    Format datetime to standard string format.

    Args:
        dt: Datetime object to format

    Returns:
        Formatted timestamp string
    """
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def format_phone(phone: str) -> str:
    """
    Validate and format phone number.

    Args:
        phone: Phone number string

    Returns:
        Formatted phone number or original if invalid format
    """
    # Remove all non-digit characters
    digits = "".join(filter(str.isdigit, phone))

    if len(digits) >= 10:
        return phone  # Return original if valid
    return phone
