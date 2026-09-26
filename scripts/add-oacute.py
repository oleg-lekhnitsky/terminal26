"""Add ó to each style using its o outline and two of its existing pixels.

Requires fonttools. Existing ó glyphs are left untouched.
"""
from copy import deepcopy
from pathlib import Path

from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphCoordinates

root = Path(__file__).resolve().parents[1]
for path in sorted((root / 'app/assets/fonts').glob('*.ttf')):
    font = TTFont(path)
    cmap = font.getBestCmap()
    if 0xF3 in cmap:
        print(f'{path.name}: ó already present')
        continue
    base_name = cmap[ord('o')]
    base = font['glyf'][base_name]
    coords, ends, flags = base.getCoordinates(font['glyf'])
    contours = []
    start = 0
    for end in ends:
        contours.append((coords[start:end + 1], flags[start:end + 1]))
        start = end + 1
    top = [part for part in contours if max(y for x, y in part[0]) == base.yMax]
    points, pixel_flags = top[len(top) // 2]
    x_min = min(x for x, y in points)
    y_min = min(y for x, y in points)
    size = max(y for x, y in points) - y_min
    pixel = Glyph()
    pixel.numberOfContours = 1
    pixel.coordinates = GlyphCoordinates(points)
    pixel.endPtsOfContours = [len(points) - 1]
    pixel.flags = deepcopy(pixel_flags)
    # Match the body pixel spacing and the rightward placement in italic faces.
    step = 102 if 'Bold' in path.name else 105
    center = (min(x for part, _ in top for x, y in part)
              + max(x for part, _ in top for x, y in part)) / 2
    if 'Italic' in path.name:
        center += 55
    gap = 40 if 'Bold' in path.name else 50
    left = round(center - (step + size) / 2)
    bottom = base.yMax + gap
    pen = TTGlyphPen(font.getGlyphSet())
    base.draw(pen, font['glyf'])
    for offset in (0, step):
        pixel.draw(TransformPen(pen, (1, 0, 0, 1,
                                     left + offset - x_min,
                                     bottom + offset - y_min)), font['glyf'])
    glyph = pen.glyph()
    glyph.recalcBounds(font['glyf'])
    font.setGlyphOrder(font.getGlyphOrder() + ['oacute'])
    font['glyf']['oacute'] = glyph
    font['hmtx']['oacute'] = (font['hmtx'][base_name][0], glyph.xMin)
    for table in font['cmap'].tables:
        if table.isUnicode() and table.format in (4, 12):
            table.cmap[0xF3] = 'oacute'
    # Modified font data cannot retain a previous digital signature.
    if 'DSIG' in font:
        del font['DSIG']
    font.save(path)
    print(f'{path.name}: added ó')
