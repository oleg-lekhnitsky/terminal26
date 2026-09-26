"""Build an open-tailed @ on the family's native rounded-pixel grid."""
from copy import deepcopy
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import GlyphCoordinates
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen


root = Path(__file__).resolve().parents[1] / 'app/assets/fonts'
for style in ('Regular', 'Italic', 'Bold', 'Bold-Italic'):
    path = root / f'AB_Terminal-{style}.ttf'
    font = TTFont(path)
    pitch, bearing = (102, 45) if style.startswith('Bold') else (105, 60)
    source = font['glyf'][font.getBestCmap()[ord("'")]]
    coords, ends, flags = source.getCoordinates(font['glyf'])
    pixel = deepcopy(source)
    pixel.coordinates = GlyphCoordinates(coords[:ends[0] + 1])
    pixel.flags = flags[:ends[0] + 1]
    pixel.endPtsOfContours = [ends[0]]
    pixel.numberOfContours = 1
    pixel.removeHinting()
    pixel.recalcBounds(font['glyf'])

    for char, name in [('@', 'at')]:
        # Bottom to top: open outer tail and a distinct enclosed inner bowl.
        rows = [[1, 2, 3, 4, 5], [0], [0, 2, 3, 4, 5, 6],
                [0, 2, 4, 6], [0, 2, 3, 4, 6], [0, 6], [1, 2, 3, 4, 5]]
        positions = []
        for row, columns in enumerate(rows):
            for column in columns:
                x = column + (row * .5 if 'Italic' in style else 0)
                positions.append((round(x * pitch), (row - 1) * pitch))
        left = min(x for x, _ in positions)
        pen = TTGlyphPen(None)
        for x, y in positions:
            pixel.draw(TransformPen(pen, (1, 0, 0, 1, x - left + bearing - pixel.xMin, y - pixel.yMin)), font['glyf'])
        glyph = pen.glyph()
        glyph.recalcBounds(font['glyf'])
        if name not in font.getGlyphOrder():
            font.setGlyphOrder(font.getGlyphOrder() + [name])
        font['glyf'][name] = glyph
        font['hmtx'][name] = (glyph.xMax + bearing, bearing)
        for table in font['cmap'].tables:
            if table.isUnicode():
                table.cmap[ord(char)] = name
    if 'DSIG' in font:
        del font['DSIG']
    font.save(path)
    print(f'{style}: rebuilt @')
