"""Convert all images in public/media to WebP format (lossless for PNG, quality 90 for JPG)"""
import os
from PIL import Image

media_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'public', 'media')

extensions = ('.png', '.jpg', '.jpeg')
converted = 0
skipped = 0

for fname in os.listdir(media_dir):
    ext = os.path.splitext(fname)[1].lower()
    if ext not in extensions:
        continue

    src = os.path.join(media_dir, fname)
    webp_name = os.path.splitext(fname)[0] + '.webp'
    dst = os.path.join(media_dir, webp_name)

    if os.path.exists(dst):
        src_mtime = os.path.getmtime(src)
        dst_mtime = os.path.getmtime(dst)
        if dst_mtime >= src_mtime:
            skipped += 1
            continue

    img = Image.open(src)

    if ext == '.png':
        # Lossless WebP for PNG — zero quality loss
        img.save(dst, 'WEBP', lossless=True, quality=100)
    else:
        # High quality lossy for JPG — visually lossless
        img.save(dst, 'WEBP', quality=90)

    src_size = os.path.getsize(src)
    dst_size = os.path.getsize(dst)
    ratio = (1 - dst_size / src_size) * 100

    print(f'  {fname:45s} {src_size//1024:>5}KB → {dst_size//1024:>5}KB ({ratio:+.0f}%)')
    converted += 1

print(f'\nDone: {converted} converted, {skipped} up-to-date')
