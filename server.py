# ==========================================================================
# CORTEX-FORENSICS // Python HTTP Server with SQLite Persistence
# ==========================================================================

import os
import json
import sqlite3
from http.server import SimpleHTTPRequestHandler, HTTPServer
import urllib.parse

DB_FILE = "cortex_forensics.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # 1. Incidents Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        title TEXT,
        severity TEXT,
        status TEXT,
        start_time TEXT,
        duration TEXT,
        owner TEXT,
        affected_services_count INTEGER,
        ai_narrative TEXT
    )
    """)

    # 2. Services Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        name TEXT,
        type TEXT,
        status TEXT,
        health INTEGER,
        cpu TEXT,
        latency TEXT,
        owner TEXT
    )
    """)

    # 3. Remediation Tasks Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS remediation_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incident_id TEXT,
        task_title TEXT,
        status TEXT,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 4. Audit Log Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Seed Initial Data if empty
    cursor.execute("SELECT COUNT(*) FROM incidents")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
        INSERT INTO incidents VALUES (
            'INC-2048', 
            'Payment processing degradation & Checkout timeout cascade', 
            'CRITICAL', 
            'INVESTIGATING', 
            '2026-09-24 14:32:08 UTC', 
            '18m 42s', 
            'DevOps / On-Call SRE (Alex Chen)', 
            7, 
            'At 14:31:42 UTC, payment-db experienced a sharp connection saturation event reaching 96% capacity.'
        )
        """)
        cursor.execute("""
        INSERT INTO incidents VALUES (
            'INC-3091', 
            'Redis Cluster Memory Eviction Failure & Auth Token Degradation', 
            'HIGH', 
            'INVESTIGATING', 
            '2026-09-24 10:15:30 UTC', 
            '42m 10s', 
            'Security / Platform Team (Maya Patel)', 
            5, 
            'At 10:14:55 UTC, user-session-cache reached 100% memory allocation.'
        )
        """)

        # Seed services
        services_data = [
            ('payment-db', 'Payment Database', 'PostgreSQL 15.4', 'CRITICAL', 12, '94%', '5,200ms', 'Data Platform'),
            ('checkout-api', 'Checkout Service', 'Go Microservice', 'CRITICAL', 24, '88%', '5,450ms', 'Checkout Squad'),
            ('payment-service', 'Payment Service', 'Java Spring Boot', 'CRITICAL', 30, '91%', '5,200ms', 'Payment Squad'),
            ('payment-worker', 'Payment Worker', 'Python Celery', 'DEGRADED', 58, '76%', '210ms', 'Payment Squad'),
            ('api-gateway', 'API Gateway', 'Kong / Envoy', 'DEGRADED', 62, '64%', '1,820ms', 'Edge Infra')
        ]
        cursor.executemany("INSERT INTO services VALUES (?,?,?,?,?,?,?,?)", services_data)

        cursor.execute("INSERT INTO audit_logs (action, details) VALUES ('SYSTEM_INIT', 'SQLite database initialized with seed telemetry')")

    conn.commit()
    conn.close()

class ForensicRequestHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(this.path) if hasattr(this, 'path') else urllib.parse.urlparse(self.path)
        
        if parsed.path == "/api/db-status":
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute("SELECT id, status FROM incidents")
            incidents = dict(cursor.fetchall())
            cursor.execute("SELECT COUNT(*) FROM audit_logs")
            log_count = cursor.fetchone()[0]
            cursor.execute("SELECT action, details, timestamp FROM audit_logs ORDER BY id DESC LIMIT 5")
            recent_logs = cursor.fetchall()
            conn.close()

            res = {
                "db": "SQLite3 (cortex_forensics.db)",
                "incidents": incidents,
                "audit_logs_count": log_count,
                "recent_logs": recent_logs
            }
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        super().do_GET()

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))

        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()

        if self.path == "/api/ack":
            incident_id = data.get("incidentId", "INC-2048")
            cursor.execute("UPDATE incidents SET status = 'ACKNOWLEDGED' WHERE id = ?", (incident_id,))
            cursor.execute("INSERT INTO audit_logs (action, details) VALUES (?, ?)", 
                           ("INCIDENT_ACKNOWLEDGED", f"Incident {incident_id} acknowledged by SRE."))
            conn.commit()
            res = {"success": True, "incidentId": incident_id, "status": "ACKNOWLEDGED", "dbUpdated": True}

        elif self.path == "/api/remediate":
            incident_id = data.get("incidentId", "INC-2048")
            task_title = data.get("taskTitle", "Scale DB pool capacity")
            cursor.execute("INSERT INTO remediation_tasks (incident_id, task_title, status) VALUES (?, ?, 'COMPLETED')", 
                           (incident_id, task_title))
            cursor.execute("UPDATE services SET status = 'DEGRADED', health = 75 WHERE id = 'payment-db'")
            cursor.execute("INSERT INTO audit_logs (action, details) VALUES (?, ?)", 
                           ("REMEDIATION_EXECUTED", f"Task '{task_title}' dispatched for {incident_id}."))
            conn.commit()
            res = {"success": True, "incidentId": incident_id, "task": task_title, "dbUpdated": True}

        elif self.path == "/api/resolve":
            incident_id = data.get("incidentId", "INC-2048")
            notes = data.get("notes", "Root cause confirmed and patched.")
            cursor.execute("UPDATE incidents SET status = 'RESOLVED' WHERE id = ?", (incident_id,))
            cursor.execute("INSERT INTO audit_logs (action, details) VALUES (?, ?)", 
                           ("INCIDENT_RESOLVED", f"Incident {incident_id} RESOLVED. Post-mortem archived."))
            conn.commit()
            res = {"success": True, "incidentId": incident_id, "status": "RESOLVED", "dbUpdated": True}

        else:
            res = {"error": "Invalid API Endpoint"}

        conn.close()
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(res).encode("utf-8"))

def run():
    init_db()
    print("==========================================================")
    print("CORTEX-FORENSICS SQLite Database Server Running on Port 8080")
    print("Database File: cortex_forensics.db")
    print("==========================================================")
    server_address = ('', 8080)
    httpd = HTTPServer(server_address, ForensicRequestHandler)
    httpd.serve_forever()

if __name__ == '__main__':
    run()
