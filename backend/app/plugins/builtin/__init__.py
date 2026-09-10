"""Built-in plugins shipped with AIDEN."""
from app.plugins.builtin.email_alert_plugin import EmailAlertPlugin, email_plugin
from app.plugins.builtin.slack_alert import SlackAlertPlugin, slack_plugin
from app.plugins.builtin.teams_alert import TeamsAlertPlugin, teams_plugin

__all__ = ["EmailAlertPlugin", "email_plugin", "SlackAlertPlugin", "slack_plugin", "TeamsAlertPlugin", "teams_plugin"]
