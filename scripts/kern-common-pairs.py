"""Apply the reviewed common-pair audit across all eight styles.

Requires fonttools. Open collision risks, balance lowercase f pairs, and
reduce the remaining loose at/тл/гл/ьт and italic VA combinations.
Keep all outlines, advances, ligatures, and unrelated kerning unchanged.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.otlLib.builder import buildLookup, buildPairPosGlyphs, buildValue

root = Path(__file__).resolve().parents[1]
targets = {'Regular': {'at': 145,
             'fa': 150,
             'fe': 150,
             'fi': 150,
             'fo': 150,
             'fr': 150,
             'гл': 145,
             'тл': 145,
             'ьт': 145},
 'Italic': {'VA': 140,
            'TY': 90,
            'TT': 90,
            'at': 150,
            'fa': 160,
            'fe': 160,
            'ff': 160,
            'fi': 160,
            'fl': 160,
            'fo': 160,
            'fr': 160,
            'ЯТ': 90,
            'ад': 90,
            'ал': 90,
            'аш': 90,
            'ащ': 90,
            'гл': 150,
            'тл': 150,
            'ьт': 150},
 'Bold': {'at': 130, 'fe': 135, 'fi': 135, 'fo': 135, 'fr': 135, 'ft': 90, 'гл': 130, 'тл': 130, 'ьт': 130},
 'Bold-Italic': {'AV': 90,
                 'VA': 140,
                 'TY': 90,
                 'YT': 90,
                 'TV': 90,
                 'VT': 90,
                 'WT': 90,
                 'TT': 90,
                 'af': 90,
                 'aj': 90,
                 'al': 90,
                 'am': 90,
                 'ar': 90,
                 'as': 90,
                 'ax': 90,
                 'fa': 140,
                 'fe': 140,
                 'ff': 140,
                 'fi': 140,
                 'fl': 140,
                 'fo': 140,
                 'fr': 140,
                 'st': 90,
                 'ut': 90,
                 'АЧ': 90,
                 'ГУ': 90,
                 'ДА': 90,
                 'аш': 90,
                 'га': 90,
                 'гл': 130,
                 'тл': 130,
                 'ут': 90,
                 'щу': 90,
                 'ье': 90,
                 'ьс': 90,
                 'ью': 90,
                 'ья': 90,
                 'ят': 90,
                 'OV': 90},
 'Condensed': {'at': 80, 'fa': 85, 'fe': 85, 'fo': 85, 'гл': 80, 'тл': 80, 'ьт': 80},
 'Condensed_Italic': {'VA': 85,
                      'AY': 65,
                      'TY': 65,
                      'YT': 65,
                      'VT': 65,
                      'WT': 65,
                      'LT': 65,
                      'LA': 65,
                      'LO': 65,
                      'RT': 65,
                      'TT': 65,
                      'ab': 65,
                      'af': 65,
                      'aj': 65,
                      'ak': 65,
                      'am': 65,
                      'ax': 65,
                      'fa': 95,
                      'fe': 95,
                      'ff': 95,
                      'fi': 95,
                      'fl': 95,
                      'fo': 95,
                      'fr': 95,
                      'аг': 65,
                      'аж': 65,
                      'аи': 65,
                      'ак': 65,
                      'ал': 65,
                      'ам': 65,
                      'ан': 65,
                      'ап': 65,
                      'ах': 65,
                      'гл': 95,
                      'ди': 65,
                      'дл': 65,
                      'др': 65,
                      'за': 65,
                      'ит': 65,
                      'нт': 65,
                      'оч': 65,
                      'пт': 65,
                      'ра': 65,
                      'са': 65,
                      'се': 65,
                      'со': 65,
                      'тл': 95,
                      'ци': 65,
                      'ьб': 65,
                      'ье': 65,
                      'ьс': 65,
                      'OY': 65,
                      'АФ': 65,
                      'дн': 65,
                      'сс': 65},
 'Condensed_Bold': {'at': 80,
                    'fa': 90,
                    'fe': 90,
                    'ff': 90,
                    'fi': 90,
                    'fo': 90,
                    'fr': 90,
                    'гл': 80,
                    'тл': 80,
                    'ьт': 80},
 'Condensed_Bold_italic': {'VA': 85,
                           'YT': 65,
                           'VT': 65,
                           'WT': 65,
                           'fa': 95,
                           'fe': 95,
                           'ff': 95,
                           'fi': 95,
                           'fl': 95,
                           'fo': 95,
                           'fr': 95,
                           'ГУ': 65,
                           'ан': 65,
                           'гл': 100,
                           'тл': 100,
                           'ье': 65}}

def spans(font, name):
    points, ends, _ = font['glyf'][name].getCoordinates(font['glyf'])
    boxes, start = [], 0
    for end in ends:
        xs, ys = zip(*points[start:end + 1])
        boxes.append((min(xs), max(xs), min(ys), max(ys)))
        start = end + 1
    rows = {}
    for y in range(-300, 1000):
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
