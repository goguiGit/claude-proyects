import argparse
from pathlib import Path

from pixelforge.gallery import generate_gallery, save_gallery
from pixelforge.processor import ImageProcessor

SUPPORTED = {".jpg", ".jpeg", ".png"}


def main() -> None:
    parser = argparse.ArgumentParser(description="PixelForge image pipeline")
    parser.add_argument("--input", default="input", help="Carpeta de imágenes fuente")
    parser.add_argument("--output", default="output", help="Carpeta de salida")
    args = parser.parse_args()

    input_dir = Path(args.input)
    output_dir = Path(args.output)
    thumbs_dir = output_dir / "thumbnails"
    thumbs_dir.mkdir(parents=True, exist_ok=True)

    images = [p for p in input_dir.iterdir() if p.suffix.lower() in SUPPORTED]
    if not images:
        print(f"No se encontraron imágenes en '{input_dir}'.")
        return

    processor = ImageProcessor()
    processed: list[Path] = []
    total = len(images)

    for i, src in enumerate(sorted(images), 1):
        print(f"Procesando {i}/{total}: {src.name}")
        try:
            dest = processor.process_image(src, thumbs_dir)
            processed.append(dest)
        except Exception as exc:
            print(f"  Error en {src.name}: {exc}")

    if processed:
        gallery_path = output_dir / "gallery.html"
        html = generate_gallery(processed, output_dir)
        save_gallery(html, gallery_path)
        print(f"\nGalería generada: {gallery_path}")
        print(f"Imágenes procesadas: {len(processed)}/{total}")
    else:
        print("Ninguna imagen procesada correctamente.")


if __name__ == "__main__":
    main()
