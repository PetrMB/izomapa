import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

PLUGIN_DIR = Path(__file__).resolve().parents[1]
ROOT = PLUGIN_DIR.parents[1]
sys.path.insert(0, str(PLUGIN_DIR))

import overlay_hook  # noqa: E402


class TestVzpominkovyPrelet(unittest.TestCase):
    def _run(self, data):
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / 'vzpominkovy_prelet.json'
            if data is not None:
                f.write_text(json.dumps(data), encoding='utf-8')
            return overlay_hook.build_overlay({'data_file': f})

    def test_priklad(self):
        data = json.loads((PLUGIN_DIR / 'priklady/vzpominkovy_prelet.json').read_text(encoding='utf-8'))
        out = self._run(data)
        self.assertEqual(out['letoun'], 'wellington')
        self.assertEqual(len(out['trasa']), 2)
        self.assertAlmostEqual(out['rychlost'], 235 / 3.6)
        self.assertEqual(out['interval'], [900, 1500])
        self.assertTrue(out['pribeh']['zdroj'].startswith('https://'))
        self.assertTrue(out['jen_ve_dne'])

    def test_bez_souboru_nebo_trasy(self):
        self.assertFalse(self._run(None))
        self.assertFalse(self._run({'trasa': [[50, 14]]}))
        self.assertFalse(self._run({'trasa': [[50, 14], [50.1, 14.1]], 'enabled': False}))

    def test_cisteni(self):
        out = self._run({'trasa': [[50, 14], ['x', 1], [50.1, 14.1], [999, 1]], 'letoun': 'concorde', 'vyska': 5,
                         'interval_min': [30, 10], 'pribeh': {'zdroj': 'javascript:alert(1)', 'text': 'a' * 5000}})
        self.assertEqual(out['trasa'], [[50.0, 14.0], [50.1, 14.1]])
        self.assertEqual(out['letoun'], 'wellington')
        self.assertEqual(out['vyska'], 60)
        self.assertEqual(out['interval'], [1800, 1800])
        self.assertEqual(out['pribeh']['zdroj'], '')
        self.assertEqual(len(out['pribeh']['text']), 1500)

    def test_skript_je_platny_js(self):
        node = shutil.which('node')
        if not node:
            self.skipTest('node chybí')
        r = subprocess.run([node, '--check', str(PLUGIN_DIR / 'vzpominkovy_prelet.js')], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_manifest(self):
        m = json.loads((PLUGIN_DIR / 'manifest.json').read_text(encoding='utf-8'))
        self.assertEqual(m['id'], 'vzpominkovy_prelet')
        for f in m['scripts'] + m['styles'] + [m['hook']]:
            self.assertTrue((PLUGIN_DIR / f).is_file(), f)


if __name__ == '__main__':
    unittest.main()
