"""Build private download archives from the font files used by the specimen."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parents[1]
source = root / 'app/assets/fonts'
target = root / 'server/font-downloads'
target.mkdir(parents=True, exist_ok=True)
styles = {'regular': 'Regular', 'italic': 'Italic', 'bold': 'Bold', 'bold-italic': 'Bold-Italic'}
products = {key: [style] for key, style in styles.items()}
products['full-pack'] = list(styles.values())
products['test-font'] = ['Regular']
for product, included in products.items():
    with ZipFile(target / f'{product}.zip', 'w', ZIP_DEFLATED) as archive:
        for style in included:
            name = f'AB_Terminal-{style}.ttf'
            archive.write(source / name, name)
        archive.writestr('INSTALL.txt', 'AB TERMINAL\n\nOpen each TTF file to install the font on your computer.\n')
print(f'Packaged {len(products)} font downloads.')
