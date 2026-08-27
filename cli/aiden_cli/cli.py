"""
AIDEN CLI — Interactive Terminal Interface for the Autonomous Intelligence Data Engineering Nexus.

Features:
    - Interactive REPL mode with persistent session
    - Natural language orchestration via terminal
    - VS Code file integration
    - Dashboard launch
    - Pipeline, architecture, SQL, monitoring, and agent commands
    - Connector health monitoring

Usage:
    aiden                          # Start interactive REPL
    aiden ask "why is my pipeline slow?"
    aiden repl                     # Explicit REPL mode
    aiden dashboard                # Open web dashboard
    aiden pipeline list            # List pipelines
    aiden sql "SELECT * FROM users"
    aiden architecture generate "e-commerce data platform"
    aiden monitor status
    aiden agent run sql "show top customers"
"""

import json
import os
import sys
import subprocess
import webbrowser
from pathlib import Path
from typing import Optional

import click
import httpx
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.syntax import Syntax
from rich.markdown import Markdown
from rich.prompt import Prompt
from rich.live import Live
from rich import box

console = Console()

# ── Configuration ──────────────────────────────────────────────────────────────

CONFIG_DIR = Path.home() / ".aiden"
CONFIG_FILE = CONFIG_DIR / "config.json"
HISTORY_FILE = CONFIG_DIR / "history.json"
SESSION_DIR = CONFIG_DIR / "sessions"

DEFAULT_CONFIG = {
    "api_url": "http://localhost:8000",
    "token": "",
    "project": "default",
    "dashboard_port": 5173,
    "vscode_path": "code",
    "theme": "dark",
}


def load_config() -> dict:
    """Load AIDEN configuration with defaults."""
    config = DEFAULT_CONFIG.copy()
    if CONFIG_FILE.exists():
        try:
            stored = json.loads(CONFIG_FILE.read_text())
            config.update(stored)
        except Exception:
            pass
    return config


def save_config(config: dict):
    """Save AIDEN configuration."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(json.dumps(config, indent=2))


def load_history() -> list:
    """Load REPL command history."""
    if HISTORY_FILE.exists():
        try:
            return json.loads(HISTORY_FILE.read_text())
        except Exception:
            pass
    return []


def save_history(history: list):
    """Save REPL command history (last 500 entries)."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    HISTORY_FILE.write_text(json.dumps(history[-500:]))


def api_client() -> httpx.Client:
    """Create an authenticated API client."""
    config = load_config()
    headers = {}
    if config.get("token"):
        headers["Authorization"] = f"Bearer {config['token']}"
    return httpx.Client(
        base_url=config["api_url"],
        headers=headers,
        timeout=60.0,
    )


def api_client_async() -> httpx.AsyncClient:
    """Create an async authenticated API client."""
    import httpx as httpx_async
    config = load_config()
    headers = {}
    if config.get("token"):
        headers["Authorization"] = f"Bearer {config['token']}"
    return httpx_async.AsyncClient(
        base_url=config["api_url"],
        headers=headers,
        timeout=60.0,
    )


def handle_error(e: Exception):
    """Handle API errors with friendly messages."""
    if isinstance(e, httpx.ConnectError):
        console.print("[red]Error:[/] Cannot connect to AIDEN server. Is it running?")
        console.print("  Start server: [cyan]cd backend && python -m uvicorn app.main:app[/]")
        console.print("  Check health:  [cyan]aiden system health[/]")
    elif isinstance(e, httpx.HTTPStatusError):
        status = e.response.status_code
        if status == 401:
            console.print("[red]Error:[/] Not authenticated. Run: [cyan]aiden auth login[/]")
        elif status == 404:
            console.print("[red]Error:[/] Resource not found")
        elif status == 422:
            console.print(f"[red]Validation error:[/] {e.response.text[:300]}")
        else:
            console.print(f"[red]Error:[/] HTTP {status} — {e.response.text[:200]}")
    else:
        console.print(f"[red]Error:[/] {e}")


# ── REPL Core ──────────────────────────────────────────────────────────────────

