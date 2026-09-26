"""Add restrained optical numeric kerning to the two italic faces (fonttools)."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString

root = Path(__file__).resolve().parents[1] / 'app/assets/fonts'
for style, gap in [('Italic', 90), ('Bold-Italic', 65)]:
    path = root / f'AB_Terminal-{style}.ttf'
    font = TTFont(path)
    if 'GPOS' in font:
        raise RuntimeError(f'{style}: review existing GPOS before replacing kerning')
    names = [font.getBestCmap()[ord(char)] for char in '0123456789.,']
    bounds = {}
    for name in names:
        points, _, _ = font['glyf'][name].getCoordinates(font['glyf'])
        # Measure along the family's italic axis without distorting the pixels.
        xs = [x - .5 * y for x, y in points]
        bounds[name] = (min(xs), max(xs))
    pairs = []
    for left in names:
        for right in names:
            if left in ('period', 'comma') and right in ('period', 'comma'):
                continue
            space = font['hmtx'][left][0] + bounds[right][0] - bounds[left][1]
            adjustment = max(-160, min(100, round((gap - space) / 5) * 5))
            if adjustment:
                pairs.append(f'pos {left} {right} {adjustment};')
    addOpenTypeFeaturesFromString(font, 'languagesystem DFLT dflt; languagesystem latn dflt;\nfeature kern {\n' + '\n'.join(pairs) + '\n} kern;')
    if 'DSIG' in font:
        del font['DSIG']
    font.save(path)
    print(f'{style}: added {len(pairs)} numeric pairs')
