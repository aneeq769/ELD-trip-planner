import json
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .routing import geocode_location, get_route
from .hos_engine import plan_trip
from .models import TripPlan


@api_view(["POST"])
def plan_trip_view(request):
    data = request.data
    current_location = data.get("current_location", "").strip()
    pickup_location = data.get("pickup_location", "").strip()
    dropoff_location = data.get("dropoff_location", "").strip()
    try:
        current_cycle_used = float(data.get("current_cycle_used", 0))
    except (ValueError, TypeError):
        current_cycle_used = 0.0

    if not all([current_location, pickup_location, dropoff_location]):
        return Response({"error": "All three locations are required."}, status=400)
    if current_cycle_used < 0 or current_cycle_used > 70:
        return Response({"error": "current_cycle_used must be 0-70."}, status=400)

    current_geo = geocode_location(current_location)
    pickup_geo = geocode_location(pickup_location)
    dropoff_geo = geocode_location(dropoff_location)

    errors = []
    if not current_geo: errors.append(f"Cannot geocode: '{current_location}'")
    if not pickup_geo: errors.append(f"Cannot geocode: '{pickup_location}'")
    if not dropoff_geo: errors.append(f"Cannot geocode: '{dropoff_location}'")
    if errors:
        return Response({"error": " | ".join(errors)}, status=400)

    leg1 = get_route(current_geo["lat"], current_geo["lon"], pickup_geo["lat"], pickup_geo["lon"])
    leg2 = get_route(pickup_geo["lat"], pickup_geo["lon"], dropoff_geo["lat"], dropoff_geo["lon"])
    total_miles = leg1["distance_miles"] + leg2["distance_miles"]
    combined_geometry = leg1["geometry"] + leg2["geometry"]

    trip = plan_trip(
        total_miles=total_miles,
        current_cycle_used=current_cycle_used,
        current_location=current_geo["display_name"],
        pickup_location=pickup_geo["display_name"],
        dropoff_location=dropoff_geo["display_name"],
        current_lat=current_geo["lat"], current_lon=current_geo["lon"],
        pickup_lat=pickup_geo["lat"], pickup_lon=pickup_geo["lon"],
        dropoff_lat=dropoff_geo["lat"], dropoff_lon=dropoff_geo["lon"],
        leg1_miles=leg1["distance_miles"],
        route_geometry=combined_geometry,
    )

    stops_data = [
        {"type": s.type, "label": s.label, "lat": s.lat, "lon": s.lon,
         "arrival_time": s.arrival_time, "departure_time": s.departure_time,
         "duration_hours": s.duration_hours, "miles_from_start": s.miles_from_start,
         "day": s.day, "duty_status": s.duty_status}
        for s in trip.stops
    ]
    day_logs_data = [
        {"day_number": dl.day_number, "date_label": dl.date_label,
         "from_location": dl.from_location, "to_location": dl.to_location,
         "events": dl.events, "total_driving": dl.total_driving,
         "total_on_duty": dl.total_on_duty, "total_off_duty": dl.total_off_duty,
         "total_sleeper": dl.total_sleeper, "total_miles": dl.total_miles,
         "remarks": dl.remarks}
        for dl in trip.day_logs
    ]

    TripPlan.objects.create(
        current_location=current_geo["display_name"],
        pickup_location=pickup_geo["display_name"],
        dropoff_location=dropoff_geo["display_name"],
        current_cycle_used=current_cycle_used,
        total_miles=trip.summary["total_miles"],
        total_days=trip.summary["total_days"],
        total_driving_hours=trip.summary["total_driving_hours"],
        route={
            "geometry": combined_geometry,
            "leg1_miles": round(leg1["distance_miles"], 1),
            "leg2_miles": round(leg2["distance_miles"], 1),
            "total_miles": round(total_miles, 1),
            "instructions": [
                {
                    "leg": 1,
                    "label": "Current to Pickup",
                    "distance_miles": round(leg1["distance_miles"], 1),
                    "duration_hours": round(leg1["duration_hours"], 2),
                    "steps": leg1.get("instructions", []),
                },
                {
                    "leg": 2,
                    "label": "Pickup to Dropoff",
                    "distance_miles": round(leg2["distance_miles"], 1),
                    "duration_hours": round(leg2["duration_hours"], 2),
                    "steps": leg2.get("instructions", []),
                },
            ],
        },
        stops=stops_data,
        day_logs=day_logs_data,
        summary=trip.summary,
    )

    return Response({
        "success": True,
        "locations": {
            "current": {"name": current_geo["display_name"], "lat": current_geo["lat"], "lon": current_geo["lon"]},
            "pickup": {"name": pickup_geo["display_name"], "lat": pickup_geo["lat"], "lon": pickup_geo["lon"]},
            "dropoff": {"name": dropoff_geo["display_name"], "lat": dropoff_geo["lat"], "lon": dropoff_geo["lon"]},
        },
        "route": {
            "geometry": combined_geometry,
            "leg1_miles": round(leg1["distance_miles"], 1),
            "leg2_miles": round(leg2["distance_miles"], 1),
            "total_miles": round(total_miles, 1),
            "instructions": [
                {
                    "leg": 1,
                    "label": "Current to Pickup",
                    "distance_miles": round(leg1["distance_miles"], 1),
                    "duration_hours": round(leg1["duration_hours"], 2),
                    "steps": leg1.get("instructions", []),
                },
                {
                    "leg": 2,
                    "label": "Pickup to Dropoff",
                    "distance_miles": round(leg2["distance_miles"], 1),
                    "duration_hours": round(leg2["duration_hours"], 2),
                    "steps": leg2.get("instructions", []),
                },
            ],
        },
        "stops": stops_data,
        "day_logs": day_logs_data,
        "summary": trip.summary,
    })


@api_view(["GET"])
def health_check(request):
    return Response({"status": "ok"})
