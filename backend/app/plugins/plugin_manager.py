"""Plugin manager — discovers, registers, and dispatches to plugins."""
import logging
from typing import Any, Callable, Dict, List

logger = logging.getLogger(__name__)


class PluginManager:
    """Registry + dispatcher for AIDEN plugins.

    A plugin registers hooks under an event name::

        plugin_manager.register_hook("incident.created", my_handler)

    Notification plugins additionally implement ``send_notification(alert)``.
    """

    def __init__(self):
        self._hooks: Dict[str, List[Callable]] = {}
        self._plugins: Dict[str, Any] = {}
        self._discover_builtin()

    # ── Registration ────────────────────────────────────────────────────

    def register_plugin(self, name: str, plugin: Any):
        """Register a plugin instance under a name."""
        self._plugins[name] = plugin
        logger.info(f"Plugin registered: {name}")

    def register_hook(self, event: str, handler: Callable):
        """Register an async handler for a platform event."""
        self._hooks.setdefault(event, []).append(handler)

    # ── Dispatch ────────────────────────────────────────────────────────

    async def dispatch_event(self, event: str, payload: dict) -> List[dict]:
        """Call all handlers registered for an event. Errors are isolated."""
        results = []
        for handler in self._hooks.get(event, []):
            try:
                result = handler(payload)
                if hasattr(result, "__await__"):
                    result = await result
                results.append({"plugin": getattr(handler, "__self__", None).__class__.__name__ if hasattr(handler, "__self__") else handler.__name__, "status": "ok", "result": result})
            except Exception as e:
                logger.error(f"Plugin hook '{event}' failed: {e}")
                results.append({"plugin": getattr(handler, "__name__", "unknown"), "status": "error", "error": str(e)})
        return results

    async def dispatch_notification(self, plugin_name: str, alert: dict) -> dict:
        """Send a notification through a named notification plugin."""
        plugin = self._plugins.get(plugin_name)
        if plugin is None:
            return {"status": "plugin_missing", "plugin": plugin_name}
        send = getattr(plugin, "send_notification", None)
        if send is None:
            return {"status": "not_a_notification_plugin", "plugin": plugin_name}
        result = send(alert)
        if hasattr(result, "__await__"):
            result = await result
        return {"status": "ok" if result else "failed", "plugin": plugin_name, "result": result}

    # ── Introspection ───────────────────────────────────────────────────

    def list_plugins(self) -> List[dict]:
        return [
            {
                "name": name,
                "type": type(p).__name__,
                "hooks": [e for e, hs in self._hooks.items() if any(getattr(h, "__module__", "") == getattr(p, "__module__", "") for h in hs)],
                "enabled": True,
            }
            for name, p in self._plugins.items()
        ]

    # ── Discovery ───────────────────────────────────────────────────────

    def _discover_builtin(self):
        """Import built-in plugins; failures are non-fatal."""
        try:
            from app.plugins.builtin.email_alert_plugin import email_plugin
            self.register_plugin("email_alert", email_plugin)
        except Exception as e:
            logger.debug(f"email_alert plugin unavailable: {e}")
        try:
            from app.plugins.builtin.slack_alert import slack_plugin
            self.register_plugin("slack_alert", slack_plugin)
        except Exception as e:
            logger.debug(f"slack_alert plugin unavailable: {e}")
        try:
            from app.plugins.builtin.teams_alert import teams_plugin
            self.register_plugin("teams_alert", teams_plugin)
        except Exception as e:
            logger.debug(f"teams_alert plugin unavailable: {e}")


plugin_manager = PluginManager()
