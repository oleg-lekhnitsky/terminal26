"""Synchronize height metadata with existing outlines without reshaping glyphs.

Requires fonttools. Different weights intentionally retain their native pixel
proportions and lowercase heights. Never scale outlines to equalize x-height.
"""
from pathlib import Path
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
for path in sorted((root / 'app/assets/fonts').glob('*.ttf')):
    font = TTFont(path)
    cmap = font.getBestCmap()
    font['OS/2'].sxHeight = font['glyf'][cmap[ord('o')]].yMax
    font['OS/2'].sCapHeight = font['glyf'][cmap[ord('H')]].yMax
    if 'DSIG' in font:
        del font['DSIG']
    font.save(path)
    print(f'{path.name}: height metadata updated; outlines unchanged')
