from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
IMAGE_ROOT = ROOT / "assets" / "img"


def main() -> None:
    sources = sorted(IMAGE_ROOT.rglob("*-playful.png"))
    total_source = 0
    total_output = 0

    for source in sources:
        target = source.with_suffix(".webp")
        total_source += source.stat().st_size

        with Image.open(source) as image:
            image.save(target, "WEBP", quality=82, method=6, exact=True)

        total_output += target.stat().st_size
        print(f"{target.relative_to(ROOT)} ({target.stat().st_size:,} bytes)")

    reduction = 100 * (1 - total_output / total_source)
    print(
        f"Optimized {len(sources)} images: "
        f"{total_source / 1024 / 1024:.2f} MB -> {total_output / 1024 / 1024:.2f} MB "
        f"({reduction:.1f}% smaller)."
    )


if __name__ == "__main__":
    main()
