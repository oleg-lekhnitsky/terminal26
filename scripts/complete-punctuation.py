"""Complete family punctuation using native pixels and matching-style outlines.

Requires fontTools. Preserve existing valid punctuation and unrelated font data.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.recordingPen import DecomposingRecordingPen

ROOT = Path(__file__).resolve().parents[1]
FONTS = ROOT / 'app/assets/fonts'
CHARS = '.,:;!?\'"`´()[]{}<>/\\|-–—_…·•‘’‚“”„«»‹›@#&*^~'


def parts(font, name):
    glyph = font['glyf'][name]
    coords, ends, flags = glyph.getCoordinates(font['glyf'])
    start = 0
    result = []
    for end in ends:
        pts = coords[start:end+1]
        result.append((min(x for x,y in pts), min(y for x,y in pts),
                       max(x for x,y in pts), max(y for x,y in pts)))
        start = end+1
    return result


for path in sorted(FONTS.glob('*.ttf')):
    font = TTFont(path)
    cmap = font.getBestCmap()
    condensed = 'Condensed' in path.name
    italic = 'italic' in path.name.lower()
    bold = 'bold' in path.name.lower()
    source_style = ('Bold-Italic' if bold else 'Italic') if italic else ('Bold' if bold else 'Regular')
    source = TTFont(FONTS / f'AB_Terminal-{source_style}.ttf')
    dot_name = cmap[ord('.')]
    dot = font['glyf'][dot_name]
    width, height = dot.xMax-dot.xMin, dot.yMax-dot.yMin
    # Native i supplies the vertical grid and the face's staircase slant.
    iparts = sorted(parts(font, cmap[ord('i')]), key=lambda p:p[1])
    centers = sorted(set((round((p[1]+p[3])/2, 1), round((p[0]+p[2])/2, 1)) for p in iparts))
    rows = sorted(set(p[1] for p in iparts))
    step_y = min(b-a for a,b in zip(rows, rows[1:]) if b-a > height*.7)
    step_x = width if bold else round(width / .75)
    slope = 0
    if italic:
        # The isolated dot and the middle stem are aligned on the italic axis.
        by_row = {}
        for y,x in centers: by_row.setdefault(y, []).append(x)
        ys = sorted(by_row)
        y0,y1 = ys[len(ys)//2],ys[-1]
        slope = (sum(by_row[y1])/len(by_row[y1])-sum(by_row[y0])/len(by_row[y0]))/(y1-y0)
    margin = 30 if condensed else 50
    changed = []
    for ch in CHARS:
        cp = ord(ch)
        name = cmap.get(cp)
        valid = name is not None and font['glyf'][name].numberOfContours != 0
        repair = (condensed and ch in '{}|') or (condensed and not bold and not italic and ch in '"…') or (condensed and bold and italic and ch == ':')
        # Low double quotes must contain two complete comma forms; the native
        # two-contour versions contain only two dots. Some double guillemets
        # likewise contain only one chevron.
        repair |= ch == '„' and valid and font['glyf'][name].numberOfContours < 4
        repair |= ch in '«»' and valid and font['glyf'][name].numberOfContours == 5
        repair |= condensed and ch == '&' and valid and font['glyf'][name].numberOfContours > 30
        repair |= condensed and not italic and ch == '@'
        if valid and not repair: continue
        pen = TTGlyphPen(None)
        advance = None
        if ch in '{}|&@':
            sc = source.getBestCmap(); sn = sc[cp]
            sh = source['glyf'][sc[ord('H')]]; th = font['glyf'][cmap[ord('H')]]
            sx = (th.xMax-th.xMin)/(sh.xMax-sh.xMin); sy = th.yMax/sh.yMax
            rec = DecomposingRecordingPen(source.getGlyphSet()); source.getGlyphSet()[sn].draw(rec)
            rec.replay(TransformPen(pen,(sx,0,0,sy,0,0)))
            advance = round(source['hmtx'][sn][0]*sx)
        elif ch in '‚„‹›«»':
            base_char = ',' if ch in '‚„' else ('<' if ch in '‹«' else '>')
            base_name = cmap[ord(base_char)]
            base = font['glyf'][base_name]
            rec = DecomposingRecordingPen(font.getGlyphSet())
            font.getGlyphSet()[base_name].draw(rec)
            rec.replay(pen)
            advance = font['hmtx'][base_name][0]
            if ch in '„«»':
                offset = round(base.xMax-base.xMin+step_x)
                rec.replay(TransformPen(pen,(1,0,0,1,offset,0)))
                advance += offset
        elif ch == '"':
            rec = DecomposingRecordingPen(font.getGlyphSet()); font.getGlyphSet()[cmap[ord("'")]].draw(rec)
            rec.replay(pen)
            offset = round(step_x*2)
            rec.replay(TransformPen(pen,(1,0,0,1,offset,0)))
            advance = font['hmtx'][cmap[ord("'")]][0]+offset
        else:
            patterns = {
                '`':[(0,6),(1,5)], '´':[(0,5),(1,6)],
                '–':[(i,3) for i in range(5)], '—':[(i,3) for i in range(7)],
                '…':[(0,0),(2,0),(4,0)], '·':[(0,3)],
                '•':[(0,2),(1,2),(0,3),(1,3)], ':':[(0,1),(0,4)],
                '‘':[(1,6),(0,5),(0,4)], '’':[(1,6),(1,5),(0,4)],
                '“':[(1,6),(0,5),(0,4),(4,6),(3,5),(3,4)],
                '”':[(1,6),(1,5),(0,4),(4,6),(4,5),(3,4)],
                '~':[(0,3),(1,4),(2,4),(3,3),(4,3),(5,4)],
            }
            assert ch in patterns, (path,ch)
            positions = [(x*step_x+slope*y*step_y,y*step_y) for x,y in patterns[ch]]
            left = min(x for x,y in positions)
            rec = DecomposingRecordingPen(font.getGlyphSet()); font.getGlyphSet()[dot_name].draw(rec)
            for x,y in positions:
                rec.replay(TransformPen(pen,(1,0,0,1,round(margin+x-left-dot.xMin),round(y-dot.yMin))))
            advance = round(margin*2+max(x for x,y in positions)-left+width)
        glyph = pen.glyph(); glyph.recalcBounds(font['glyf'])
        if name is None:
            name = f'uni{cp:04X}.punctuation'
            font.setGlyphOrder(font.getGlyphOrder()+[name])
        font['glyf'][name] = glyph
        font['hmtx'][name] = (advance,glyph.xMin)
        for table in font['cmap'].tables:
            if table.isUnicode() and table.format in (4,12): table.cmap[cp] = name
        changed.append(ch)
    if changed:
        if 'DSIG' in font: del font['DSIG']
        font.save(path)
    print(path.stem, ''.join(changed))

# Make the new coverage available in the site's glyph picker.
import json
import re
registry = ROOT / 'app/utils/fontSymbols.ts'
text = registry.read_text()
for style, variant in [('Regular','regular'),('Italic','italic'),('Bold','bold'),('Bold-Italic','bold-italic'),('Condensed','condensed'),('Condensed_Italic','condensed-italic'),('Condensed_Bold','condensed-bold'),('Condensed_Bold_italic','condensed-bold-italic')]:
    pattern = r'^(  "'+variant+r'": )(\[.*\])(,?)$'
    def update(match):
        chars = sorted(set(json.loads(match[2])) | set(CHARS), key=ord)
        return match[1]+json.dumps(chars, ensure_ascii=False)+match[3]
    text, count = re.subn(pattern, update, text, flags=re.MULTILINE)
    assert count == 1, variant
registry.write_text(text)
