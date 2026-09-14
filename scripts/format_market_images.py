"""Marketplace araşdırma fotolarını itkisiz məzmunla vahid karta salır.

Şəkildəki məhsul və etiket dəyişdirilmir. Mənbə foto kəsilmədən 640x640
isti neytral fonda yerləşdirilir və WebP kimi sıxlaşdırılır.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "market-research-images"
TARGET = ROOT / "src" / "assets" / "bazar"

IMAGES = {
    "gubre-karbamid.jpg": "karbamid-46-50kq.webp",
    "fermermarket-superfosfat.jpg": "superfosfat-50kq.webp",
    "fermermarket-ammofos.jpg": "ammofos-12-52-50kq.webp",
    "fermermarket-sulfoammofos.jpg": "sulfoammofos-20-20-14-50kq.webp",
    "fermermarket-npk-16.jpg": "npk-15-15-15-50kq.webp",
}


def format_image(source: Path, target: Path) -> None:
    image = ImageOps.exif_transpose(Image.open(source)).convert("RGB")

    # Axtarış nəticəsinin aşağı-sol kamera nişanı məhsula aid deyil.
    if source.name == "fermermarket-ammofos.jpg":
        image = image.crop((190, 0, image.width, image.height))

    image.thumbnail((548, 548), Image.Resampling.LANCZOS)

    canvas = Image.new("RGB", (640, 640), "#F4F1E8")
    panel_box = (24, 24, 616, 616)
    shadow = Image.new("L", canvas.size, 0)
    ImageDraw.Draw(shadow).rounded_rectangle(panel_box, radius=30, fill=70)
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    shadow_layer = Image.new("RGB", canvas.size, "#5E695E")
    canvas.paste(shadow_layer, mask=shadow)
    ImageDraw.Draw(canvas).rounded_rectangle(panel_box, radius=30, fill="#FBFAF6")

    x = (canvas.width - image.width) // 2
    y = (canvas.height - image.height) // 2
    canvas.paste(image, (x, y))
    canvas.save(target, "WEBP", quality=82, method=6)


def main() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    for source_name, target_name in IMAGES.items():
        source = SOURCE / source_name
        if not source.exists():
            raise FileNotFoundError(f"Mənbə şəkil tapılmadı: {source}")
        target = TARGET / target_name
        format_image(source, target)
        print(f"{target.relative_to(ROOT)} ({target.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
