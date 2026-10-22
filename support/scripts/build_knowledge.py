"""Build the isolated HiTeam KB using the pinned shared Support runtime."""
from pathlib import Path
import argparse
import json
import sys

ROOT = Path(__file__).resolve().parents[2]

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runtime-source", type=Path, required=True, help="Pinned support_chat/src directory")
    parser.add_argument("--static-only", action="store_true")
    parser.add_argument("--output", type=Path, default=ROOT / "support/data/hiteam/knowledge-graph")
    args = parser.parse_args()
    sys.path.insert(0, str(args.runtime_source.resolve()))
    from support_chat.knowledge_graph.builder import build_graph, build_static_graph, write_graph
    builder = build_static_graph if args.static_only else build_graph
    runtime_revision = json.loads((ROOT / "support/runtime.lock.json").read_text())["revision"]
    graph = builder(project_id="hiteam", product_root=ROOT,
        source_roots=["apps/web-admin/components/admin-shell.tsx", "apps/web-admin/app/tasks/page.tsx",
                      "apps/web-admin/app/attendance/page.tsx", "apps/web-admin/app/employees/page.tsx"],
        generator_revision=runtime_revision)
    if args.static_only:
        args.output.mkdir(parents=True, exist_ok=True)
        (args.output / "static-graph.json").write_text(json.dumps(graph, ensure_ascii=False), encoding="utf-8")
    else:
        write_graph(graph, args.output)
    print(f"HiTeam knowledge: {len(graph['nodes'])} nodes; runtime_ready={not args.static_only}")
