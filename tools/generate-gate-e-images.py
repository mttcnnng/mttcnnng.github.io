"""Generate restrained social cards and an optimized copy of the Home portrait."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "assets" / "img"
FONT_REGULAR = "C:/Windows/Fonts/segoeui.ttf"
FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
BLACK = "#0b0b0b"
GREY = "#4b4b4b"
CORAL = "#b7442d"


def font(path, size):
    return ImageFont.truetype(path, size)


def card():
    canvas = Image.new("RGB", (1200, 630), "#ffffff")
    draw = ImageDraw.Draw(canvas)
    draw.text((72, 63), "MTTCNNNG", font=font(FONT_BOLD, 29), fill=BLACK)
    draw.line((72, 120, 1128, 120), fill="#e5e5e5", width=2)
    draw.rounded_rectangle((72, 204, 128, 212), radius=4, fill=CORAL)
    draw.text((72, 253), "Matt Canning", font=font(FONT_BOLD, 73), fill=BLACK)
    draw.text((74, 358), "Building, ideas and the journey between them", font=font(FONT_REGULAR, 28), fill=GREY)
    draw.text((74, 528), "mttcnnng.com", font=font(FONT_BOLD, 23), fill=BLACK)
    portrait = Image.open(IMAGES / "profile-matt.png").convert("RGB")
    portrait = ImageOps.fit(portrait, (304, 304), method=Image.Resampling.LANCZOS)
    mask = Image.new("L", portrait.size)
    ImageDraw.Draw(mask).ellipse((0, 0, 303, 303), fill=255)
    canvas.paste(portrait, (824, 206), mask)
    canvas.save(IMAGES / "social-matt-canning.jpg", quality=88, optimize=True, progressive=True)


def mp3_card():
    canvas = Image.new("RGB", (1200, 630), "#ffffff")
    draw = ImageDraw.Draw(canvas)
    draw.text((72, 63), "MTTCNNNG", font=font(FONT_BOLD, 29), fill=BLACK)
    draw.line((72, 120, 1128, 120), fill="#e5e5e5", width=2)
    draw.rounded_rectangle((72, 209, 128, 217), radius=4, fill=CORAL)
    draw.text((72, 260), "MP3 Home", font=font(FONT_BOLD, 58), fill=BLACK)
    draw.text((72, 329), "Player", font=font(FONT_BOLD, 58), fill=BLACK)
    draw.text((74, 444), "A build from the archive", font=font(FONT_REGULAR, 25), fill=GREY)
    draw.text((74, 528), "mttcnnng.com", font=font(FONT_BOLD, 23), fill=BLACK)
    photo = Image.open(IMAGES / "builds" / "mp3-home-player-photo.jpg").convert("RGB")
    photo = ImageOps.fit(photo, (562, 360), method=Image.Resampling.LANCZOS, centering=(0.48, 0.50))
    canvas.paste(photo, (566, 191))
    draw.rectangle((565, 190, 1128, 551), outline="#d9d9d9", width=2)
    canvas.save(IMAGES / "builds" / "mp3-home-player-social.jpg", quality=88, optimize=True, progressive=True)


if __name__ == "__main__":
    Image.open(IMAGES / "profile-matt.png").save(IMAGES / "profile-matt.webp", "WEBP", quality=84, method=6)
    card()
    mp3_card()