REPL_COMMANDS = {
    "ask": "Ask AIDEN anything in natural language",
    "pipeline": "Manage data pipelines (list, create, run, status, logs)",
    "architecture": "Generate and manage architecture diagrams",
    "sql": "Execute SQL queries via AI",
    "monitor": "View pipeline monitoring and alerts",
    "agent": "Run AI agents from terminal",
    "connection": "Manage tool connections",
    "incident": "Manage incidents",
    "connector": "Tool Gateway — list, test, health of connectors",
    "exec": "Execute a direct orchestrator command",
    "file": "VS Code file integration (open, read, write, edit)",
    "dashboard": "Open the AIDEN web dashboard",
    "history": "Show command history",
    "clear": "Clear the terminal",
    "help": "Show available commands",
    "exit": "Exit the REPL",
    "quit": "Exit the REPL",
}

REPL_ALIASES = {
    "h": "help",
    "q": "exit",
    "cls": "clear",
    "ls": "pipeline list",
    "status": "monitor status",
    "dash": "dashboard",
    "vs": "file open",
}


def repl_parse(input_line: str) -> tuple:
    """Parse REPL input into (command, args)."""
    parts = input_line.strip().split(None, 1)
    if not parts:
        return ("", "")
    cmd = parts[0].lower()
    args = parts[1] if len(parts) > 1 else ""
    return (cmd, args)


def repl_execute(cmd: str, args: str):
    """Execute a REPL command."""
    config = load_config()

    if cmd in ("exit", "quit", ""):
        return False

    elif cmd == "help":
        table = Table(title="AIDEN REPL Commands", box=box.SIMPLE_HEAVY, show_header=True)
        table.add_column("Command", style="cyan bold", min_width=12)
        table.add_column("Description")
        for name, desc in REPL_COMMANDS.items():
            table.add_row(name, desc)
        console.print(table)

    elif cmd == "clear":
        os.system("cls" if os.name == "nt" else "clear")

    elif cmd == "history":
        history = load_history()
        if not history:
            console.print("[dim]No command history[/]")
        else:
            for i, entry in enumerate(history[-20:], 1):
                console.print(f"  [dim]{i:3}[/] {entry}")

    elif cmd == "dashboard":
        port = config.get("dashboard_port", 5173)
        url = f"http://localhost:{port}"
        console.print(f"[cyan]Opening AIDEN Dashboard:[/] {url}")
        try:
            webbrowser.open(url)
            console.print("[green]✓[/] Dashboard opened in browser")
        except Exception:
            console.print(f"[yellow]Could not open browser automatically.[/]")
            console.print(f"  Open manually: {url}")

    elif cmd == "ask":
        if not args:
            console.print("[yellow]Usage:[/] ask <your question>")
            console.print("  Example: ask why is the customer_etl pipeline slow?")
            return True
        _execute_orchestrator(args, config)

    elif cmd == "exec":
        if not args:
            console.print("[yellow]Usage:[/] exec <objective>")
            console.print("  Example: exec Show me all failed pipelines and their logs")
            return True
        _execute_orchestrator(args, config)

    elif cmd == "pipeline":
        _handle_pipeline(args, config)

    elif cmd == "architecture":
        _handle_architecture(args, config)

    elif cmd == "sql":
        if not args:
            console.print("[yellow]Usage:[/] sql <query or description>")
            console.print('  Example: sql "SELECT count(*) FROM customers"')
            console.print("  Example: sql show me all active users")
            return True
        _handle_sql(args, config)

    elif cmd == "monitor":
        _handle_monitor(args, config)

    elif cmd == "agent":
        _handle_agent(args, config)

    elif cmd == "connection":
        _handle_connection(args, config)

    elif cmd == "connector":
        _handle_connector(args, config)

    elif cmd == "incident":
        _handle_incident(args, config)

    elif cmd == "file":
        _handle_file(args, config)

    else:
        # Check aliases
        aliased = REPL_ALIASES.get(cmd)
        if aliased:
            parts = aliased.split(None, 1)
            full_args = (parts[1] + " " + args).strip() if len(parts) > 1 else args
            return repl_execute(parts[0], full_args)

        # Try as direct orchestrator ask
        full_input = f"{cmd} {args}".strip()
        console.print(f"[dim]Unknown command. Trying as orchestrator request...[/]")
        _execute_orchestrator(full_input, config)

    return True


