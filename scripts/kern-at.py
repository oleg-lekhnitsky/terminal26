"""Optically tighten AT without replacing existing kerning or ligatures.

Requires fonttools. Measure contour gaps at shared heights so the T can nest
above A's shoulder while retaining a clear gap between the actual outlines.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.otlLib.builder import buildLookup, buildPairPosGlyphs, buildValue

root = Path(__file__).resolve().parents[1]
targets = {'Regular': 135, 'Italic': 120, 'Bold': 140, 'Condensed': 70, 'Condensed_Bold': 60}

def spans(font, name):
    points, ends, _ = font['glyf'][name].getCoordinates(font['glyf'])
    boxes, start = [], 0
    for end in ends:
        xs, ys = zip(*points[start:end + 1])
        boxes.append((min(xs), max(xs), min(ys), max(ys)))
        start = end + 1
    rows = {}
    for y in range(0, 720):
        row = [box for box in boxes if box[2] <= y <= box[3]]
        if row:
            rows[y] = (min(b[0] for b in row), max(b[1] for b in row))
    return rows

for style, target in targets.items():
    path = root / f'app/assets/fonts/AB_Terminal-{style}.ttf'
    font = TTFont(path)
    cmap = font.getBestCmap()
    left, right = cmap[ord('A')], cmap[ord('T')]
    a, t = spans(font, left), spans(font, right)
    raw_gap = min(font['hmtx'][left][0] + t[y][0] - a[y][1] for y in a.keys() & t.keys())
    adjustment = round((target - raw_gap) / 5) * 5
    if 'GPOS' not in font:
        addOpenTypeFeaturesFromString(font,
            f'languagesystem DFLT dflt; languagesystem latn dflt; feature kern {{ pos {left} {right} {adjustment}; }} kern;',
            tables=['GPOS'])
    else:
        gpos = font['GPOS'].table
        features = [r.Feature for r in gpos.FeatureList.FeatureRecord if r.FeatureTag == 'kern']
        assert features, 'Review existing positioning before adding a new kern feature'
        found = False
        for i in {i for feature in features for i in feature.LookupListIndex}:
            lookup = gpos.LookupList.Lookup[i]
            for subtable in lookup.SubTable:
                if lookup.LookupType != 2 or subtable.Format != 1 or left not in subtable.Coverage.glyphs:
                    continue
                for pair in subtable.PairSet[subtable.Coverage.glyphs.index(left)].PairValueRecord:
                    if pair.SecondGlyph == right:
                        assert not found, 'Multiple AT adjustments need review'
                        if pair.Value1 is None:
                            pair.Value1 = buildValue({'XAdvance': adjustment})
                        else:
                            pair.Value1.XAdvance = adjustment
                        found = True
        if not found:
            lookup = buildLookup(buildPairPosGlyphs({(left, right): (buildValue({'XAdvance': adjustment}), None)}, font.getReverseGlyphMap()))
            index = len(gpos.LookupList.Lookup)
            gpos.LookupList.Lookup.append(lookup)
            gpos.LookupList.LookupCount = len(gpos.LookupList.Lookup)
            for feature in features:
                feature.LookupListIndex.append(index)
                feature.LookupCount = len(feature.LookupListIndex)
    if 'DSIG' in font:
        del font['DSIG']
    font.save(path)
    print(f'{style}: AT {adjustment:+d}; closest gap {raw_gap + adjustment} units')
