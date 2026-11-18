"""Vzpomínkový přelet (doplněk): z assets/doplnky/vzpominkovy_prelet.json předá prohlížeči trasu přeletu, letoun a příběh.

Texty (nazev, stitek, pribeh) zobrazuje prohlížeč jako prostý text, odkaz `zdroj` jen s http(s)."""
from __future__ import annotations

import json
from typing import Any

LETOUNY = ('wellington',)


def _bod(p: Any) -> list[float] | None:
    if isinstance(p, (list, tuple)) and len(p) >= 2:
        try:
            la, lo = float(p[0]), float(p[1])
        except (TypeError, ValueError):
            return None
        if -90 <= la <= 90 and -180 <= lo <= 180:
            return [round(la, 7), round(lo, 7)]
    return None


def _txt(v: Any, n: int) -> str:
    return str(v or '').strip()[:n]


def _cislo(v: Any, vychozi: float, lo: float, hi: float) -> float:
    try:
        return max(lo, min(hi, float(v)))
    except (TypeError, ValueError):
        return vychozi


def build_overlay(ctx: dict[str, Any]) -> dict[str, Any] | bool:
    f = ctx['data_file']
    if not f.is_file():
        return False
    raw = json.loads(f.read_text(encoding='utf-8'))
    if raw.get('enabled', True) is False:
        return False
    trasa = [b for b in (_bod(p) for p in raw.get('trasa') or []) if b]
    if len(trasa) < 2:
        print('Doplněk vzpominkovy_prelet: "trasa" potřebuje aspoň dva body [lat, lon] – přeskakuje se.')
        return False
    letoun = raw.get('letoun') if raw.get('letoun') in LETOUNY else 'wellington'
    nazev = _txt(raw.get('nazev'), 80) or 'Vzpomínkový přelet'
    iv = raw.get('interval_min') if isinstance(raw.get('interval_min'), list) else [15, 25]
    i0 = _cislo(iv[0] if iv else 15, 15, 2, 240)
    i1 = _cislo(iv[1] if len(iv) > 1 else i0, i0, i0, 240)
    pr = raw.get('pribeh') if isinstance(raw.get('pribeh'), dict) else {}
    zdroj = _txt(pr.get('zdroj'), 400)
    radky = [[_txt(r[0], 40), _txt(r[1], 120)] for r in pr.get('radky') or [] if isinstance(r, (list, tuple)) and len(r) >= 2][:8]
    return {
        'letoun': letoun,
        'nazev': nazev,
        'stitek': _txt(raw.get('stitek'), 60) or nazev[:60],
        'tlacitko': _txt(raw.get('tlacitko'), 60) or f'Spustit přelet: {nazev}'[:60],
        'trasa': trasa[:20],
        'vyska': _cislo(raw.get('vyska'), 240, 60, 600),
        'rychlost': _cislo(raw.get('rychlost_kmh'), 235, 80, 600) / 3.6,
        'interval': [i0 * 60, i1 * 60],
        'jen_ve_dne': raw.get('jen_ve_dne', True) is not False,
        'pribeh': {
            'titulek': _txt(pr.get('titulek'), 80) or nazev,
            'text': _txt(pr.get('text'), 1500),
            'zdroj': zdroj if zdroj.startswith(('https://', 'http://')) else '',
            'radky': radky,
        },
    }
