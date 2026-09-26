"""Shared symbol layouts. X positions are half-cells; rows run bottom to top."""
from copy import deepcopy
from fontTools.ttLib.tables._g_l_y_f import GlyphCoordinates
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen

SYMBOL_ROWS = {
    'ampersand': [[2, 4, 10], [0, 6, 8], [0, 4, 10], [2], [0, 4], [0, 6], [2, 4]],
    # Two-by-two checks; each filled check is a two-by-two pixel block.
    'taxi': [[], [4, 6], [4, 6], [0, 2], [0, 2]],
    'key': [[2, 4, 6], [0, 2, 4, 6, 8], [0, 2, 6, 8], [2, 4, 6], [4], [4, 6], [4], [4, 6], [4]],
    'cup': [[2, 4, 6, 8], [0, 10, 12], [0, 10, 14], [0, 10, 14], [0, 10, 12], [0, 2, 4, 6, 8, 10], [2, 6], [4, 8], [2, 6]],
    # Rim at ascender height (row 6); only the straw extends above it.
    'cocktail': [[1, 3, 5, 7, 9, 11], [6], [6], [4, 8], [2, 10], [0, 12], [0, 2, 4, 6, 8, 10, 12], [10], [12]],
    'bird': [[5], [5], [2, 4, 6, 8], [2, 4, 6, 8, 10, 12], [2, 4, 6, 8, 10, 12, 14], [2, 4, 6, 8], [2, 4, 6], [0, 2, 6], [2, 4, 6]],
}


def rebuild_symbol(font, style, name):
    bold = style.startswith('Bold')
    pitch, bearing = (102, 51) if bold else (105, 53)
    if name == 'taxi':
        bearing = 0
    # All symbols share the baseline in every weight, including the bird's feet.
    baseline = 0
    # Use a native quote pixel, not the larger dot used by the period.
    source = font['glyf'][font.getBestCmap()[ord("'")]]
    coords, ends, flags = source.getCoordinates(font['glyf'])
    pixel = deepcopy(source)
    pixel.coordinates = GlyphCoordinates(coords[:ends[0] + 1])
    pixel.flags = flags[:ends[0] + 1]
    pixel.endPtsOfContours = [ends[0]]
    pixel.numberOfContours = 1
    pixel.removeHinting()
    pixel.recalcBounds(font['glyf'])
    pen = TTGlyphPen(None)
    for row, columns in enumerate(SYMBOL_ROWS[name]):
        for column in columns:
            slant = row * .5 if name == 'ampersand' and 'Italic' in style else 0
            x = bearing + round((column / 2 + slant) * pitch)
            y = baseline + row * pitch
            pixel.draw(TransformPen(pen, (1, 0, 0, 1, x - pixel.xMin, y - pixel.yMin)), font['glyf'])
    glyph = pen.glyph()
    glyph.recalcBounds(font['glyf'])
    font['glyf'][name] = glyph
    # Taxi repeats as a seamless four-cell tile, without inter-symbol bearings.
    font['hmtx'][name] = (4 * pitch if name == 'taxi' else glyph.xMax + bearing, bearing)
