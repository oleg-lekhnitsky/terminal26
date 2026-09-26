"""Balance upright Bold Latin and Cyrillic specimen pairs."""
from pathlib import Path
from statistics import median
from fontTools.ttLib import TTFont
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString

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


font_path = root / 'AB_Terminal-Bold.ttf'
font = TTFont(font_path)
pairs = []
for upper in 'ABCDEFGHIJKLMNOPQRSTUVWXYZАБВГДЕЁЖЗИЙКЛМНОПРСТУЎФХЦЧШЩЪЫЬЭЮЯ':
    left, right = [font.getBestCmap()[ord(c)] for c in (upper, upper.lower())]
    a, b = spans(font, left), spans(font, right)
    separation = [a[y][1] - b[y][0] for y in a.keys() & b.keys()]
    desired = max(median(separation) + 130, max(separation) + 90)
    adjustment = max(-150, round((desired - font['hmtx'][left][0]) / 5) * 5)
    pairs.append(f'pos {left} {right} {adjustment};')
    print(f'{upper}{upper.lower()}: {adjustment:+d}')
# This face previously had no GPOS. Rebuild only our specimen pair feature.
if 'GPOS' in font:
    assert {r.FeatureTag for r in font['GPOS'].table.FeatureList.FeatureRecord} == {'kern'}
addOpenTypeFeaturesFromString(font,
    'languagesystem DFLT dflt; languagesystem latn dflt; feature kern {\n' + '\n'.join(pairs) + '\n} kern;',
    tables=['GPOS'])
if 'DSIG' in font:
    del font['DSIG']
font.save(font_path)
