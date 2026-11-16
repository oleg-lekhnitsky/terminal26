"""Export lowercase ab outlines for the metallic card from the eight specimen fonts.

Run with fontTools installed after changing glyph outlines in the source TTFs.
"""
import json
from pathlib import Path
from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
styles = {'regular': 'Regular', 'italic': 'Italic', 'bold': 'Bold', 'bold-italic': 'Bold-Italic', 'condensed': 'Condensed', 'condensed-italic': 'Condensed_Italic', 'condensed-bold': 'Condensed_Bold', 'condensed-bold-italic': 'Condensed_Bold_italic'}

class OutlinePen(BasePen):
    def __init__(self, glyphs, scale):
        super().__init__(glyphs)
        self.commands = []
        self.scale = scale
    def record(self, kind, *points):
        self.commands.append([kind, *[round(v * self.scale, 6) for point in points for v in point]])
    def _moveTo(self, p): self.record('M', p)
    def _lineTo(self, p): self.record('L', p)
    def _curveToOne(self, a, b, c): self.record('C', a, b, c)
    def _qCurveToOne(self, a, b): self.record('Q', a, b)
    def _closePath(self): self.record('Z')

result = {}
for key, style in styles.items():
    font = TTFont(root / f'app/assets/fonts/AB_Terminal-{style}.ttf')
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    result[key] = []
    for char in 'ab':
        name = cmap[ord(char)]
        pen = OutlinePen(glyphs, 1 / font['head'].unitsPerEm)
        glyphs[name].draw(pen)
        result[key].append(pen.commands)
output = root / 'app/utils/metallicLetterOutlines.json'
output.write_text(json.dumps(result, separators=(',', ':')) + '\n')
print(f'Exported ab in {len(result)} styles to {output.relative_to(root)}')
