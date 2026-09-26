"""Build paired angle quotes on the family's native rounded-pixel grid."""
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

    for char, name, mirrored in [('«', 'guillemotleft', False), ('»', 'guillemotright', True)]:
        positions = []
        for row, column in enumerate((2, 1, 0, 1, 2)):
            for offset in (0, 3):
                x = column + offset
                if mirrored:
                    x = 5 - x
                if 'Italic' in style:
                    x += row * .5
                positions.append((round(x * pitch), row * pitch))
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
    print(f'{style}: added « and »')