def _execute_orchestrator(objective: str, config: dict):
    """Execute a request through the AIDEN orchestrator."""
    with console.status("[cyan]AIDEN is thinking...", spinner="dots"):
        try:
            with api_client() as client:
                resp = client.post("/api/v1/execution/execute", json={
                    "objective": objective,
                    "project_id": config.get("project", "default"),
                })
                resp.raise_for_status()
                data = resp.json()

            intent = data.get("intent", {})
            output = data.get("output", {})
            confidence = data.get("confidence", 0)
            agents_used = data.get("agents_used", [])
            tools_used = data.get("tools_used", [])
            time_ms = data.get("execution_time_ms", 0)

            # Build response
            lines = []
            lines.append(f"**Intent:** {intent.get('intent', 'unknown')} (confidence: {confidence:.0%})")
            lines.append(f"**Agents:** {', '.join(agents_used)}")
            if tools_used:
                lines.append(f"**Tools:** {', '.join(tools_used)}")
            lines.append(f"**Time:** {time_ms:.0f}ms")
            lines.append("")

            # Extract agent results
            results = output.get("results", {})
            for step_id, result in results.items():
                agent_name = result.get("agent", "unknown")
                agent_output = result.get("output", {})
                status = result.get("status", "unknown")
                color = "green" if status == "success" else "red"

                lines.append(f"### {agent_name.title()} Agent [{color}]{status}[/]")
                if "response" in agent_output:
                    lines.append(agent_output["response"])
                elif "error" in agent_output:
                    lines.append(f"Error: {agent_output['error']}")
                else:
                    lines.append(json.dumps(agent_output, indent=2)[:2000])
                lines.append("")

            md = "\n".join(lines)
            console.print(Panel(
                Markdown(md),
                title="[bold cyan]AIDEN Response[/]",
                border_style="cyan",
                padding=(1, 2),
            ))

        except Exception as e:
            handle_error(e)


def _handle_pipeline(args: str, config: dict):
    """Handle pipeline subcommands."""
    parts = args.split(None, 1)
    subcmd = parts[0] if parts else "list"
    rest = parts[1] if len(parts) > 1 else ""

    try:
        with api_client() as client:
            if subcmd == "list":
                resp = client.get("/api/v1/pipelines", params={"limit": 20})
                resp.raise_for_status()
                data = resp.json()
                pipelines = data if isinstance(data, list) else data.get("pipelines", [])

                table = Table(title="Pipelines", box=box.SIMPLE_HEAVY)
                table.add_column("ID", style="dim")
                table.add_column("Name", style="bold")
                table.add_column("Source → Dest")
                table.add_column("Status")
                table.add_column("Schedule")
                colors = {"success": "green", "running": "blue", "failed": "red", "draft": "dim", "pending": "yellow"}

                for p in pipelines:
                    s = p.get("status", "unknown")
                    table.add_row(
                        str(p.get("id", "")),
                        p.get("name", "Unnamed"),
                        f"{p.get('source_type', '?')} → {p.get('destination_type', '?')}",
                        f"[{colors.get(s, 'white')}]{s}[/]",
                        p.get("schedule") or "—",
                    )
                console.print(table)

            elif subcmd == "create":
                prompt = rest or "Create a data pipeline"
                resp = client.post("/api/v1/pipelines/from-prompt", json={"prompt": prompt})
                resp.raise_for_status()
                data = resp.json()
                console.print(Panel(
                    f"[bold]{data.get('name', 'Pipeline')}[/]\n"
                    f"Source: {data.get('source_type', 'N/A')} → {data.get('destination_type', 'N/A')}\n"
                    f"Schedule: {data.get('schedule', 'N/A')}",
                    title="[green]Pipeline Created[/]",
                    border_style="green",
                ))

            elif subcmd == "run":
                pid = int(rest) if rest else 0
                resp = client.post(f"/api/v1/pipelines/{pid}/run")
                resp.raise_for_status()
                console.print(f"[green]✓[/] Pipeline #{pid} started")

            elif subcmd == "status":
                pid = int(rest) if rest else 0
                resp = client.get(f"/api/v1/pipelines/{pid}")
                resp.raise_for_status()
                p = resp.json()
                console.print(Panel(
                    f"[bold]{p.get('name', '')}[/]\nStatus: {p.get('status', '')}\n"
                    f"Source: {p.get('source_type', '')} → {p.get('destination_type', '')}",
                    title=f"Pipeline #{pid}",
                ))

            else:
                console.print(f"[yellow]Unknown pipeline subcommand:[/] {subcmd}")

    except Exception as e:
        handle_error(e)


