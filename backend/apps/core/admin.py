from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Achievement, Document, Lesson, Notification, Payment, Review, Subject, Teacher, TeacherAvailability, TeacherSubject, User, VerificationCode, Withdrawal


class TeacherSubjectInline(admin.TabularInline):
    model = TeacherSubject
    extra = 0


class TeacherAvailabilityInline(admin.TabularInline):
    model = TeacherAvailability
    extra = 0


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    model = User
    list_display = ("username", "full_name", "phone", "role", "balance", "is_onboarded", "is_staff")
    list_filter = ("role", "is_onboarded", "is_staff", "is_superuser")
    search_fields = ("username", "full_name", "phone")
    ordering = ("username",)
    fieldsets = DjangoUserAdmin.fieldsets + (
        (
            "School",
            {
                "fields": (
                    "phone",
                    "full_name",
                    "avatar_url",
                    "avatar_file",
                    "role",
                    "balance",
                    "streak",
                    "lessons_total",
                    "months_learning",
                    "missed_lessons",
                    "is_onboarded",
                )
            },
        ),
    )


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ("full_name", "user", "is_published", "rating", "reviews_count", "experience_years")
    search_fields = ("full_name", "education", "bio")
    list_filter = ("is_published", "experience_years")
    inlines = [TeacherSubjectInline, TeacherAvailabilityInline]
    autocomplete_fields = ("user",)


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name", "slug")


@admin.register(TeacherSubject)
class TeacherSubjectAdmin(admin.ModelAdmin):
    list_display = ("teacher", "subject", "price", "special_offer")
    list_filter = ("subject",)
    search_fields = ("teacher__full_name", "subject__name")
    autocomplete_fields = ("teacher", "subject")


@admin.register(TeacherAvailability)
class TeacherAvailabilityAdmin(admin.ModelAdmin):
    list_display = ("teacher", "day", "time")
    search_fields = ("teacher__full_name", "day", "time")
    autocomplete_fields = ("teacher",)


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ("title", "student", "teacher", "subject", "starts_at", "status")
    list_filter = ("status", "subject")
    search_fields = ("title", "student__full_name", "teacher__full_name")
    autocomplete_fields = ("student", "teacher", "subject")


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("teacher", "student", "subject", "rating", "status", "created_at")
    list_filter = ("status", "subject", "rating")
    search_fields = ("teacher__full_name", "student__full_name", "text")
    autocomplete_fields = ("student", "teacher", "lesson", "subject")


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("user", "amount", "bonus", "method", "status", "created_at")
    list_filter = ("method", "status")
    search_fields = ("user__full_name", "email", "promo_code")
    autocomplete_fields = ("user",)


@admin.register(Withdrawal)
class WithdrawalAdmin(admin.ModelAdmin):
    list_display = ("user", "amount", "card_number", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("user__full_name", "card_number", "card_holder")
    autocomplete_fields = ("user",)


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "document_type", "user", "date", "size_label", "file")
    list_filter = ("document_type", "date")
    search_fields = ("title", "user__full_name")
    autocomplete_fields = ("user",)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "section", "is_read", "created_at")
    list_filter = ("section", "is_read")
    search_fields = ("title", "message", "user__full_name")
    autocomplete_fields = ("user",)


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "progress", "target", "completed")
    list_filter = ("completed",)
    search_fields = ("title", "user__full_name")
    autocomplete_fields = ("user",)


@admin.register(VerificationCode)
class VerificationCodeAdmin(admin.ModelAdmin):
    list_display = ("phone", "code", "expires_at", "is_used", "created_at")
    list_filter = ("is_used",)
    search_fields = ("phone", "code")
