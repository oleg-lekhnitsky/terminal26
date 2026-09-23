"""Extract module centers from AB Terminal's original TrueType glyph contours."""
import json
import struct
from pathlib import Path

root = Path(__file__).resolve().parents[1]
labels = ['24H', 'RX', 'AB', '0042', 'TYPE', '250', 'SYS', '98']
output = {}
for face, filename, pitch in [('regular', 'Regular', 105), ('italic', 'Italic', 105), ('bold', 'Bold', 102), ('bold-italic', 'Bold-Italic', 102)]:
    data = (root / f'app/assets/fonts/AB_Terminal-{filename}.ttf').read_bytes()
    u16 = lambda o: struct.unpack_from('>H', data, o)[0]
    i16 = lambda o: struct.unpack_from('>h', data, o)[0]
    u32 = lambda o: struct.unpack_from('>I', data, o)[0]
    tables = {data[12+i*16:16+i*16].decode(): u32(20+i*16) for i in range(u16(4))}
    cmap = tables['cmap']
    subtables = [cmap + u32(cmap+8+i*8) for i in range(u16(cmap+2))]
    table = next(o for o in subtables if u16(o) == 4)
    segments = u16(table+6)//2
    ends = table+14
    starts = ends+segments*2+2
    deltas = starts+segments*2
    ranges = deltas+segments*2
    def glyph_id(code):
        for i in range(segments):
            if u16(starts+i*2) <= code <= u16(ends+i*2):
                delta = i16(deltas+i*2)
                offset = u16(ranges+i*2)
                if not offset:
                    return (code+delta) % 65536
                glyph = u16(ranges+i*2+offset+2*(code-u16(starts+i*2)))
                return (glyph+delta) % 65536 if glyph else 0
        raise ValueError(code)
    long_offsets = i16(tables['head']+50)
    face_glyphs = {}
    for char in sorted(set(''.join(labels))):
        glyph = glyph_id(ord(char))
        loca = tables['loca']
        offset = u32(loca+glyph*4) if long_offsets else u16(loca+glyph*2)*2
        start = tables['glyf']+offset
        contours = i16(start)
        assert contours > 0, (face, char, 'Expected independent module contours')
        ends_of_contours = [u16(start+10+i*2) for i in range(contours)]
        cursor = start+10+contours*2
        cursor += 2+u16(cursor)
        flags = []
        while len(flags) <= ends_of_contours[-1]:
            flag = data[cursor]; cursor += 1
            flags.append(flag)
            if flag & 8:
                repeat = data[cursor]; cursor += 1
                flags.extend([flag]*repeat)
        coordinates = []
        for short, same in [(2,16),(4,32)]:
            value = 0; values = []
            for flag in flags:
                if flag & short:
                    delta = data[cursor]*(1 if flag & same else -1); cursor += 1
                elif flag & same:
                    delta = 0
                else:
                    delta = i16(cursor); cursor += 2
                value += delta; values.append(value)
            coordinates.append(values)
        points = []; first = 0
        for last in ends_of_contours:
            xs, ys = (axis[first:last+1] for axis in coordinates)
            points.append([round((min(xs)+max(xs))/2/pitch, 5), round(-(min(ys)+max(ys))/2/pitch, 5)])
            first = last+1
        metrics_count = u16(tables['hhea']+34)
        advance = u16(tables['hmtx']+min(glyph,metrics_count-1)*4)/pitch
        face_glyphs[char] = {'advance': round(advance,5), 'points': points}
    output[face] = face_glyphs
(root / 'app/utils/pharmacyGlyphs.json').write_text(json.dumps(output, separators=(',',':'))+'\n')
print('Extracted original module centers for', sum(map(len, output.values())), 'glyphs across four faces.')