def _handle_architecture(args: str, config: dict):
    """Handle architecture subcommands."""
    parts = args.split(None, 1)
    subcmd = parts[0] if parts else "list"
    rest = parts[1] if len(parts) > 1 else ""

    try:
        with api_client() as client:
            if subcmd == "list":
                resp = client.get("/api/v1/architecture/list")
                resp.raise_for_status()
                data = resp.json()
                archs = data if isinstance(data, list) else data.get("architectures", [])

                table = Table(title="Architectures", box=box.SIMPLE_HEAVY)
                table.add_column("ID")
                table.add_column("Name", style="bold")
                table.add_column("Nodes")
                table.add_column("Edges")
                for a in archs:
                    table.add_row(str(a.get("id", "")), a.get("name", ""), str(a.get("node_count", 0)), str(a.get("edge_count", 0)))
                console.print(table)

            elif subcmd == "generate":
                desc = rest or "data engineering platform"
                resp = client.post("/api/v1/architecture/generate", json={"description": desc, "cloud_provider": "aws"})
                resp.raise_for_status()
                data = resp.json()
                nodes = data.get("nodes", [])
                edges = data.get("edges", [])
                console.print(Panel(
                    f"[bold green]Generated[/]\nComponents: {len(nodes)}\nConnections: {len(edges)}\n\n"
                    + "\n".join(f"  • {n.get('label', n.get('id', '?'))}" for n in nodes[:20]),
                    title=f"Architecture: {desc[:60]}",
                    border_style="green",
                ))

            elif subcmd == "export":
                aid = rest.split()[0] if rest else ""
                fmt = rest.split()[1] if len(rest.split()) > 1 else "json"
                resp = client.get(f"/api/v1/architecture/{aid}/export", params={"format": fmt})
                resp.raise_for_status()
                console.print(Syntax(resp.text, "json" if fmt == "json" else "markdown", theme="monokai"))

            else:
                console.print(f"[yellow]Unknown architecture subcommand:[/] {subcmd}")

    except Exception as e:
        handle_error(e)


def _handle_sql(args: str, config: dict):
    """Handle SQL command."""
    try:
        with api_client() as client:
            resp = client.post("/api/v1/execution/execute", json={
                "objective": f"Execute SQL: {args}",
                "project_id": config.get("project", "default"),
            })
            resp.raise_for_status()
            data = resp.json()
            output = data.get("output", {})

            results = output.get("results", {})
            for step_id, result in results.items():
                agent_output = result.get("output", {})
                if "response" in agent_output:
                    console.print(Panel(Markdown(agent_output["response"]), title="SQL Agent", border_style="cyan"))
                else:
                    console.print(json.dumps(agent_output, indent=2)[:3000])

    except Exception as e:
        handle_error(e)


def _handle_monitor(args: str, config: dict):
    """Handle monitor subcommands."""
    subcmd = args.strip() or "status"

    try:
        with api_client() as client:
            if subcmd == "status":
                resp = client.get("/api/v1/execution/status")
                resp.raise_for_status()
                data = resp.json()
                console.print(Panel(
                    f"Agents: {data.get('agents_registered', 0)}\n"
                    f"Connectors: {data.get('connectors_registered', 0)}\n"
                    f"Total Runs: {data.get('total_runs', 0)}\n"
                    f"Active Agents: {', '.join(data.get('agents', []))}",
                    title="[bold]AIDEN Orchestrator Status[/]",
                    border_style="green",
                ))
            elif subcmd == "alerts":
                resp = client.get("/api/v1/alerts/history", params={"limit": 10})
                resp.raise_for_status()
                alerts = resp.json()
                if not alerts:
                    console.print("[green]No recent alerts[/]")
                else:
                    table = Table(title="Recent Alerts", box=box.SIMPLE_HEAVY)
                    table.add_column("Time")
                    table.add_column("Severity")
                    table.add_column("Title")
                    for a in alerts:
                        sev = a.get("severity", "info")
                        color = {"critical": "red", "error": "red", "warning": "yellow"}.get(sev, "blue")
                        table.add_row(a.get("sent_at", "")[:19], f"[{color}]{sev}[/]", a.get("title", ""))
                    console.print(table)
            else:
                console.print(f"[yellow]Unknown monitor subcommand:[/] {subcmd}")

    except Exception as e:
        handle_error(e)


