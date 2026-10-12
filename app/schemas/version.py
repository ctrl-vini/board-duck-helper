"""Data shape for the running application's version."""

from pydantic import BaseModel


class AppVersion(BaseModel):
    """Name and version of the running application."""

    name: str
    version: str
