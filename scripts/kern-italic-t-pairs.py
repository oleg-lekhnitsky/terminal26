"""Balance remaining italic Latin and Cyrillic T pairs.

Requires fonttools. Preserve outlines, existing Latin lowercase T kerning,
ТЛ and ЛТ adjustments, and all other positioning and ligature features.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.otlLib.builder import buildLookup, buildPairPosGlyphs, buildValue

root = Path(__file__).resolve().parents[1]
targets = {
    'Italic': {'TA': 130, 'TO': 130, 'Та': 150, 'То': 150, 'Те': 150, 'Ти': 150, 'Ту': 150, 'Тл': 150},
    'Bold-Italic': {'TA': 120, 'TO': 120, 'Та': 130, 'То': 130, 'Те': 130, 'Ти': 130, 'Ту': 130, 'Тл': 130},
    'Condensed_Italic': {'TA': 75, 'TO': 75, 'Tt': 85, 'Та': 85, 'То': 85, 'Те': 85, 'Ти': 85, 'Ту': 85, 'Тл': 85},
    'Condensed_Bold_italic': {'TA': 75, 'TO': 75, 'Tt': 80, 'Та': 80, 'То': 80, 'Те': 80, 'Ти': 80, 'Ту': 80, 'Тл': 80},
}

def spans(font, name):
    points, ends, _ = font['glyf'][name].getCoordinates(font['glyf'])
    boxes, start = [], 0
    for end in ends:
        xs, ys = zip(*points[start:end + 1])
        boxes.append((min(xs), max(xs), min(ys), max(ys)))
        start = end + 1
    rows = {}
    for y in range(720):
        row = [b for b in boxes if b[2] <= y <= b[3]]
        if row:
            rows[y] = (min(b[0] for b in row), max(b[1] for b in row))
    return rows

for style, settings in targets.items():
    path = root / f'app/assets/fonts/AB_Terminal-{style}.ttf'
    font = TTFont(path)
    cmap = font.getBestCmap()
    gpos = font['GPOS'].table
    features = [r.Feature for r in gpos.FeatureList.FeatureRecord if r.FeatureTag == 'kern']
    assert features
    additions = {}
    for text, target in settings.items():
        left, right = [cmap[ord(c)] for c in text]
        a, b = spans(font, left), spans(font, right)
        raw = min(font['hmtx'][left][0] + b[y][0] - a[y][1] for y in a.keys() & b.keys())
        adjustment = round((target - raw) / 5) * 5
        found = False
        for i in {i for feature in features for i in feature.LookupListIndex}:
            lookup = gpos.LookupList.Lookup[i]
            for s in lookup.SubTable:
                if lookup.LookupType != 2 or s.Format != 1 or left not in s.Coverage.glyphs:
                    continue
                for pair in s.PairSet[s.Coverage.glyphs.index(left)].PairValueRecord:
                    if pair.SecondGlyph != right:
                        continue
                    assert not found, f'Multiple {text} adjustments need review'
                    pair.Value1.XAdvance = adjustment
                    found = True
        if not found:
            additions[(left, right)] = (buildValue({'XAdvance': adjustment}), None)
        assert raw + adjustment - 20 >= 40, (style, text, 'Insufficient clearance at specimen tracking')
        print(f'{style} {text}: {adjustment:+d}, gap {raw + adjustment}')
    if additions:
        index = len(gpos.LookupList.Lookup)
        gpos.LookupList.Lookup.append(buildLookup(buildPairPosGlyphs(additions, font.getReverseGlyphMap())))
        gpos.LookupList.LookupCount = len(gpos.LookupList.Lookup)
        for feature in features:
            feature.LookupListIndex.append(index)
            feature.LookupCount = len(feature.LookupListIndex)
    if 'DSIG' in font:
        del font['DSIG']
    font.save(path)