def _handle_agent(args: str, config: dict):
    """Handle agent subcommands."""
    parts = args.split(None, 2)
    subcmd = parts[0] if parts else "list"

    try:
        with api_client() as client:
            if subcmd == "list":
                resp = client.get("/api/v1/execution/agents")
                resp.raise_for_status()
                data = resp.json()
                agents = data.get("agents", [])

                table = Table(title="AIDEN AI Agents", box=box.SIMPLE_HEAVY)
                table.add_column("Agent", style="bold")
                table.add_column("Type")
                table.add_column("Description")
                table.add_column("Permissions")
                for a in agents:
                    table.add_row(
                        a.get("name", ""),
                        a.get("type", ""),
                        a.get("description", "")[:50],
                        ", ".join(a.get("permissions", [])[:3]),
                    )
                console.print(table)

            elif subcmd == "run":
                agent_name = parts[1] if len(parts) > 1 else "sql"
                prompt = parts[2] if len(parts) > 2 else ""
                if not prompt:
                    console.print("[yellow]Usage:[/] agent run <name> <prompt>")
                    return
                resp = client.post(f"/api/v1/execution/agents/{agent_name}/execute", json={
                    "objective": prompt,
                    "context": {"project_id": config.get("project", "default")},
                })
                resp.raise_for_status()
                data = resp.json()
                output = data.get("output", {})
                console.print(Panel(
                    json.dumps(output, indent=2)[:3000],
                    title=f"[bold]{agent_name.title()} Agent[/]",
                    border_style="purple",
                ))

            else:
                console.print(f"[yellow]Unknown agent subcommand:[/] {subcmd}")

    except Exception as e:
        handle_error(e)


def _handle_connection(args: str, config: dict):
    """Handle connection subcommands."""
    subcmd = args.strip() or "list"

    try:
        with api_client() as client:
            if subcmd == "list":
                resp = client.get("/api/v1/execution/connectors")
                resp.raise_for_status()
                data = resp.json()
                connectors = data.get("connectors", [])

                table = Table(title="Tool Connectors", box=box.SIMPLE_HEAVY)
                table.add_column("Tool", style="bold")
                table.add_column("Category")
                table.add_column("Status")
                table.add_column("Capabilities")
                for c in connectors:
                    status = c.get("status", "unknown")
                    color = "green" if status == "connected" else "red" if status == "error" else "yellow"
                    caps = c.get("capabilities", [])
                    table.add_row(
                        c.get("display_name", c.get("name", "")),
                        c.get("category", ""),
                        f"[{color}]{status}[/]",
                        ", ".join(caps[:4]) + ("..." if len(caps) > 4 else ""),
                    )
                console.print(table)

            elif subcmd == "health":
                resp = client.get("/api/v1/execution/connectors/health")
                resp.raise_for_status()
                data = resp.json()
                for name, health in data.items():
                    status = health.get("status", "unknown")
                    color = "green" if status == "healthy" else "red" if status == "error" else "yellow"
                    latency = health.get("latency_ms", 0)
                    console.print(f"  [{color}]● {name}[/]: {status} ({latency:.0f}ms)")

            elif subcmd == "test":
                parts = args.split()
                tool_name = parts[1] if len(parts) > 1 else ""
                if not tool_name:
                    console.print("[yellow]Usage:[/] connection test <tool_name>")
                    return
                resp = client.post(f"/api/v1/execution/connectors/{tool_name}/execute", json={
                    "action": "test",
                    "params": {},
                })
                resp.raise_for_status()
                data = resp.json()
                result = data.get("result", {})
                success = result.get("success", False)
                color = "green" if success else "red"
                console.print(f"[{color}]{'✓' if success else '✗'} {tool_name}: {'connected' if success else result.get('error', 'failed')}[/]")

            else:
                console.print(f"[yellow]Unknown connection subcommand:[/] {subcmd}")

    except Exception as e:
        handle_error(e)


def _handle_connector(args: str, config: dict):
    """Alias for connection."""
    _handle_connection(args, config)


def _handle_incident(args: str, config: dict):
    """Handle incident subcommands."""
    parts = args.split(None, 1)
    subcmd = parts[0] if parts else "list"

    if subcmd == "list":
        console.print("[yellow]Incident tracking — run 'agent run debug investigate recent failures'[/]")
    elif subcmd == "analyze":
        iid = parts[1] if len(parts) > 1 else ""
        console.print(f"[yellow]Analyzing incident {iid} via debug agent...[/]")
    else:
        console.print(f"[yellow]Unknown incident subcommand:[/] {subcmd}")


