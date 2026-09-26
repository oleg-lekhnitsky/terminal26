"""Set the italic He pair without rebuilding other positioning or substitutions."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.otlLib.builder import buildPairPosGlyphs, buildLookup, buildValue

root = Path(__file__).resolve().parents[1] / 'app/assets/fonts'
for style, adjustment in [('Italic', -100), ('Bold-Italic', -130)]:
    path = root / f'AB_Terminal-{style}.ttf'
    font = TTFont(path)
    gpos = font['GPOS'].table
    updated = False
    for lookup in gpos.LookupList.Lookup:
        if lookup.LookupType != 2:
            continue
        for subtable in lookup.SubTable:
            if subtable.Format != 1 or 'H' not in subtable.Coverage.glyphs:
                continue
            pairs = subtable.PairSet[subtable.Coverage.glyphs.index('H')]
            for pair in pairs.PairValueRecord:
                if pair.SecondGlyph == 'e':
                    pair.Value1.XAdvance = adjustment
                    updated = True
    if not updated:
        lookup = buildLookup(buildPairPosGlyphs(
            {('H', 'e'): (buildValue({'XAdvance': adjustment}), None)},
            font.getReverseGlyphMap()))
        index = len(gpos.LookupList.Lookup)
        gpos.LookupList.Lookup.append(lookup)
        gpos.LookupList.LookupCount = len(gpos.LookupList.Lookup)
        for record in gpos.FeatureList.FeatureRecord:
            if record.FeatureTag == 'kern':
                record.Feature.LookupListIndex.append(index)
                record.Feature.LookupCount = len(record.Feature.LookupListIndex)
    if 'DSIG' in font:
        del font['DSIG']
    font.save(path)
    print(f'{style}: He {adjustment}')
