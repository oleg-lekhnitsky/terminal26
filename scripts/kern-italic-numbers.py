"""Add restrained optical numeric kerning to the two italic faces (fonttools)."""
from pathlib import Path
from statistics import median
from fontTools.ttLib import TTFont
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString

root = Path(__file__).resolve().parents[1] / 'app/assets/fonts'
for style, gap, minimum_gap in [('Italic', 140, 95), ('Bold-Italic', 130, 90)]:
    path = root / f'AB_Terminal-{style}.ttf'
    font = TTFont(path)
    if 'GPOS' in font:
        assert {record.FeatureTag for record in font['GPOS'].table.FeatureList.FeatureRecord} == {'kern'}, 'Review additional positioning before rebuilding numeric kerning'
        del font['GPOS']
    names = [font.getBestCmap()[ord(char)] for char in '0123456789.,']
    bounds = {}
    for name in names:
        points, ends, _ = font['glyf'][name].getCoordinates(font['glyf'])
        contours = []
        start = 0
        for end in ends:
            contour = points[start:end + 1]
            contours.append((min(x for x, y in contour), max(x for x, y in contour),
                             min(y for x, y in contour), max(y for x, y in contour)))
            start = end + 1
        # Compare facing ink at matching heights instead of unrelated extrema.
        bounds[name] = {}
        for y in range(-150, 751, 10):
            spans = [(left, right) for left, right, bottom, top in contours if bottom <= y <= top]
            if spans:
                bounds[name][y] = (min(span[0] for span in spans), max(span[1] for span in spans))
    pairs = []
    for left in names:
        for right in names:
            if left in ('period', 'comma') and right in ('period', 'comma'):
                continue
            shared = bounds[left].keys() & bounds[right].keys()
            if not shared:
                continue
            separations = [bounds[left][y][1] - bounds[right][y][0] for y in shared]
            advance = max(median(separations) + gap, max(separations) + minimum_gap)
            adjustment = round((advance - font['hmtx'][left][0]) / 5) * 5
            if adjustment:
                pairs.append(f'pos {left} {right} {adjustment};')
    addOpenTypeFeaturesFromString(font, 'languagesystem DFLT dflt; languagesystem latn dflt;\nfeature kern {\n' + '\n'.join(pairs) + '\n} kern;')
    if 'DSIG' in font:
        del font['DSIG']
    font.save(path)
    print(f'{style}: added {len(pairs)} numeric pairs')