def _handle_file(args: str, config: dict):
    """Handle VS Code file integration."""
    parts = args.split(None, 1)
    subcmd = parts[0] if parts else "help"
    rest = parts[1].strip() if len(parts) > 1 else ""

    vscode = config.get("vscode_path", "code")

    if subcmd == "open":
        if not rest:
            console.print("[yellow]Usage:[/] file open <path>")
            return
        path = Path(rest).resolve()
        if not path.exists():
            console.print(f"[red]File not found:[/] {path}")
            return
        try:
            subprocess.run([vscode, str(path)], check=False, capture_output=True)
            console.print(f"[green]✓[/] Opened in VS Code: {path}")
        except FileNotFoundError:
            console.print(f"[yellow]VS Code not found at '{vscode}'.[/] Install VS Code or set vs_code_path in config.")
            # Fallback: just show the path
            console.print(f"  File: {path}")

    elif subcmd == "read":
        if not rest:
            console.print("[yellow]Usage:[/] file read <path>")
            return
        path = Path(rest).resolve()
        if not path.exists():
            console.print(f"[red]File not found:[/] {path}")
            return
        content = path.read_text(encoding="utf-8", errors="replace")
        # Detect language for syntax highlighting
        ext = path.suffix.lstrip(".")
        lang_map = {"py": "python", "ts": "typescript", "tsx": "tsx", "js": "javascript", "json": "json", "yaml": "yaml", "yml": "yaml", "sql": "sql", "md": "markdown", "toml": "toml"}
        lang = lang_map.get(ext, ext or "text")
        console.print(Syntax(content, lang, theme="monokai", line_numbers=True))

    elif subcmd == "write":
        if not rest:
            console.print("[yellow]Usage:[/] file write <path>  (then type content, end with <<<EOF)")
            return
        # Split path from content marker
        path_part = rest.split("<<<EOF")[0].strip() if "<<<EOF" in rest else rest.split()[0] if rest.split() else ""
        content = rest.split("<<<EOF", 1)[1].strip() if "<<<EOF" in rest else ""
        if not content:
            console.print("[yellow]Enter content (end with <<<EOF):[/]")
            lines = []
            while True:
                try:
                    line = input()
                    if line.strip() == "<<<EOF":
                        break
                    lines.append(line)
                except EOFError:
                    break
            content = "\n".join(lines)

        path = Path(path_part).resolve()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        console.print(f"[green]✓[/] Written {len(content)} bytes to {path}")

    elif subcmd == "edit":
        if not rest:
            console.print("[yellow]Usage:[/] file edit <path>  (opens in VS Code for editing)")
            return
        _handle_file(f"open {rest}", config)

    elif subcmd == "tree":
        dir_path = Path(rest or ".").resolve()
        if not dir_path.is_dir():
            console.print(f"[red]Not a directory:[/] {dir_path}")
            return
        _print_tree(dir_path, prefix="", max_depth=3)

    elif subcmd == "help":
        console.print(Panel(
            "[bold]VS Code File Integration[/]\n\n"
            "  file open <path>     Open file in VS Code\n"
            "  file read <path>     Read and display file with syntax highlighting\n"
            "  file write <path>    Write content to file\n"
            "  file edit <path>     Open file in VS Code for editing\n"
            "  file tree [dir]      Show directory tree\n",
            title="File Commands",
            border_style="cyan",
        ))

    else:
        console.print(f"[yellow]Unknown file subcommand:[/] {subcmd}")


def _print_tree(path: Path, prefix: str = "", max_depth: int = 3, current_depth: int = 0):
    """Print a directory tree."""
    if current_depth >= max_depth:
        return
    try:
        entries = sorted(path.iterdir(), key=lambda e: (not e.is_dir(), e.name))
        for i, entry in enumerate(entries):
            if entry.name.startswith(".") or entry.name == "__pycache__" or entry.name == "node_modules":
                continue
            is_last = i == len(entries) - 1
            connector = "└── " if is_last else "├── "
            name = entry.name + "/" if entry.is_dir() else entry.name
            style = "bold blue" if entry.is_dir() else ""
            console.print(f"{prefix}{connector}[{style}]{name}[/]")
            if entry.is_dir():
                extension = "    " if is_last else "│   "
                _print_tree(entry, prefix + extension, max_depth, current_depth + 1)
    except PermissionError:
        pass


