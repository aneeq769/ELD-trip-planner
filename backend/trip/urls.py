from django.urls import path
from . import views

urlpatterns = [
    path("trip/plan/", views.plan_trip_view, name="plan_trip"),
    path("health/", views.health_check, name="health"),
]
