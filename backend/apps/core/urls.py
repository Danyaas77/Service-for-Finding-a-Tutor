from django.urls import path

from . import views

urlpatterns = [
    path("", views.api_root),
    path("auth/login/", views.login_with_password),
    path("auth/register/", views.register_with_password),
    path("me/", views.me),
    path("dashboard/", views.dashboard),
    path("profile/", views.profile),
    path("schedule/", views.schedule),
    path("tutors/", views.tutors),
    path("reviews/", views.reviews),
    path("reviews/collections/", views.review_collections),
    path("payments/", views.payments),
    path("payments/create/", views.create_payment),
    path("payments/withdraw/", views.create_withdrawal),
    path("bookings/create/", views.create_booking),
    path("lessons/<int:lesson_id>/", views.lesson_detail),
    path("lessons/<int:lesson_id>/cancel/", views.cancel_lesson),
    path("documents/", views.documents),
    path("notifications/", views.notifications),
    path("notifications/<int:notification_id>/", views.notification_detail),
    path("teacher/dashboard/", views.teacher_dashboard),
    path("admin/summary/", views.admin_summary),
]