# ── Click CLI ──────────────────────────────────────────────────────────────────

@click.group(invoke_without_command=True)
@click.option("--version", "-v", is_flag=True, help="Show version")
@click.pass_context
def main(ctx, version):
    """AIDEN — Autonomous Intelligence Data Engineering Nexus CLI

    Start without arguments to enter interactive REPL mode.
    """
    if version:
        console.print("AIDEN CLI v0.1.0")
        return

    if ctx.invoked_subcommand is None:
        # No subcommand — start REPL
        repl()


# ── REPL Entry Point ───────────────────────────────────────────────────────────

def repl():
    """Start the interactive AIDEN REPL."""
    config = load_config()
    history = load_history()

    console.print(Panel(
        "[bold cyan]AIDEN[/] — Autonomous Intelligence Data Engineering Nexus\n\n"
        f"  Server: [dim]{config.get('api_url', 'not configured')}[/]\n"
        f"  Project: [dim]{config.get('project', 'default')}[/]\n\n"
        "  Type [bold]help[/] for commands, [bold]ask <question>[/] to talk to AIDEN,\n"
        "  or just type your request in natural language.\n"
        "  Type [bold]exit[/] to quit.",
        title="[bold]AIDEN REPL[/]",
        border_style="cyan",
        padding=(1, 2),
    ))

    # Check server connectivity
    try:
        with api_client() as client:
            resp = client.get("/health", timeout=3.0)
            resp.raise_for_status()
            console.print("[green]● Connected to AIDEN server[/]\n")
    except Exception:
        console.print("[yellow]● AIDEN server not reachable[/] — commands will fail until the server is started.\n")

    running = True
    while running:
        try:
            # Build prompt
            project = config.get("project", "default")
            user_input = Prompt.ask(f"[bold cyan]aiden[/] [dim]{project}[/]")
            user_input = user_input.strip()

            if not user_input:
                continue

            # Add to history
            history.append(user_input)
            save_history(history)

            # Parse and execute
            cmd, args = repl_parse(user_input)
            running = repl_execute(cmd, args)

            # Refresh config in case it changed
            config = load_config()

        except KeyboardInterrupt:
            console.print("\n[dim]Use 'exit' to quit[/]")
        except EOFError:
            running = False

    console.print("[cyan]Goodbye.[/]")


# ── Direct CLI Commands (non-REPL) ────────────────────────────────────────────

@main.command("ask")
@click.argument("question")
def ask_command(question: str):
    """Ask AIDEN a natural language question."""
    config = load_config()
    _execute_orchestrator(question, config)


@main.command("repl")
def repl_command():
    """Start the interactive AIDEN REPL."""
    repl()


@main.command("dashboard")
@click.option("--port", "-p", type=int, help="Dashboard port")
def dashboard_command(port: Optional[int]):
    """Open the AIDEN web dashboard in your browser."""
    config = load_config()
    p = port or config.get("dashboard_port", 5173)
    url = f"http://localhost:{p}"
    console.print(f"[cyan]Opening AIDEN Dashboard:[/] {url}")
    try:
        webbrowser.open(url)
        console.print("[green]✓[/] Dashboard opened in browser")
    except Exception:
        console.print(f"[yellow]Could not open browser.[/] Open manually: {url}")


@main.command("exec")
@click.argument("objective")
def exec_command(objective: str):
    """Execute a request through the AIDEN orchestrator."""
    config = load_config()
    _execute_orchestrator(objective, config)


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
    try:
        with api_client() as client:
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
@click.option("--url", prompt="API URL", default="http://localhost:8000")
@click.option("--project", prompt="Project name", default="default")
def auth_configure(url: str, project: str):
    """Configure AIDEN connection"""
    config = load_config()
    config["api_url"] = url.rstrip("/")
    config["project"] = project
    save_config(config)
    console.print(f"[green]✓[/] Configured: {url} (project: {project})")


@auth.command("whoami")
def auth_whoami():
    """Show current auth status"""
    config = load_config()
    if config.get("token"):
        console.print(f"[green]✓[/] Authenticated")
        console.print(f"  Server: {config['api_url']}")
        console.print(f"  Project: {config['project']}")
    else:
        console.print("[yellow]Not authenticated[/]. Run: [cyan]aiden auth login[/]")


