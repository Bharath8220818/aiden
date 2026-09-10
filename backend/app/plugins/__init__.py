"""AIDEN Plugin System.

Plugins are small async callables that hook into platform events:
notification channels (Slack, Teams, PagerDuty...), custom validators,
or post-execution processors.

See builtin/ for reference implementations and custom/ for a template.
"""
from app.plugins.plugin_manager import PluginManager, plugin_manager

__all__ = ["PluginManager", "plugin_manager"]
