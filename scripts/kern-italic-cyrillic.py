"""Balance Cyrillic specimen pairs while preserving other kerning and ligatures."""
from pathlib import Path
from statistics import median
from fontTools.ttLib import TTFont
from fontTools.otlLib.builder import buildPairPosGlyphs, buildLookup, buildValue

root = Path(__file__).resolve().parents[1] / 'app/assets/fonts'
def spans(font, name):
    points, ends, _ = font['glyf'][name].getCoordinates(font['glyf'])
    boxes, start = [], 0
    for end in ends:
        xs, ys = zip(*points[start:end + 1])
        start = end + 1
        boxes.append((min(xs), max(xs), min(ys), max(ys)))
    result = {}
    for y in range(-200, 701, 10):
        row = [box for box in boxes if box[2] <= y <= box[3]]
        if row:
            result[y] = (min(b[0] for b in row), max(b[1] for b in row))
    return result


for style, gap, minimum in [('Italic', 140, 95), ('Bold-Italic', 130, 90)]:
    path = root / f'AB_Terminal-{style}.ttf'
    font = TTFont(path)
    pairs = {}
    for upper in 'АБВГДЕЁЖЗИЙКЛМНОПРСТУЎФХЦЧШЩЪЫЬЭЮЯ':
        left, right = [font.getBestCmap()[ord(c)] for c in (upper, upper.lower())]
        a, b = spans(font, left), spans(font, right)
        separation = [a[y][1] - b[y][0] for y in a.keys() & b.keys()]
        desired = max(median(separation) + gap, max(separation) + minimum)
        adjustment = round((desired - font['hmtx'][left][0]) / 5) * 5
        # Avoid excessive nesting beneath open, overhanging capitals such as Г.
        adjustment = max(-180, adjustment)
        pairs[(left, right)] = (buildValue({'XAdvance': adjustment}), None)
    gpos = font['GPOS'].table
    for lookup in gpos.LookupList.Lookup:
        if lookup.LookupType != 2:
            continue
        for subtable in lookup.SubTable:
            if subtable.Format != 1:
                continue
            for left, pairset in zip(subtable.Coverage.glyphs, subtable.PairSet):
                for pair in pairset.PairValueRecord:
                    key = (left, pair.SecondGlyph)
                    if key in pairs:
                        pair.Value1.XAdvance = pairs.pop(key)[0].XAdvance
    if pairs:
        lookup = buildLookup(buildPairPosGlyphs(pairs, font.getReverseGlyphMap()))
        index = len(gpos.LookupList.Lookup)
        gpos.LookupList.Lookup.append(lookup)
        gpos.LookupList.LookupCount = len(gpos.LookupList.Lookup)
        for record in gpos.FeatureList.FeatureRecord:
            if record.FeatureTag == 'kern':
                record.Feature.LookupListIndex.append(index)
                record.Feature.LookupCount = len(record.Feature.LookupListIndex)
    if 'DSIG' in font:
        del font['DSIG']
    font.save(path)
    print(f'{style}: Cyrillic pairs updated')
