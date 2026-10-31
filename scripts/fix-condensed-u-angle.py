"""Align the two off-grid pixels in Condensed Bold Italic u's right stem.

Requires fonttools. Translate whole pixel contours without shearing them.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
root = Path(__file__).resolve().parents[1]
path = root / 'app/assets/fonts/AB_Terminal-Condensed_Bold_italic.ttf'
font = TTFont(path)
name = font.getBestCmap()[ord('u')]
glyph = font['glyf'][name]
coords, ends, _ = glyph.getCoordinates(font['glyf'])
start = 0
changed = 0
for end in ends:
    points = coords[start:end + 1]
    center_x = (min(x for x, y in points) + max(x for x, y in points)) / 2
    center_y = (min(y for x, y in points) + max(y for x, y in points)) / 2
    desired = {352: 259.5, 454: 282.5}.get(round(center_y))
    if desired is not None and center_x > 200:
        offset = round(desired - center_x)
        if offset:
            for i in range(start, end + 1):
                x, y = glyph.coordinates[i]
                glyph.coordinates[i] = (x + offset, y)
            changed += 1
    start = end + 1
glyph.removeHinting()
glyph.recalcBounds(font['glyf'])
if 'DSIG' in font:
    del font['DSIG']
font.save(path)
print(f'Condensed Bold Italic u: {changed} pixel contours aligned')
