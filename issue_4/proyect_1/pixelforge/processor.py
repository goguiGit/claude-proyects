from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps


class ImageProcessor:
    THUMBNAIL_SIZE = (300, 300)
    WATERMARK_TEXT = "© PixelForge"
    WATERMARK_OPACITY = 120
    WATERMARK_PADDING = 10

    def make_thumbnail(self, img: Image.Image) -> Image.Image:
        return ImageOps.fit(img.convert("RGBA"), self.THUMBNAIL_SIZE)

    def apply_vignette(self, img: Image.Image) -> Image.Image:
        w, h = img.size
        mask = Image.new("L", (w, h), 0)
        draw = ImageDraw.Draw(mask)

        radius_x = w // 2
        radius_y = h // 2
        draw.ellipse(
            (w // 2 - radius_x, h // 2 - radius_y, w // 2 + radius_x, h // 2 + radius_y),
            fill=255,
        )

        blur_radius = min(w, h) // 3
        mask = mask.filter(ImageFilter.GaussianBlur(radius=blur_radius))

        black_layer = Image.new("RGBA", (w, h), (0, 0, 0, 255))
        result = img.copy().convert("RGBA")
        result.paste(black_layer, mask=Image.eval(mask, lambda p: 255 - p))
        return result

    def add_watermark(self, img: Image.Image) -> Image.Image:
        w, h = img.size
        layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(layer)

        text = self.WATERMARK_TEXT
        bbox = draw.textbbox((0, 0), text)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]

        x = w - text_w - self.WATERMARK_PADDING
        y = h - text_h - self.WATERMARK_PADDING
        draw.text((x, y), text, fill=(255, 255, 255, self.WATERMARK_OPACITY))

        return Image.alpha_composite(img.convert("RGBA"), layer)

    def process_image(self, src: Path, output_dir: Path) -> Path:
        with Image.open(src) as img:
            result = self.make_thumbnail(img)
            result = self.apply_vignette(result)
            result = self.add_watermark(result)

        dest = output_dir / src.name
        if src.suffix.lower() in (".jpg", ".jpeg"):
            result.convert("RGB").save(dest, "JPEG", quality=90)
        else:
            result.save(dest, "PNG")

        return dest
