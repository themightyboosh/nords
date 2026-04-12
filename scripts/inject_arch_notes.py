import os
import re

out_dir = "docs/stories"

def modify_file(filename, replacements):
    path = os.path.join(out_dir, filename)
    if not os.path.exists(path):
        return
    with open(path, "r") as f:
        content = f.read()

    for target, injection in replacements.items():
        if target in content and injection not in content:
            content = content.replace(target, target + "\n" + injection + "\n")
            
    with open(path, "w") as f:
        f.write(content)

# 01
modify_file("01_sprint_zero.md", {
    "* **Ref:** `10_technology_and_infrastructure.md` §2.1": "> [!WARNING] **GCP Architect Note:** Ensure networking provisions a Serverless VPC Access Connector for the Cloud Run environment. Cloud Run must use Private IPs to communicate securely with Cloud SQL and Memorystore without traversing the public internet."
})

# 03 (Auth)
modify_file("02_auth_and_identity.md", {
    "### [STORY] 1.2.1: Firebase SDK Initialization\n* **Target:** `src/lib/firebase.ts`": "> [!TIP] **GCP Architect Note:** For backend validation on Cloud Run, ensure you use the Firebase Admin SDK to cryptographically verify JWTs locally. Do not make network calls back to Google's Identity servers for token verification, as the latency will accumulate and violate the 50ms WebSocket latency budget."
})

# 03 (Database)
modify_file("03_data_model_and_database.md", {
    "Query `WHERE properties->>'Status' = 'To Do'` returns rows.": "> [!TIP] **DBA Note:** Implement `GIN` indexes specifically using `jsonb_path_ops` on the `properties` column. Since the MCP AI agent will perform dynamic multi-key filtering across these arbitrary schemas, standard B-Trees will fail to optimize these queries.",
    "Max 20 connections. Idle timeout 30s.": "> [!WARNING] **DBA Note:** Because Cloud Run scales containers horizontally from 0 to N instantly, raw Postgres connections can be exhausted across the cluster. You **must** utilize the Cloud SQL Auth Proxy with built-in pooling or configure PgBouncer on the database side. Drop the idle timeout much lower (e.g., 5-10s) because Cloud Run suspends background CPU, which can leave dead connections hanging."
})

# 10 (CRDT)
modify_file("10_multiplayer_crdt.md", {
    "Unauthenticated connection rejects. Two authenticated clients share Yjs state.": "> [!WARNING] **GCP Architect Note:** Cloud Run has a default timeout that will sever WebSockets. You must configure the Cloud Run service timeout to the maximum (3600 seconds), enable Session Affinity, and implement a rigid Ping/Pong keep-alive protocol (every ~15s) to prevent the Google external load balancers from indiscriminately dropping idle WebSocket connections.",
    "Relay.": "Relay.\n> [!CAUTION] **GCP Architect Note:** Cloud Memorystore (Redis) operates purely on internal VPC IP space. It absolutely requires a Serverless VPC Access Connector from Cloud Run. Additionally, code defensively for Cloud Run container suspensions: when a container spins down, its Redis connection will drop. Implement resilient auto-reconnect logic.",
    "restored from Postgres.": "restored from Postgres.\n> [!TIP] **DBA Note:** Cloud Run containers can receive a `SIGTERM` at any time to scale down. Implement a strict graceful shutdown handler that interrupts the 30s batch window and forces an immediate flush of the Yjs binary blob to Cloud SQL before the container dies, preventing data loss."
})

# 11 (Snapshots)
modify_file("11_snapshots_and_history.md", {
    "No UPDATE allowed (enforce via application layer initially, DB trigger later).": "> [!CAUTION] **DBA Note:** A snapshot of 5000 nords will result in a multi-megabyte JSON payload. This will trigger PostgreSQL's TOAST (The Oversized-Attribute Storage Technique). While Postgres handles this fine, ensure your Node.js application streams the serialization buffer. A default Cloud Run instance (512MB RAM) can easily OOM (Out of Memory) if you try to `JSON.stringify()` massive arrays entirely in heap memory before executing the `INSERT`."
})

print("Injections complete.")
