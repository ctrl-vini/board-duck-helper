"""Serves the student interface: the HTML, styles, scripts and fonts in the static folder."""

import os

from fastapi.staticfiles import StaticFiles
from starlette.responses import Response
from starlette.staticfiles import PathLike
from starlette.types import Scope

# Reuse a file only after asking the server whether it changed.
REVALIDATE_ON_EVERY_LOAD = "no-cache"


class FrontendFiles(StaticFiles):
    """Static files the browser revalidates on every load.

    Without a Cache-Control header, browsers keep reusing a file for a while once it has gone
    unchanged for hours, so a reload after an update could run old scripts with new ones. Asking
    first costs one request per file, answered with 304 Not Modified while nothing changed.
    """

    def file_response(
        self,
        full_path: PathLike,
        stat_result: os.stat_result,
        scope: Scope,
        status_code: int = 200,
    ) -> Response:
        response = super().file_response(full_path, stat_result, scope, status_code)
        response.headers["Cache-Control"] = REVALIDATE_ON_EVERY_LOAD
        return response
