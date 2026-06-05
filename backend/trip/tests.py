import math

from django.test import TestCase

from .hos_engine import plan_trip


def haversine_miles(lat1, lon1, lat2, lon2):
    radius_miles = 3958.8
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return 2 * radius_miles * math.asin(math.sqrt(a))


def build_offline_route(origin, destination):
    miles = (
        haversine_miles(
            origin["lat"], origin["lon"], destination["lat"], destination["lon"]
        )
        * 1.3
    )
    geometry = [
        [origin["lon"], origin["lat"]],
        [
            (origin["lon"] + destination["lon"]) / 2,
            (origin["lat"] + destination["lat"]) / 2,
        ],
        [destination["lon"], destination["lat"]],
    ]
    return {
        "distance_miles": miles,
        "duration_hours": miles / 55.0,
        "geometry": geometry,
    }


class RouteSimulationTests(TestCase):
    def test_offline_route_and_hos_planning(self):
        nyc = {
            "lat": 40.7128,
            "lon": -74.0060,
            "display_name": "New York, New York, United States",
        }
        chicago = {
            "lat": 41.8781,
            "lon": -87.6298,
            "display_name": "Chicago, Illinois, United States",
        }
        la = {
            "lat": 34.0522,
            "lon": -118.2437,
            "display_name": "Los Angeles, California, United States",
        }

        leg1 = build_offline_route(nyc, chicago)
        leg2 = build_offline_route(chicago, la)
        total_miles = leg1["distance_miles"] + leg2["distance_miles"]
        combined_geometry = leg1["geometry"] + leg2["geometry"]

        trip = plan_trip(
            total_miles=total_miles,
            current_cycle_used=0.0,
            current_location=nyc["display_name"],
            pickup_location=chicago["display_name"],
            dropoff_location=la["display_name"],
            pickup_lat=chicago["lat"],
            pickup_lon=chicago["lon"],
            dropoff_lat=la["lat"],
            dropoff_lon=la["lon"],
            route_geometry=combined_geometry,
        )

        self.assertGreater(len(trip.stops), 0)
        self.assertGreater(len(trip.day_logs), 0)
        self.assertGreater(trip.total_driving_hours, 0)
        self.assertGreater(trip.total_trip_hours, trip.total_driving_hours)
        self.assertIn("total_miles", trip.summary)
        self.assertEqual(round(trip.summary["total_miles"], 1), round(total_miles, 1))
        self.assertTrue(any(stop.type == "dropoff" for stop in trip.stops))
        self.assertTrue(any(log.events for log in trip.day_logs))
