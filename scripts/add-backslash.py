"""Add the missing Bold backslash by mirroring its slash. Requires fonttools."""
from pathlib import Path
from fontTools.pens.reverseContourPen import ReverseContourPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

path = Path(__file__).resolve().parents[1] / 'app/assets/fonts/AB_Terminal-Bold.ttf'
font = TTFont(path)
if 92 in font.getBestCmap():
    print('Bold: backslash already present')
else:
    name = font.getBestCmap()[47]
    advance, _ = font['hmtx'][name]
    pen = TTGlyphPen(font.getGlyphSet())
    # Reverse contour direction after reflection to retain TrueType winding.
    font['glyf'][name].draw(TransformPen(ReverseContourPen(pen), (-1, 0, 0, 1, advance, 0)), font['glyf'])
    glyph = pen.glyph()
    glyph.recalcBounds(font['glyf'])
    font.setGlyphOrder(font.getGlyphOrder() + ['backslash'])
    font['glyf']['backslash'] = glyph
    font['hmtx']['backslash'] = (advance, glyph.xMin)
    for table in font['cmap'].tables:
        if table.isUnicode() and table.format in (4, 12):
            table.cmap[92] = 'backslash'
    if 'DSIG' in font:
        del font['DSIG']
    font.save(path)
    print('Bold: added backslash')
