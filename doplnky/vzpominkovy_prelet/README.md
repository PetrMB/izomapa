# Vzpomínkový přelet (`vzpominkovy_prelet`)

Historický letoun občas přeletí nízko nad městem na počest místního letce, třeba rodáka, který za války létal u RAF.
Nad letounem je štítek se jménem a klik na něj otevře kartu s příběhem. Tlačítko ✈ v liště spustí přelet hned
a pohled pak jede za letounem. Sledování zrušíte křížkem nebo posunutím mapy. Přelet je ilustrační.

Zatím umí jeden letoun: **Vickers Wellington** (dvoumotorový bombardér, v noční kamufláži RAF). Na Wellingtonech létaly
například československé 311. bombardovací peruť a britské perutě Bomber Command.

Ukázka v `priklady/vzpominkovy_prelet.json` je Wellington 311. perutě na počest Vladimíra Slánského z Mladé Boleslavi.

## Zapnutí

Vytvořte `assets/doplnky/vzpominkovy_prelet.json` (doplněk se tím zapne sám) podle `priklady/vzpominkovy_prelet.json`:

```json
{
  "letoun": "wellington",
  "nazev": "Wellington 311. perutě RAF",
  "stitek": "Wellington · 311. peruť RAF",
  "tlacitko": "Vzpomínkový přelet Wellingtonu",
  "trasa": [[50.39985, 14.89770], [50.41250, 14.90500]],
  "vyska": 240,
  "rychlost_kmh": 235,
  "interval_min": [15, 25],
  "jen_ve_dne": true,
  "pribeh": {
    "titulek": "Wellington 311. perutě – jméno letce",
    "text": "Krátký příběh letce z ověřeného zdroje.",
    "zdroj": "https://…",
    "radky": [["Rodák", "Jméno (data narození a úmrtí)"], ["Peruť", "…"]]
  }
}
```

| Klíč | Význam |
| --- | --- |
| `trasa` | Body [lat, lon], nad kterými letoun přeletí po přímkách (2–20 bodů), třeba letiště a náměstí. Na obou koncích se trasa prodlouží o 3,5 km, takže letoun přilétá a odlétá mimo pohled. Směr se střídá. |
| `vyska` | Výška nad terénem [m], 60–600. Výchozí 240 m: v mapě je dobře vidět a je pod mraky. |
| `rychlost_kmh` | Rychlost (výchozí 235 km/h, cestovní rychlost Wellingtonu). |
| `interval_min` | Pauza mezi přelety v minutách [od, do]. |
| `jen_ve_dne` | `false` = létá i v noci. |
| `stitek` | Krátký text štítku nad letounem. |
| `tlacitko` | Popisek tlačítka ✈ v liště (title a aria-label). |
| `pribeh` | Karta po kliknutí: `titulek`, `text`, `zdroj` (odkaz http/https) a `radky` (dvojice popisek–hodnota, nejvýš 8). |

Příběh pište jen z ověřených zdrojů (Wikipedie s odkazem, Paměť národa, web obce, Vojenský historický ústav) a zdroj
uveďte v `zdroj`. Pokud nevíte, na jakém konkrétním stroji letec létal, napište, že jde o letoun perutě (ilustrační).

Pak `python overlay.py` (nebo `./postav.sh render`).

## Jak to funguje

- `overlay_hook.py` zkontroluje trasu, ořízne texty a předá je prohlížeči. Texty se zobrazují jako prostý text.
- `vzpominkovy_prelet.js` počítá let v `onFrame` (vrstva `sky`, nad budovami), kreslí stín, letoun a štítek a klik
  zachytí přes `onMapClick`. Sledování posouvá pohled přes `panTo`; když uživatel mapu posune sám, sledování skončí.
- Letoun se kreslí stejně jako vozidla a letadla mapy: kvádry stínované sluncem od jihovýchodu, obrys 1 px,
  48 směrů v cache.
