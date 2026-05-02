"""zk — additive metadata/config layer that sits beside the existing za-*.sh pipeline.

Nothing here mutates or replaces the legacy scripts. It reads the same
directory layouts (`YYYYMMDD/`, `YYYYMMDD-N/`, `YYYYMMDD_N/`) and, when asked
to queue clip jobs, writes the same `tmp/*.tmp` payload that za-harau.sh →
za-horu.sh already consume.
"""
