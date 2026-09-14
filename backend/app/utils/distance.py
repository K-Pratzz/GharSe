import math

def haversine_km(point_a: dict | None, point_b: dict | None) -> float | None:
    """
    Haversine distance in km between two lat/lng points.
    Returns None if either point is missing coordinates.
    """
    if not point_a or not point_b:
        return None
    
    lat1 = point_a.get("lat")
    lng1 = point_a.get("lng")
    lat2 = point_b.get("lat")
    lng2 = point_b.get("lng")

    if lat1 is None or lng1 is None or lat2 is None or lng2 is None:
        return None

    try:
        lat1, lng1, lat2, lng2 = float(lat1), float(lng1), float(lat2), float(lng2)
    except (ValueError, TypeError):
        return None

    r = 6371.0  # Earth radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2.0) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lng / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(r * c, 1)