# ── Pipeline Commands (direct CLI) ────────────────────────────────────────────

@main.group()
def pipeline():
    """Manage data pipelines"""
    pass


@pipeline.command("list")
@click.option("--status", "-s", help="Filter by status")
@click.option("--limit", "-n", default=20)
def pipeline_list(status: Optional[str], limit: int):
    """List all pipelines"""
    config = load_config()
    _handle_pipeline(f"list", config)


@pipeline.command("create")
@click.argument("prompt")
def pipeline_create(prompt: str):
    """Create a pipeline from natural language"""
    config = load_config()
    _handle_pipeline(f"create {prompt}", config)


@pipeline.command("run")
@click.argument("pipeline_id", type=int)
def pipeline_run(pipeline_id: int):
    """Run a pipeline"""
    config = load_config()
    _handle_pipeline(f"run {pipeline_id}", config)


@pipeline.command("status")
@click.argument("pipeline_id", type=int)
def pipeline_status(pipeline_id: int):
    """Show pipeline status"""
    config = load_config()
    _handle_pipeline(f"status {pipeline_id}", config)


# ── Architecture Commands (direct CLI) ────────────────────────────────────────

@main.group()
def architecture():
    """Manage architecture diagrams"""
    pass


@architecture.command("list")
def architecture_list():
    """List architectures"""
    config = load_config()
    _handle_architecture("list", config)


@architecture.command("generate")
@click.argument("description")
def architecture_generate(description: str):
    """Generate architecture from natural language"""
    config = load_config()
    _handle_architecture(f"generate {description}", config)


@architecture.command("export")
@click.argument("architecture_id")
@click.option("--format", "-f", "fmt", default="json")
def architecture_export(architecture_id: str, fmt: str):
    """Export architecture"""
    config = load_config()
    _handle_architecture(f"export {architecture_id} {fmt}", config)


# ── SQL Command (direct CLI) ──────────────────────────────────────────────────

@main.command("sql")
@click.argument("query")
def sql_command(query: str):
    """Execute SQL via AI agent"""
    config = load_config()
    _handle_sql(query, config)


# ── Monitor Commands (direct CLI) ─────────────────────────────────────────────

@main.group()
def monitor():
    """Pipeline monitoring and alerts"""
    pass


@monitor.command("status")
def monitor_status():
    """Show monitoring overview"""
    config = load_config()
    _handle_monitor("status", config)


@monitor.command("alerts")
def monitor_alerts():
    """Show recent alerts"""
    config = load_config()
    _handle_monitor("alerts", config)


# ── Agent Commands (direct CLI) ───────────────────────────────────────────────

@main.group()
def agent():
    """Run AI agents from terminal"""
    pass


@agent.command("list")
def agent_list():
    """List available agents"""
    config = load_config()
    _handle_agent("list", config)


@agent.command("run")
@click.argument("agent_name")
@click.argument("prompt")
def agent_run(agent_name: str, prompt: str):
    """Run an agent with a prompt"""
    config = load_config()
    _handle_agent(f"run {agent_name} {prompt}", config)


# ── Connection Commands (direct CLI) ──────────────────────────────────────────

@main.group()
def connection():
    """Manage tool connections"""
    pass


@connection.command("list")
def connection_list():
    """List connectors"""
    config = load_config()
    _handle_connection("list", config)


@connection.command("health")
def connection_health():
    """Check connector health"""
    config = load_config()
    _handle_connection("health", config)


@connection.command("test")
@click.argument("tool_name")
def connection_test(tool_name: str):
    """Test a connector"""
    config = load_config()
    _handle_connection(f"test {tool_name}", config)


# ── System Commands (direct CLI) ──────────────────────────────────────────────

@main.group("system")
def system_group():
    """System health and diagnostics"""
    pass


@system_group.command("health")
def system_health():
    """Check system health"""
    config = load_config()
    _handle_monitor("status", config)


@system_group.command("version")
def system_version():
    """Show version"""
    config = load_config()
    console.print(Panel(
        f"[bold]AIDEN CLI[/] v0.1.0\n"
        f"Server: {config.get('api_url', 'not configured')}\n"
        f"Project: {config.get('project', 'not configured')}",
        title="AIDEN Version", border_style="cyan",
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
