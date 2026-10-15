import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

MODULE = Path(__file__).with_name("manager.py")
spec = importlib.util.spec_from_file_location("bond0_manager", MODULE)
manager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(manager)


class ManagerTests(unittest.TestCase):
    def test_defaults_loopback_only(self):
        self.assertEqual(manager.DEFAULT_HOST, "127.0.0.1")
        self.assertNotEqual(manager.DEFAULT_PORT, 5000)

    def test_health_has_no_credentials(self):
        status, payload = manager.api_payload("/api/v1/health")
        self.assertEqual(status, 200)
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["mode"], "read-only")
        self.assertNotIn("encryption_key", json.dumps(payload))

    def test_links_not_claimed_live(self):
        status, payload = manager.api_payload("/api/v1/links")
        self.assertEqual(status, 200)
        self.assertFalse(payload["available"])
        self.assertEqual(payload["links"], [])

    def test_unknown_route(self):
        status, payload = manager.api_payload("/admin/shutdown")
        self.assertEqual(status, 404)

    def test_counters_parse(self):
        sample = (
            "Inter-| Receive | Transmit\n"
            " face |bytes packets errs drop fifo frame compressed multicast"
            " |bytes packets errs drop fifo colls carrier compressed\n"
            "bonding0: 123 4 0 0 0 0 0 0 456 7 0 0 0 0 0 0\n"
        )
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "netdev"
            path.write_text(sample, encoding="utf-8")
            counts = manager.tun_counters(filename=str(path))
        self.assertEqual(counts, {
            "rx_bytes": 123, "rx_packets": 4, "tx_bytes": 456, "tx_packets": 7
        })

    @patch.object(manager, "service_active", return_value=True)
    @patch.object(manager, "tun_counters", return_value=None)
    def test_server_readonly(self, _stats, _svc):
        status, payload = manager.api_payload("/api/v1/server")
        self.assertEqual(status, 200)
        self.assertTrue(payload["bonding_server_active"])
        self.assertEqual(payload["management_mode"], "loopback-read-only")


if __name__ == "__main__":
    unittest.main()
