"""Match Condensed Bold Italic Ў spacing to its unaccented У base."""
from pathlib import Path
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
path = root / 'app/assets/fonts/AB_Terminal-Condensed_Bold_italic.ttf'
font = TTFont(path)
cmap = font.getBestCmap()
base, accented = cmap[ord('У')], cmap[ord('Ў')]
advance, _ = font['hmtx'][base]
right_bearing = advance - font['glyf'][base].xMax
_, left_bearing = font['hmtx'][accented]
font['hmtx'][accented] = (font['glyf'][accented].xMax + right_bearing, left_bearing)
if 'DSIG' in font:
    del font['DSIG']
font.save(path)
print('Condensed Bold Italic: Ў right side bearing matched to У')
