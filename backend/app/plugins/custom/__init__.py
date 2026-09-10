"""Example custom plugin — a template for writing your own.

To register it, add to plugin_manager._discover_builtin() or call::

    from app.plugins.plugin_manager import plugin_manager
    from app.plugins.custom.example_plugin import ExamplePlugin
    plugin_manager.register_plugin("example", ExamplePlugin())
"""
import logging

logger = logging.getLogger(__name__)


class ExamplePlugin:
    """Logs every event it receives and echoes a comment for notifications."""

    name = "example"

    # ── Event hook (registered via plugin_manager.register_hook) ────────

    async def on_event(self, event_type: str, payload: dict):
        logger.info(f"[example_plugin] {event_type}: {list(payload.keys())}")

    # ── Notification plugin interface ───────────────────────────────────

    async def send_notification(self, alert: dict) -> bool:
        logger.info(f"[example_plugin] notification: {alert.get('title')} ({alert.get('severity')})")
        return True  # pretend delivery succeeded


example_plugin = ExamplePlugin()
