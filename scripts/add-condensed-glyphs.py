"""Fill Condensed coverage from the original family, preserving native glyphs.

Requires fonttools. Added outlines and spacing are scaled to the target H;
existing glyphs remain untouched. Rebuild the six custom word ligatures.
"""
from pathlib import Path
import json
import re
import unicodedata
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString

root = Path(__file__).resolve().parents[1]
styles = [('Regular', 'Condensed', 'condensed'), ('Italic', 'Condensed_Italic', 'condensed-italic'),
          ('Bold', 'Condensed_Bold', 'condensed-bold'), ('Bold-Italic', 'Condensed_Bold_italic', 'condensed-bold-italic')]
originals = {style: TTFont(root / f'app/assets/fonts/AB_Terminal-{style}.ttf') for style, _, _ in styles}
coverage = set().union(*(font.getBestCmap() for font in originals.values()))
shortcuts = ['thebird', 'thekey', 'thecup', 'thecoctail', 'thetaxi', 'thechair']
symbol_path = root / 'app/utils/fontSymbols.ts'
symbols = symbol_path.read_text()

for original, condensed, variant in styles:
    path = root / f'app/assets/fonts/AB_Terminal-{condensed}.ttf'
    target = TTFont(path)
    cmap = target.getBestCmap()
    missing = sorted(coverage - cmap.keys())
    candidates = [original] + [style for style in originals if style != original]
    for code in missing:
        source = next(originals[style] for style in candidates if code in originals[style].getBestCmap())
        source_name = source.getBestCmap()[code]
        source_h = source['glyf'][source.getBestCmap()[ord('H')]]
        target_h = target['glyf'][cmap[ord('H')]]
        sx = (target_h.xMax - target_h.xMin) / (source_h.xMax - source_h.xMin)
        sy = target_h.yMax / source_h.yMax
        recording = DecomposingRecordingPen(source.getGlyphSet())
        source.getGlyphSet()[source_name].draw(recording)
        pen = TTGlyphPen(None)
        recording.replay(TransformPen(pen, (sx, 0, 0, sy, 0, 0)))
        glyph = pen.glyph()
        glyph.recalcBounds(target['glyf'])
        name = f'uni{code:04X}.added'
        assert name not in target.getGlyphOrder(), name
        target.setGlyphOrder(target.getGlyphOrder() + [name])
        target['glyf'][name] = glyph
        advance, bearing = source['hmtx'][source_name]
        target['hmtx'][name] = (round(advance * sx), glyph.xMin if glyph.numberOfContours else round(bearing * sx))
        for table in target['cmap'].tables:
            if table.isUnicode() and table.format in (4, 12):
                table.cmap[code] = name
    cmap = target.getBestCmap()
    assert 'GSUB' not in target or {r.FeatureTag for r in target['GSUB'].table.FeatureList.FeatureRecord} == {'liga'}, 'Review existing substitutions before rebuilding'
    substitutions = []
    for index, shortcut in enumerate(shortcuts):
        sequence = ' '.join(cmap[ord(c)] for c in shortcut)
        substitutions.append(f'sub {sequence} by {cmap[0xE000 + index]};')
    addOpenTypeFeaturesFromString(target,
        'languagesystem DFLT dflt; languagesystem latn dflt; feature liga { '
        + ' '.join(substitutions) + ' } liga;', tables=['GSUB'])
    if 'DSIG' in target:
        del target['DSIG']
    target.save(path)
    punctuation = [chr(c) for c in sorted(cmap) if unicodedata.category(chr(c))[0] in ('P', 'S')]
    row = '  ' + json.dumps(variant) + ': ' + json.dumps(punctuation, ensure_ascii=False) + ','
    symbols, count = re.subn(r'^  "' + re.escape(variant) + r'": .*$', lambda _: row, symbols, flags=re.MULTILINE)
    assert count == 1
    print(f'{condensed}: {len(missing)} glyphs added; six word ligatures installed')
symbol_path.write_text(symbols)
