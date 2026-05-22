from pathlib import Path


_CSS = """
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
    background: #1a1a1a;
    color: #e0e0e0;
    font-family: system-ui, sans-serif;
    padding: 2rem;
}
h1 {
    text-align: center;
    margin-bottom: 2rem;
    font-size: 1.8rem;
    letter-spacing: .05em;
    color: #fff;
}
.gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
}
figure {
    background: #2a2a2a;
    border-radius: 8px;
    overflow: hidden;
    transition: transform .2s, box-shadow .2s;
}
figure:hover {
    transform: scale(1.03);
    box-shadow: 0 8px 24px rgba(0,0,0,.6);
}
figure img {
    width: 100%;
    height: 300px;
    object-fit: cover;
    display: block;
}
figcaption {
    padding: .6rem 1rem;
    font-size: .85rem;
    color: #aaa;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
"""


def generate_gallery(image_paths: list[Path], output_dir: Path) -> str:
    items = []
    for path in sorted(image_paths):
        rel = path.relative_to(output_dir)
        items.append(
            f'  <figure>\n'
            f'    <img src="{rel.as_posix()}" alt="{path.name}" loading="lazy">\n'
            f'    <figcaption>{path.name}</figcaption>\n'
            f'  </figure>'
        )

    body = "\n".join(items)
    return (
        "<!DOCTYPE html>\n"
        '<html lang="es">\n'
        "<head>\n"
        '  <meta charset="UTF-8">\n'
        '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
        "  <title>PixelForge Gallery</title>\n"
        f"  <style>{_CSS}</style>\n"
        "</head>\n"
        "<body>\n"
        "  <h1>PixelForge Gallery</h1>\n"
        '  <div class="gallery">\n'
        f"{body}\n"
        "  </div>\n"
        "</body>\n"
        "</html>\n"
    )


def save_gallery(html: str, output_path: Path) -> None:
    output_path.write_text(html, encoding="utf-8")
