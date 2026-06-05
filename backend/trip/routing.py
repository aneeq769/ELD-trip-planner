"""
Routing service using OSRM (free) + fallback to straight-line haversine.
Returns route geometry, waypoints, and readable driving instructions.
"""
import requests
import math
from typing import Optional


def haversine_miles(lat1, lon1, lat2, lon2) -> float:
    """Straight-line distance in miles between two lat/lon points."""
    R = 3958.8
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.asin(math.sqrt(a))


def geocode_location(location_name: str) -> Optional[dict]:
    """
    Geocode a location name using Nominatim (OpenStreetMap) — 100% free.
    Returns {'lat': float, 'lon': float, 'display_name': str} or None.
    """
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": location_name,
            "format": "json",
            "limit": 1,
            "countrycodes": "us",
        }
        headers = {"User-Agent": "ELD-Trip-Planner/1.0"}
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        resp.raise_for_status()
        results = resp.json()
        if results:
            return {
                "lat": float(results[0]["lat"]),
                "lon": float(results[0]["lon"]),
                "display_name": results[0]["display_name"],
            }
    except Exception as e:
        print(f"Geocoding error for '{location_name}': {e}")
    return None


def get_route(
    origin_lat: float, origin_lon: float,
    dest_lat: float, dest_lon: float,
    waypoints: list = None,
) -> dict:
    """
    Get driving route using OSRM (free, no API key needed).
    Returns {
        'distance_miles': float,
        'duration_hours': float,
        'geometry': [[lon, lat], ...],
        'waypoints': [{'lat', 'lon', 'name'}, ...]
    }
    Falls back to haversine if API call fails.
    """
    try:
        coords = f"{origin_lon},{origin_lat}"
        if waypoints:
            for wp in waypoints:
                coords += f";{wp['lon']},{wp['lat']}"
        coords += f";{dest_lon},{dest_lat}"

        url = f"https://router.project-osrm.org/route/v1/driving/{coords}"
        params = {
            "overview": "full",
            "geometries": "geojson",
            "steps": "true",
        }
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        if data.get("code") == "Ok" and data.get("routes"):
            route = data["routes"][0]
            distance_m = route["distance"]
            duration_s = route["duration"]
            geometry = route["geometry"]["coordinates"]

            route_waypoints = _sample_waypoints(geometry, 20)
            instructions = _build_instructions(route)

            return {
                "distance_miles": distance_m / 1609.344,
                "duration_hours": duration_s / 3600,
                "geometry": geometry,
                "waypoints": route_waypoints,
                "instructions": instructions,
                "source": "osrm",
            }
    except Exception as e:
        print(f"OSRM routing error: {e}")

    straight = haversine_miles(origin_lat, origin_lon, dest_lat, dest_lon)
    road_estimate = straight * 1.3
    geometry = [
        [origin_lon, origin_lat],
        [(origin_lon + dest_lon) / 2, (origin_lat + dest_lat) / 2],
        [dest_lon, dest_lat],
    ]
    return {
        "distance_miles": road_estimate,
        "duration_hours": road_estimate / 55.0,
        "geometry": geometry,
        "waypoints": _sample_waypoints(geometry, 10),
        "instructions": [
            {
                "step": 1,
                "text": "Start at the origin and continue toward the destination.",
                "distance_miles": round(road_estimate / 2, 1),
                "duration_hours": round((road_estimate / 55.0) / 2, 2),
            },
            {
                "step": 2,
                "text": "Stay on the main route until you arrive at the destination.",
                "distance_miles": round(road_estimate / 2, 1),
                "duration_hours": round((road_estimate / 55.0) / 2, 2),
            },
        ],
        "source": "fallback",
    }


def _build_instructions(route: dict) -> list:
    """Convert OSRM steps into readable turn-by-turn instructions."""
    instructions = []
    legs = route.get("legs") or []

    for leg_index, leg in enumerate(legs, start=1):
        steps = leg.get("steps") or []
        leg_steps = []

        for step_index, step in enumerate(steps, start=1):
            text = _format_step_instruction(step)
            if not text:
                continue

            leg_steps.append({
                "step": step_index,
                "text": text,
                "distance_miles": round(step.get("distance", 0) / 1609.344, 1),
                "duration_hours": round(step.get("duration", 0) / 3600, 2),
            })

        if not leg_steps:
            leg_steps = [{
                "step": 1,
                "text": "Continue on the route until the next stop.",
                "distance_miles": round(leg.get("distance", 0) / 1609.344, 1),
                "duration_hours": round(leg.get("duration", 0) / 3600, 2),
            }]

        instructions.append({
            "leg": leg_index,
            "distance_miles": round(leg.get("distance", 0) / 1609.344, 1),
            "duration_hours": round(leg.get("duration", 0) / 3600, 2),
            "steps": leg_steps,
        })

    return instructions


def _format_step_instruction(step: dict) -> str:
    """Build a clean human-readable instruction from one OSRM step."""
    maneuver = step.get("maneuver") or {}
    m_type = (maneuver.get("type") or "").lower()
    modifier = (maneuver.get("modifier") or "").replace("_", " ").strip()
    road_name = (step.get("name") or "").strip()
    destinations = (step.get("destinations") or "").strip()
    exit_no = maneuver.get("exit")

    road_text = f" onto {road_name}" if road_name else ""
    dest_text = f" toward {destinations}" if destinations else ""
    modifier_text = f" {modifier}" if modifier else ""

    if m_type == "depart":
        return f"Start{road_text or ' the trip'}"
    if m_type == "arrive":
        return "Arrive at the destination"
    if m_type == "turn":
        return f"Turn{modifier_text}{road_text}"
    if m_type in {"new name", "continue"}:
        return f"Continue{road_text or dest_text}"
    if m_type == "merge":
        return f"Merge{modifier_text}{road_text}"
    if m_type in {"on ramp", "off ramp"}:
        return f"Take the ramp{modifier_text}{road_text or dest_text}"
    if m_type in {"fork", "end of road"}:
        return f"Keep{modifier_text}{road_text or dest_text}"
    if m_type in {"roundabout", "rotary"}:
        if exit_no:
            return f"Enter the roundabout and take exit {exit_no}{road_text}"
        return f"Enter the roundabout{road_text}"
    if m_type == "uturn":
        return f"Make a U-turn{road_text}"

    if road_name:
        return f"Continue on {road_name}"
    return "Continue on the route"


def _sample_waypoints(geometry: list, n: int) -> list:
    """Sample n evenly-spaced points from a GeoJSON coordinate list."""
    if not geometry:
        return []
    total = len(geometry)
    if total <= n:
        return [{"lat": p[1], "lon": p[0]} for p in geometry]
    step = total / n
    return [
        {"lat": geometry[int(i * step)][1], "lon": geometry[int(i * step)][0]}
        for i in range(n)
    ]
