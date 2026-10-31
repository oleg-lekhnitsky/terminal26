"""Tighten lowercase de in the three uneven italic styles without changing outlines.

Requires fonttools. Preserve other kerning and ligature features.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.otlLib.builder import buildLookup, buildPairPosGlyphs, buildValue

root = Path(__file__).resolve().parents[1]
targets = {'Condensed_Italic': {'de': 88}, 'Bold-Italic': {'de': 130}, 'Condensed_Bold_italic': {'de': 95}}

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
