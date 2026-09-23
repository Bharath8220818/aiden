"""MCP-style integration adapters (spec §12).

Each subpackage/adapter wraps ONE external system behind a narrow, uniform
interface so the Tool Registry and NotificationService never talk to a vendor
API directly:

    outlook/  — email via SMTP (Outlook, Gmail, SES all speak SMTP)
    slack/    — incoming-webhook chat post
    teams/    — Power Automate / O365 Connector card post
    jira/     — REST issue creation (config-driven; degrades honestly)

`registry.py` is the adapter catalog + capability/status reporting;
`permissions.py` centralizes the tool→permission/risk policy shared by the
Tool Registry, the governance API and `/workspace/tools`.
"""
