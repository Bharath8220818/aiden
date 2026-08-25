"""
AIDEN CLI — Terminal interface for the Autonomous Intelligence Data Engineering Nexus.

Usage:
    aiden <command> <subcommand> [options]

Commands:
    auth         Login and configure AIDEN
    pipeline     Manage data pipelines
    architecture Generate and manage architecture diagrams
    sql          Execute SQL queries via AI
    monitor      View pipeline monitoring and alerts
    agent        Run AI agents from terminal
    connection   Manage tool connections
    incident     Manage incidents
    system       System health and diagnostics
"""
import json
import os
import sys
from pathlib import Path
from typing import Optional

import click
import httpx
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.syntax import Syntax
from rich import box

console = Console()

# ── Configuration ──────────────────────────────────────────────────────────────

CONFIG_DIR = Path.home() / ".aiden"
CONFIG_FILE = CONFIG_DIR / "config.json"


def load_config() -> dict:
    """Load AIDEN configuration."""
    if CONFIG_FILE.exists():
        return json.loads(CONFIG_FILE.read_text())
    return {"api_url": "http://localhost:8000", "token": "", "project": ""}


def save_config(config: dict):
    """Save AIDEN configuration."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(json.dumps(config, indent=2))


def api_client() -> httpx.Client:
    """Create an authenticated API client."""
    config = load_config()
    headers = {}
    if config.get("token"):
        headers["Authorization"] = f"Bearer {config['token']}"
    return httpx.Client(
        base_url=config["api_url"],
        headers=headers,
        timeout=30.0,
    )


def handle_error(e: Exception):
    """Handle API errors with friendly messages."""
    if isinstance(e, httpx.ConnectError):
        console.print("[red]Error:[/] Cannot connect to AIDEN server. Is it running?")
        console.print("  Run: [cyan]aiden system status[/] to check")
    elif isinstance(e, httpx.HTTPStatusError):
        status = e.response.status_code
        if status == 401:
            console.print("[red]Error:[/] Not authenticated. Run: [cyan]aiden auth login[/]")
        elif status == 404:
            console.print("[red]Error:[/] Resource not found")
        else:
            console.print(f"[red]Error:[/] HTTP {status} — {e.response.text[:200]}")
    else:
        console.print(f"[red]Error:[/] {e}")


# ── Main CLI Group ─────────────────────────────────────────────────────────────

@click.group()
@click.version_option(version="0.1.0", prog_name="AIDEN CLI")
def main():
    """AIDEN — Autonomous Intelligence Data Engineering Nexus CLI"""
    pass


# ── Auth Commands ──────────────────────────────────────────────────────────────

@main.group()
def auth():
    """Authentication and configuration"""
    pass


@auth.command("login")
@click.option("--email", prompt="Email", help="Your email address")
@click.option("--password", prompt=True, hide_input=True, help="Your password")
def auth_login(email: str, password: str):
    """Login to AIDEN"""
    with api_client() as client:
        try:
            resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
            resp.raise_for_status()
            data = resp.json()
            config = load_config()
            config["token"] = data.get("access_token", data.get("token", ""))
            save_config(config)
            console.print("[green]✓[/] Logged in successfully")
        except Exception as e:
            handle_error(e)


@auth.command("configure")
@click.option("--url", prompt="API URL", default="http://localhost:8000", help="AIDEN server URL")
@click.option("--project", prompt="Project name", default="default", help="Default project")
def auth_configure(url: str, project: str):
    """Configure AIDEN connection"""
    config = load_config()
    config["api_url"] = url.rstrip("/")
    config["project"] = project
    save_config(config)
    console.print(f"[green]✓[/] Configured: {url} (project: {project})")


@auth.command("whoami")
def auth_whoami():
    """Show current authentication status"""
    config = load_config()
    if config.get("token"):
        console.print(f"[green]✓[/] Authenticated")
        console.print(f"  Server: {config['api_url']}")
        console.print(f"  Project: {config['project']}")
    else:
        console.print("[yellow]Not authenticated[/]. Run: [cyan]aiden auth login[/]")


# ── Pipeline Commands ──────────────────────────────────────────────────────────

@main.group()
def pipeline():
    """Manage data pipelines"""
    pass


@pipeline.command("list")
@click.option("--status", "-s", help="Filter by status")
@click.option("--limit", "-n", default=20, help="Max results")
def pipeline_list(status: Optional[str], limit: int):
    """List all pipelines"""
    with api_client() as client:
        try:
            params = {"limit": limit}
            if status:
                params["status"] = status
            resp = client.get("/api/v1/pipelines", params=params)
            resp.raise_for_status()
            data = resp.json()
            pipelines = data if isinstance(data, list) else data.get("pipelines", [])

            table = Table(title="Pipelines", box=box.SIMPLE_HEAVY)
            table.add_column("ID", style="dim")
            table.add_column("Name", style="bold")
            table.add_column("Source → Dest")
            table.add_column("Status")
            table.add_column("Schedule")

            status_colors = {
                "success": "green", "running": "blue", "failed": "red",
                "draft": "dim", "pending": "yellow", "paused": "dim",
            }

            for p in pipelines:
                s = p.get("status", "unknown")
                color = status_colors.get(s, "white")
                src = p.get("source_type", "N/A")
                dst = p.get("destination_type", "N/A")
                table.add_row(
                    str(p.get("id", "")),
                    p.get("name", "Unnamed"),
                    f"{src} → {dst}",
                    f"[{color}]{s}[/]",
                    p.get("schedule") or "—",
                )

            console.print(table)
        except Exception as e:
            handle_error(e)


@pipeline.command("create")
@click.argument("prompt")
@click.option("--dry-run", is_flag=True, help="Show what would be created")
def pipeline_create(prompt: str, dry_run: bool):
    """Create a pipeline from natural language"""
    with api_client() as client:
        try:
            resp = client.post("/api/v1/pipelines/from-prompt", json={
                "prompt": prompt,
                "dry_run": dry_run,
            })
            resp.raise_for_status()
            data = resp.json()

            console.print(Panel(
                f"[bold]{data.get('name', 'Pipeline')}[/]\n"
                f"Source: {data.get('source_type', 'N/A')}\n"
                f"Destination: {data.get('destination_type', 'N/A')}\n"
                f"Schedule: {data.get('schedule', 'N/A')}\n"
                f"Confidence: {data.get('confidence', 0):.0%}",
                title="[green]Pipeline Created[/]" if not dry_run else "[yellow]Dry Run[/]",
                border_style="green" if not dry_run else "yellow",
            ))
        except Exception as e:
            handle_error(e)


@pipeline.command("run")
@click.argument("pipeline_id", type=int)
def pipeline_run(pipeline_id: int):
    """Run a pipeline"""
    with api_client() as client:
        try:
            resp = client.post(f"/api/v1/pipelines/{pipeline_id}/run")
            resp.raise_for_status()
            console.print(f"[green]✓[/] Pipeline #{pipeline_id} started")
        except Exception as e:
            handle_error(e)


@pipeline.command("status")
@click.argument("pipeline_id", type=int)
def pipeline_status(pipeline_id: int):
    """Show pipeline status"""
    with api_client() as client:
        try:
            resp = client.get(f"/api/v1/pipelines/{pipeline_id}")
            resp.raise_for_status()
            p = resp.json()
            console.print(Panel(
                f"[bold]{p.get('name', 'Pipeline')}[/]\n"
                f"Status: {p.get('status', 'unknown')}\n"
                f"Source: {p.get('source_type', 'N/A')} → {p.get('destination_type', 'N/A')}\n"
                f"Last run: {p.get('last_run_at', 'Never')}\n"
                f"Schedule: {p.get('schedule', 'N/A')}",
                title=f"Pipeline #{pipeline_id}",
            ))
        except Exception as e:
            handle_error(e)


@pipeline.command("logs")
@click.argument("pipeline_id", type=int)
@click.option("--limit", "-n", default=50, help="Number of log lines")
def pipeline_logs(pipeline_id: int, limit: int):
    """Show pipeline execution logs"""
    with api_client() as client:
        try:
            resp = client.get(f"/api/v1/pipelines/{pipeline_id}/logs", params={"limit": limit})
            resp.raise_for_status()
            logs = resp.json()
            for entry in (logs if isinstance(logs, list) else logs.get("logs", [])):
                ts = entry.get("timestamp", "")
                level = entry.get("level", "info")
                msg = entry.get("message", "")
                color = {"error": "red", "warning": "yellow", "info": "white", "debug": "dim"}.get(level, "white")
                console.print(f"[dim]{ts}[/] [{color}]{level.upper():8}[/] {msg}")
        except Exception as e:
            handle_error(e)


# ── Architecture Commands ──────────────────────────────────────────────────────

@main.group()
def architecture():
    """Manage architecture diagrams"""
    pass


@architecture.command("list")
def architecture_list():
    """List saved architectures"""
    with api_client() as client:
        try:
            resp = client.get("/api/v1/architecture/list")
            resp.raise_for_status()
            data = resp.json()
            archs = data if isinstance(data, list) else data.get("architectures", [])

            table = Table(title="Architectures", box=box.SIMPLE_HEAVY)
            table.add_column("ID")
            table.add_column("Name", style="bold")
            table.add_column("Nodes")
            table.add_column("Edges")
            table.add_column("Version")

            for a in archs:
                table.add_row(
                    str(a.get("id", "")),
                    a.get("name", "Unnamed"),
                    str(a.get("node_count", 0)),
                    str(a.get("edge_count", 0)),
                    a.get("version", "1.0"),
                )
            console.print(table)
        except Exception as e:
            handle_error(e)


@architecture.command("generate")
@click.argument("description")
@click.option("--cloud", default="aws", type=click.Choice(["aws", "azure", "gcp"]), help="Cloud provider")
def architecture_generate(description: str, cloud: str):
    """Generate architecture from natural language"""
    with api_client() as client:
        try:
            resp = client.post("/api/v1/architecture/generate", json={
                "description": description,
                "cloud_provider": cloud,
            })
            resp.raise_for_status()
            data = resp.json()
            nodes = data.get("nodes", [])
            edges = data.get("edges", [])

            console.print(Panel(
                f"[bold green]Architecture Generated[/]\n\n"
                f"Components: {len(nodes)}\n"
                f"Connections: {len(edges)}\n\n"
                + "\n".join(f"  • {n.get('label', n.get('id', '?'))}" for n in nodes),
                title=f"Generated for: {description[:60]}",
                border_style="green",
            ))
        except Exception as e:
            handle_error(e)


@architecture.command("export")
@click.argument("architecture_id")
@click.option("--format", "-f", "fmt", default="json", type=click.Choice(["json", "mermaid", "png"]), help="Export format")
def architecture_export(architecture_id: str, fmt: str):
    """Export architecture diagram"""
    with api_client() as client:
        try:
            resp = client.get(f"/api/v1/architecture/{architecture_id}/export", params={"format": fmt})
            resp.raise_for_status()

            if fmt == "json":
                data = resp.json()
                output = json.dumps(data, indent=2)
            elif fmt == "mermaid":
                output = resp.text
            else:
                console.print("[yellow]PNG export requires the web interface[/]")
                return

            console.print(Syntax(output, "json" if fmt == "json" else "markdown", theme="monokai"))
        except Exception as e:
            handle_error(e)


# ── SQL Commands ───────────────────────────────────────────────────────────────

@main.command("sql")
@click.argument("query")
@click.option("--connection", "-c", help="Database connection name")
def sql_command(query: str, connection: Optional[str]):
    """Execute SQL via AI agent"""
    with api_client() as client:
        try:
            resp = client.post("/api/v1/agents/sql/execute", json={
                "query": query,
                "connection": connection,
            })
            resp.raise_for_status()
            data = resp.json()

            console.print(Panel(
                Syntax(data.get("sql", query), "sql", theme="monokai"),
                title="Generated SQL",
                border_style="cyan",
            ))

            results = data.get("results", [])
            if results:
                table = Table(box=box.SIMPLE_HEAVY)
                if results:
                    for key in results[0].keys():
                        table.add_column(key)
                    for row in results[:50]:
                        table.add_row(*[str(v) for v in row.values()])
                console.print(table)
                console.print(f"[dim]{len(results)} rows returned[/]")
        except Exception as e:
            handle_error(e)


# ── Monitor Commands ───────────────────────────────────────────────────────────

@main.group()
def monitor():
    """Pipeline monitoring and alerts"""
    pass


@monitor.command("status")
def monitor_status():
    """Show monitoring overview"""
    with api_client() as client:
        try:
            resp = client.get("/api/v1/health/full")
            resp.raise_for_status()
            data = resp.json()
            console.print(Panel(
                json.dumps(data, indent=2),
                title="System Health",
                border_style="green",
            ))
        except Exception as e:
            handle_error(e)


@monitor.command("alerts")
@click.option("--limit", "-n", default=10, help="Number of alerts")
def monitor_alerts(limit: int):
    """Show recent alerts"""
    with api_client() as client:
        try:
            resp = client.get("/api/v1/alerts/history", params={"limit": limit})
            resp.raise_for_status()
            alerts = resp.json()

            if not alerts:
                console.print("[green]No recent alerts[/]")
                return

            table = Table(title="Recent Alerts", box=box.SIMPLE_HEAVY)
            table.add_column("Time")
            table.add_column("Severity")
            table.add_column("Title")
            table.add_column("Pipeline")
            table.add_column("Status")

            for a in alerts:
                sev = a.get("severity", "info")
                color = {"critical": "red", "error": "red", "warning": "yellow", "info": "blue"}.get(sev, "white")
                table.add_row(
                    a.get("sent_at", "")[:19],
                    f"[{color}]{sev}[/]",
                    a.get("title", ""),
                    a.get("pipeline", ""),
                    a.get("status", ""),
                )
            console.print(table)
        except Exception as e:
            handle_error(e)


# ── Agent Commands ─────────────────────────────────────────────────────────────

@main.group()
def agent():
    """Run AI agents from terminal"""
    pass


@agent.command("run")
@click.argument("agent_type", type=click.Choice([
    "pipeline", "sql", "debug", "monitor", "architecture", "extraction"
]))
@click.argument("prompt")
def agent_run(agent_type: str, prompt: str):
    """Run an AI agent with a prompt"""
    with api_client() as client:
        try:
            resp = client.post(f"/api/v1/agents/{agent_type}/execute", json={
                "prompt": prompt,
            })
            resp.raise_for_status()
            data = resp.json()

            console.print(Panel(
                json.dumps(data, indent=2),
                title=f"[bold]{agent_type.title()} Agent[/] Response",
                border_style="purple",
            ))
        except Exception as e:
            handle_error(e)


@agent.command("list")
def agent_list():
    """List available AI agents"""
    agents = [
        ("orchestrator", "Routes tasks to the correct agent", "✅"),
        ("pipeline", "NL → DAG + SQL + dbt", "✅"),
        ("sql", "NL → SQL query", "✅"),
        ("debug", "Error → root cause analysis", "✅"),
        ("monitor", "Metrics → anomaly detection", "✅"),
        ("extraction", "Source → schema extraction", "✅"),
        ("self-healing", "Failure → fix + approval", "✅"),
        ("architecture", "NL → architecture graph", "✅"),
        ("rag", "Query → context (Qdrant)", "✅"),
        ("multimodal", "Image/Audio → parsed", "⚠️ Colab proxy"),
        ("voice", "Audio → text + intent", "✅"),
    ]

    table = Table(title="AIDEN AI Agents", box=box.SIMPLE_HEAVY)
    table.add_column("Agent", style="bold")
    table.add_column("Purpose")
    table.add_column("Status")

    for name, purpose, status in agents:
        table.add_row(name, purpose, status)
    console.print(table)


# ── Connection Commands ────────────────────────────────────────────────────────

@main.group()
def connection():
    """Manage tool connections"""
    pass


@connection.command("list")
def connection_list():
    """List available tool connectors"""
    with api_client() as client:
        try:
            resp = client.get("/api/v1/tools/")
            resp.raise_for_status()
            tools = resp.json()

            table = Table(title="Tool Connectors", box=box.SIMPLE_HEAVY)
            table.add_column("Tool", style="bold")
            table.add_column("Concept")
            table.add_column("Capabilities")
            table.add_column("Status")

            for t in tools if isinstance(tools, list) else tools.get("tools", []):
                caps = t.get("capabilities", [])
                table.add_row(
                    t.get("name", "unknown"),
                    t.get("concept", "N/A"),
                    ", ".join(caps[:5]) + ("..." if len(caps) > 5 else ""),
                    "[green]available[/]",
                )
            console.print(table)
        except Exception as e:
            handle_error(e)


@connection.command("test")
@click.argument("tool_name")
def connection_test(tool_name: str):
    """Test connection to a tool"""
    with api_client() as client:
        try:
            resp = client.post(f"/api/v1/tools/{tool_name}/test")
            resp.raise_for_status()
            data = resp.json()
            status = data.get("status", "unknown")
            color = "green" if status == "connected" else "red"
            console.print(f"[{color}]✓ {tool_name}: {status}[/]")
        except Exception as e:
            handle_error(e)


# ── Incident Commands ──────────────────────────────────────────────────────────

@main.group()
def incident():
    """Manage incidents"""
    pass


@incident.command("list")
@click.option("--limit", "-n", default=10, help="Number of incidents")
def incident_list(limit: int):
    """List recent incidents"""
    console.print("[yellow]Incident tracking — coming in Phase 8[/]")


@incident.command("analyze")
@click.argument("incident_id")
def incident_analyze(incident_id: str):
    """Analyze an incident with AI"""
    console.print(f"[yellow]Analyzing incident #{incident_id} — coming in Phase 8[/]")


# ── System Commands ────────────────────────────────────────────────────────────

@main.group("system")
def system_group():
    """System health and diagnostics"""
    pass


@system_group.command("health")
def system_health():
    """Check system health"""
    with api_client() as client:
        try:
            resp = client.get("/api/v1/health/healthz")
            resp.raise_for_status()
            data = resp.json()
            status = data.get("status", "unknown")
            color = "green" if status == "healthy" else "red"
            console.print(f"[{color}]● AIDEN: {status}[/]")
            for k, v in data.items():
                if k != "status":
                    console.print(f"  {k}: {v}")
        except Exception as e:
            handle_error(e)


@system_group.command("version")
def system_version():
    """Show AIDEN version"""
    config = load_config()
    console.print(Panel(
        f"[bold]AIDEN CLI[/] v0.1.0\n"
        f"Server: {config.get('api_url', 'not configured')}\n"
        f"Project: {config.get('project', 'not configured')}",
        title="AIDEN Version",
        border_style="cyan",
    ))


@system_group.command("doctor")
def system_doctor():
    """Diagnose common issues"""
    config = load_config()
    issues = []

    if not config.get("token"):
        issues.append(("⚠️", "Not authenticated", "Run: aiden auth login"))
    if not config.get("api_url"):
        issues.append(("⚠️", "No API URL", "Run: aiden auth configure"))

    # Test connection
    if config.get("api_url"):
        try:
            with api_client() as client:
                resp = client.get("/health", timeout=5.0)
                resp.raise_for_status()
        except Exception:
            issues.append(("❌", "Server unreachable", f"Cannot connect to {config['api_url']}"))

    if not issues:
        console.print("[green]✓ All checks passed[/]")
    else:
        for icon, title, detail in issues:
            console.print(f"  {icon} {title}: {detail}")


if __name__ == "__main__":
    main()
