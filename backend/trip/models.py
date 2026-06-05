from django.db import models


class TripPlan(models.Model):
    current_location = models.CharField(max_length=255)
    pickup_location = models.CharField(max_length=255)
    dropoff_location = models.CharField(max_length=255)
    current_cycle_used = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    total_miles = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total_days = models.PositiveIntegerField(default=0)
    total_driving_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    route = models.JSONField(default=dict, blank=True)
    stops = models.JSONField(default=list, blank=True)
    day_logs = models.JSONField(default=list, blank=True)
    summary = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.current_location} -> {self.dropoff_location}"
