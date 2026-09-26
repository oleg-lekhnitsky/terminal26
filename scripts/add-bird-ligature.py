"""Preserve symbol artwork, add word ligatures, and repair straight quotes."""
from copy import deepcopy
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import GlyphCoordinates
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from font_symbol_grid import rebuild_symbol

root = Path(__file__).resolve().parents[1] / 'app/assets/fonts'
bold = TTFont(root / 'AB_Terminal-Bold.ttf')
bird_source = 'bird' if 'bird' in bold.getGlyphOrder() else 'quotedbl'
bold_bird = deepcopy(bold['glyf'][bird_source])
bold_bird_metrics = bold['hmtx'][bird_source]
regular = TTFont(root / 'AB_Terminal-Regular.ttf')

for style in ['Regular', 'Italic', 'Bold', 'Bold-Italic']:
    path = root / f'AB_Terminal-{style}.ttf'
    font = TTFont(path)
    # Preserve the original chair artwork before restoring the ASCII ampersand.
    if 'chair' not in font.getGlyphOrder():
        font.setGlyphOrder(font.getGlyphOrder() + ['chair'])
        font['glyf']['chair'] = deepcopy(font['glyf']['ampersand'])
        font['hmtx']['chair'] = font['hmtx']['ampersand']
    for table in font['cmap'].tables:
        if table.isUnicode():
            assert table.cmap.get(0xE005, 'chair') == 'chair'
            table.cmap[0xE005] = 'chair'
    rebuild_symbol(font, style, 'ampersand')
    if 'bird' not in font.getGlyphOrder():
        font.setGlyphOrder(font.getGlyphOrder() + ['bird'])
        if style == 'Bold-Italic':
            font['glyf']['bird'] = deepcopy(bold_bird)
            font['hmtx']['bird'] = bold_bird_metrics
        else:
            font['glyf']['bird'] = deepcopy(font['glyf']['quotedbl'])
            font['hmtx']['bird'] = font['hmtx']['quotedbl']
    for table in font['cmap'].tables:
        if table.isUnicode():
            assert table.cmap.get(0xE000, 'bird') == 'bird'
            table.cmap[0xE000] = 'bird'

    if 'key' not in font.getGlyphOrder():
        source = font if font.getBestCmap().get(ord('|')) else regular
        key_source = source.getBestCmap()[ord('|')]
        font.setGlyphOrder(font.getGlyphOrder() + ['key'])
        font['glyf']['key'] = deepcopy(source['glyf'][key_source])
        font['hmtx']['key'] = source['hmtx'][key_source]
    for table in font['cmap'].tables:
        if table.isUnicode():
            assert table.cmap.get(0xE001, 'key') == 'key'
            table.cmap[0xE001] = 'key'

    if 'cup' not in font.getGlyphOrder():
        cup_source = font.getBestCmap()[ord('}')]
        font.setGlyphOrder(font.getGlyphOrder() + ['cup'])
        font['glyf']['cup'] = deepcopy(font['glyf'][cup_source])
        font['hmtx']['cup'] = font['hmtx'][cup_source]
    for table in font['cmap'].tables:
        if table.isUnicode():
            assert table.cmap.get(0xE002, 'cup') == 'cup'
            table.cmap[0xE002] = 'cup'

    if 'cocktail' not in font.getGlyphOrder():
        cocktail_source = font.getBestCmap()[ord('{')]
        font.setGlyphOrder(font.getGlyphOrder() + ['cocktail'])
        font['glyf']['cocktail'] = deepcopy(font['glyf'][cocktail_source])
        font['hmtx']['cocktail'] = font['hmtx'][cocktail_source]
    for table in font['cmap'].tables:
        if table.isUnicode():
            assert table.cmap.get(0xE003, 'cocktail') == 'cocktail'
            table.cmap[0xE003] = 'cocktail'

    if 'taxi' not in font.getGlyphOrder():
        font.setGlyphOrder(font.getGlyphOrder() + ['taxi'])
    for table in font['cmap'].tables:
        if table.isUnicode():
            assert table.cmap.get(0xE004, 'taxi') == 'taxi'
            table.cmap[0xE004] = 'taxi'

    # Shared layouts keep all symbols on the same pixel cadence.
    for name in ('bird', 'key', 'cup', 'cocktail', 'taxi'):
        rebuild_symbol(font, style, name)

    if style != 'Bold-Italic':
        # A double quote is two copies of the family's existing single quote.
        single_name = font.getBestCmap()[ord("'")]
        single = font['glyf'][single_name]
        advance, bearing = font['hmtx'][single_name]
        pen = TTGlyphPen(None)
        for shift in (0, 174):
            single.draw(TransformPen(pen, (1, 0, 0, 1, shift, 0)), font['glyf'])
        quote = pen.glyph()
        quote.recalcBounds(font['glyf'])
        font['glyf']['quotedbl'] = quote
        font['hmtx']['quotedbl'] = (advance + 174, bearing)

    # Real braces use the same rounded pixels as the single quote. Mirror the
    # upright structure first, then apply the italic row stagger to both sides.
    single = font['glyf'][font.getBestCmap()[ord("'")]]
    coords, ends, flags = single.getCoordinates(font['glyf'])
    pixel = deepcopy(single)
    pixel.coordinates = GlyphCoordinates(coords[:ends[0] + 1])
    pixel.flags = flags[:ends[0] + 1]
    pixel.endPtsOfContours = [ends[0]]
    pixel.numberOfContours = 1
    pixel.removeHinting()
    pixel.recalcBounds(font['glyf'])
    pitch = 102 if style.startswith('Bold') else 105
    bearing = 45 if style.startswith('Bold') else 60
    italic = 'Italic' in style
    # The key now has its own glyph, leaving ASCII | for a real pixel bar.
    if 'bar' not in font.getGlyphOrder():
        font.setGlyphOrder(font.getGlyphOrder() + ['bar'])
    pen = TTGlyphPen(None)
    for row in range(7):
        x = bearing + round(.5 * row * pitch if italic else 0)
        pixel.draw(TransformPen(pen, (1, 0, 0, 1, x - pixel.xMin, row * pitch - pixel.yMin)), font['glyf'])
    bar = pen.glyph()
    bar.recalcBounds(font['glyf'])
    font['glyf']['bar'] = bar
    font['hmtx']['bar'] = (bar.xMax + bearing, bearing)
    for table in font['cmap'].tables:
        if table.isUnicode():
            table.cmap[ord('|')] = 'bar'

    columns = [2, 1, 1, 0, 1, 1, 2]
    for name, mirrored in [('braceleft', False), ('braceright', True)]:
        positions = [(round(((2 - column if mirrored else column) + (.5 * row if italic else 0)) * pitch), row * pitch)
                     for row, column in enumerate(columns)]
        left = min(x for x, y in positions)
        pen = TTGlyphPen(None)
        for x, y in positions:
            pixel.draw(TransformPen(pen, (1, 0, 0, 1, x - left + bearing - pixel.xMin, y - pixel.yMin)), font['glyf'])
        brace = pen.glyph()
        brace.recalcBounds(font['glyf'])
        font['glyf'][name] = brace
        font['hmtx'][name] = (brace.xMax + bearing, bearing)

    assert 'GSUB' not in font or {r.FeatureTag for r in font['GSUB'].table.FeatureList.FeatureRecord} == {'liga'}, 'Review existing substitutions before rebuilding'
    sequence = ' '.join(font.getBestCmap()[ord(c)] for c in 'thebird')
    key_sequence = ' '.join(font.getBestCmap()[ord(c)] for c in 'thekey')
    cup_sequence = ' '.join(font.getBestCmap()[ord(c)] for c in 'thecup')
    cocktail_sequence = ' '.join(font.getBestCmap()[ord(c)] for c in 'thecoctail')
    taxi_sequence = ' '.join(font.getBestCmap()[ord(c)] for c in 'thetaxi')
    chair_sequence = ' '.join(font.getBestCmap()[ord(c)] for c in 'thechair')
    addOpenTypeFeaturesFromString(font,
        f'languagesystem DFLT dflt; languagesystem latn dflt; feature liga {{ sub {sequence} by bird; sub {key_sequence} by key; sub {cup_sequence} by cup; sub {cocktail_sequence} by cocktail; sub {taxi_sequence} by taxi; sub {chair_sequence} by chair; }} liga;',
        tables=['GSUB'])
    if 'DSIG' in font:
        del font['DSIG']
    font.save(path)
    print(f'{style}: thebird / U+E000, thekey / U+E001, thecup / U+E002, thecoctail / U+E003, thetaxi / U+E004')
