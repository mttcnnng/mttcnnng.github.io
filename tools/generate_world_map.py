import json
from pathlib import Path
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parent.parent
SOURCE_CACHE = Path(__file__).with_name("ne_110m_land.geojson")
OUTPUT = ROOT / "assets" / "img" / "world-map.svg"
SOURCE_URL = (
    "https://d2ad6b4ur7yvpq.cloudfront.net/"
    "naturalearth-3.3.0/ne_110m_land.geojson"
)


def perpendicular_distance(point, start, end):
    if start == end:
        return ((point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2) ** 0.5

    dx = end[0] - start[0]
    dy = end[1] - start[1]
    numerator = abs(dy * point[0] - dx * point[1] + end[0] * start[1] - end[1] * start[0])
    return numerator / ((dx * dx + dy * dy) ** 0.5)


def simplify(points, tolerance=0.22):
    if len(points) <= 2:
        return points

    start = points[0]
    end = points[-1]
    max_distance = 0
    split_at = 0

    for index, point in enumerate(points[1:-1], start=1):
        distance = perpendicular_distance(point, start, end)
        if distance > max_distance:
            max_distance = distance
            split_at = index

    if max_distance <= tolerance:
        return [start, end]

    before = simplify(points[: split_at + 1], tolerance)
    after = simplify(points[split_at:], tolerance)
    return before[:-1] + after


def project(point):
    longitude, latitude = point[:2]
    x = (longitude + 180) / 360 * 1000
    y = (85 - latitude) / 150 * 430
    return x, y


def format_number(value):
    return f"{value:.1f}".rstrip("0").rstrip(".")


def ring_path(ring):
    if len(ring) < 4:
        return ""

    open_ring = ring[:-1] if ring[0] == ring[-1] else ring
    simplified = simplify(open_ring + [open_ring[0]])
    if len(simplified) < 4:
        return ""

    projected = [project(point) for point in simplified[:-1]]
    commands = [f"M{format_number(projected[0][0])} {format_number(projected[0][1])}"]
    commands.extend(f"L{format_number(x)} {format_number(y)}" for x, y in projected[1:])
    commands.append("Z")
    return "".join(commands)


def geometry_rings(geometry):
    if geometry["type"] == "Polygon":
        return geometry["coordinates"]
    if geometry["type"] == "MultiPolygon":
        return [ring for polygon in geometry["coordinates"] for ring in polygon]
    return []


def load_source():
    if SOURCE_CACHE.exists():
        return json.loads(SOURCE_CACHE.read_text(encoding="utf-8"))

    with urlopen(SOURCE_URL) as response:
        return json.load(response)


def main():
    source = load_source()
    paths = []

    for feature in source["features"]:
        rings = geometry_rings(feature["geometry"])
        latitudes = [point[1] for ring in rings for point in ring]
        if latitudes and max(latitudes) < -55:
            continue

        paths.extend(path for ring in rings if (path := ring_path(ring)))

    path_data = "".join(paths)
    svg = f"""<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 430\">
  <desc>World land geometry from the public-domain Natural Earth 1:110m dataset.</desc>
  <path d=\"{path_data}\" fill=\"#f4f4f2\" fill-rule=\"evenodd\" stroke=\"#d7d7d3\" stroke-linejoin=\"round\" stroke-width=\"0.7\" vector-effect=\"non-scaling-stroke\"/>
</svg>
"""
    OUTPUT.write_text(svg, encoding="utf-8", newline="\n")
    print(f"Generated {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
