"""Fill the missing percent glyphs from the existing family designs.

Requires fonttools. Regular and Bold Italic remain unchanged.
"""
from copy import deepcopy
from pathlib import Path

from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1] / 'app/assets/fonts'
for target, source in [('Bold', 'Bold-Italic'), ('Italic', 'Regular')]:
    path = root / f'AB_Terminal-{target}.ttf'
    font = TTFont(path)
    if 37 in font.getBestCmap():
        print(f'{target}: % already present')
        continue
    reference = TTFont(root / f'AB_Terminal-{source}.ttf')
    name = reference.getBestCmap()[37]
    glyph = deepcopy(reference['glyf'][name])
    advance, bearing = reference['hmtx'][name]
    if target == 'Italic':
        # This family slants by shifting whole pixels, not shearing their shapes.
        start = 0
        for end in glyph.endPtsOfContours:
            points = glyph.coordinates[start:end + 1]
            center_y = (min(y for x, y in points) + max(y for x, y in points)) / 2
            offset = round(center_y * .5)
            for index in range(start, end + 1):
                x, y = glyph.coordinates[index]
                glyph.coordinates[index] = (x + offset, y)
            start = end + 1
        bearing = font['hmtx']['o'][1]
        left = min(x for x, y in glyph.coordinates)
        glyph.coordinates.translate((bearing - left, 0))
        # Keep the source's right side bearing after repositioning the pixels.
        advance = max(x for x, y in glyph.coordinates) + reference['hmtx'][name][0] - reference['glyf'][name].xMax
    glyph.removeHinting()
    glyph.recalcBounds(font['glyf'])
    font.setGlyphOrder(font.getGlyphOrder() + ['percent'])
    font['glyf']['percent'] = glyph
    font['hmtx']['percent'] = (advance, bearing)
    for table in font['cmap'].tables:
        if table.isUnicode() and table.format in (4, 12):
            table.cmap[37] = 'percent'
    if 'DSIG' in font:
        del font['DSIG']
    font.save(path)
    print(f'{target}: added % from {source}')
