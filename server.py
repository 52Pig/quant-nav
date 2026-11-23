"""Serve quant-nav on the local machine for its Windows startup task."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from functools import partial
from urllib.parse import unquote, urlsplit
import json
import os


ROOT = Path(__file__).resolve().parent
LOCAL_CONFIG = ROOT / "quant-nav.local.json"
try:
    local_config = json.loads(LOCAL_CONFIG.read_text(encoding="utf-8"))
except (OSError, json.JSONDecodeError):
    local_config = {}

DATA_CATALOG = Path(
    os.environ.get("QUANT_NAV_DATA_CATALOG", local_config.get("data_catalog", ROOT / "data-assets"))
).resolve()
HOST = os.environ.get("QUANT_NAV_HOST", "127.0.0.1")
PORT = int(os.environ.get("QUANT_NAV_PORT", "8765"))


class QuietRequestHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        url_path = unquote(urlsplit(path).path)
        mount = "/data-assets/"
        if url_path.startswith(mount):
            relative_path = url_path[len(mount):]
            candidate = (DATA_CATALOG / relative_path).resolve()
            if candidate != DATA_CATALOG and DATA_CATALOG not in candidate.parents:
                return str(DATA_CATALOG / "__invalid_path__")
            return str(candidate)
        return super().translate_path(path)

    def log_message(self, format_string, *args):
        return


handler = partial(QuietRequestHandler, directory=str(ROOT))
server = ThreadingHTTPServer((HOST, PORT), handler)
server.daemon_threads = True
server.serve_forever()
