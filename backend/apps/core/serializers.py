from datetime import datetime, timedelta
import json
import re

from rest_framework import serializers

from .models import Achievement, Document, Lesson, Notification, Payment, Review, Subject, Teacher, TeacherAvailability, TeacherSubject, User, Withdrawal

DEFAULT_AVATARS = {
    User.ROLE_STUDENT: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=400&q=80",
    User.ROLE_TEACHER: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    User.ROLE_ADMIN: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
}


class UserSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "full_name",
            "phone",
            "avatar_url",
            "role",
            "balance",
            "streak",
            "lessons_total",
            "months_learning",
            "missed_lessons",
            "is_onboarded",
        ]

    def get_avatar_url(self, obj):
        request = self.context.get("request")
        if obj.avatar_file:
            url = obj.avatar_file.url
            return request.build_absolute_uri(url) if request else url
        return obj.avatar_url


class ProfileUpdateSerializer(serializers.ModelSerializer):
    avatar = serializers.FileField(required=False, allow_null=True, write_only=True)
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, required=False)
    is_onboarded = serializers.BooleanField(required=False)
    publish_profile = serializers.BooleanField(required=False, write_only=True)
    teacher_bio = serializers.CharField(required=False, allow_blank=True, write_only=True)
    teacher_education = serializers.CharField(required=False, allow_blank=True, write_only=True)
    teacher_experience_years = serializers.IntegerField(required=False, min_value=0, write_only=True)
    teacher_grade_level = serializers.CharField(required=False, allow_blank=True, write_only=True)
    teacher_subjects = serializers.CharField(required=False, allow_blank=True, write_only=True)
    teacher_availabilities = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = [
            "full_name",
            "avatar",
            "role",
            "is_onboarded",
            "publish_profile",
            "teacher_bio",
            "teacher_education",
            "teacher_experience_years",
            "teacher_grade_level",
            "teacher_subjects",
            "teacher_availabilities",
        ]

    def validate_full_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Введите имя.")
        return value

    def validate_avatar(self, value):
        if not value:
            return value
        content_type = getattr(value, "content_type", "")
        if content_type and not content_type.startswith("image/"):
            raise serializers.ValidationError("Загрузите изображение.")
        return value

    def validate_teacher_subjects(self, value):
        if value in (None, ""):
            return []
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError as exc:
            raise serializers.ValidationError("Некорректный список предметов.") from exc
        if not isinstance(parsed, list):
            raise serializers.ValidationError("Некорректный список предметов.")

        normalized = []
        for item in parsed:
            if not isinstance(item, dict):
                raise serializers.ValidationError("Некорректный формат предмета.")
            subject_id = item.get("subject_id")
            price = item.get("price", 0)
            if not subject_id:
                raise serializers.ValidationError("Выберите предмет.")
            try:
                subject = Subject.objects.get(id=subject_id)
            except Subject.DoesNotExist as exc:
                raise serializers.ValidationError("Один из выбранных предметов не найден.") from exc
            try:
                price = int(price)
            except (TypeError, ValueError) as exc:
                raise serializers.ValidationError("Цена должна быть числом.") from exc
            if price <= 0:
                raise serializers.ValidationError("Цена должна быть больше нуля.")
            normalized.append(
                {
                    "subject": subject,
                    "price": price,
                    "short_description": str(item.get("short_description", "")).strip(),
                    "special_offer": str(item.get("special_offer", "")).strip(),
                }
            )
        return normalized

    def validate_teacher_availabilities(self, value):
        if value in (None, ""):
            return []
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError as exc:
            raise serializers.ValidationError("Некорректный список слотов.") from exc
        if not isinstance(parsed, list):
            raise serializers.ValidationError("Некорректный список слотов.")

        normalized = []
        seen = set()
        for item in parsed:
            if not isinstance(item, dict):
                raise serializers.ValidationError("Некорректный формат слота.")
            day = str(item.get("day", "")).strip()
            time = str(item.get("time", "")).strip()
            if not day or not time:
                raise serializers.ValidationError("Укажите день и время для каждого слота.")
            if not re.match(r"^\d{2}:\d{2}$", time):
                raise serializers.ValidationError("Время слота должно быть в формате ЧЧ:ММ.")
            key = (day, time)
            if key in seen:
                continue
            seen.add(key)
            normalized.append({"day": day, "time": time})
        return normalized

    def update(self, instance, validated_data):
        avatar = validated_data.pop("avatar", None)
        publish_profile = validated_data.pop("publish_profile", None)
        teacher_bio = validated_data.pop("teacher_bio", None)
        teacher_education = validated_data.pop("teacher_education", None)
        teacher_experience_years = validated_data.pop("teacher_experience_years", None)
        teacher_grade_level = validated_data.pop("teacher_grade_level", None)
        teacher_subjects = validated_data.pop("teacher_subjects", None)
        teacher_availabilities = validated_data.pop("teacher_availabilities", None)
        previous_role = instance.role
        instance.full_name = validated_data.get("full_name", instance.full_name)
        if "role" in validated_data:
            instance.role = validated_data["role"]
        if "is_onboarded" in validated_data:
            instance.is_onboarded = validated_data["is_onboarded"]
        if avatar:
            instance.avatar_file = avatar
        elif "role" in validated_data and not instance.avatar_file and (not instance.avatar_url or instance.avatar_url == DEFAULT_AVATARS.get(previous_role)):
            instance.avatar_url = DEFAULT_AVATARS.get(instance.role, DEFAULT_AVATARS[User.ROLE_STUDENT])
        instance.save()
        if instance.role == User.ROLE_TEACHER or publish_profile is not None:
            teacher, _ = Teacher.objects.get_or_create(
                user=instance,
                defaults={
                    "full_name": instance.full_name,
                    "avatar_url": instance.avatar_url,
                },
            )
            if teacher.full_name != instance.full_name:
                teacher.full_name = instance.full_name
            if instance.avatar_url and not teacher.avatar_url:
                teacher.avatar_url = instance.avatar_url
            teacher_fields = ["full_name", "avatar_url"]
            if teacher_bio is not None:
                teacher.bio = teacher_bio.strip()
                teacher_fields.append("bio")
            if teacher_education is not None:
                teacher.education = teacher_education.strip()
                teacher_fields.append("education")
            if teacher_experience_years is not None:
                teacher.experience_years = teacher_experience_years
                teacher_fields.append("experience_years")
            if teacher_grade_level is not None:
                teacher.grade_level = teacher_grade_level.strip()
                teacher_fields.append("grade_level")
            if publish_profile is not None:
                teacher.is_published = publish_profile
                teacher_fields.append("is_published")
            teacher.save(update_fields=list(dict.fromkeys(teacher_fields)))
            if teacher_subjects is not None:
                TeacherSubject.objects.filter(teacher=teacher).delete()
                TeacherSubject.objects.bulk_create(
                    [
                        TeacherSubject(
                            teacher=teacher,
                            subject=item["subject"],
                            price=item["price"],
                            short_description=item["short_description"],
                            special_offer=item["special_offer"],
                        )
                        for item in teacher_subjects
                    ]
                )
            if teacher_availabilities is not None:
                TeacherAvailability.objects.filter(teacher=teacher).delete()
                TeacherAvailability.objects.bulk_create(
                    [
                        TeacherAvailability(teacher=teacher, day=item["day"], time=item["time"])
                        for item in teacher_availabilities
                    ]
                )
        return instance


class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = ["id", "title", "subtitle", "progress", "target", "completed"]


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ["id", "name", "slug", "icon_url"]


class TeacherSubjectSerializer(serializers.ModelSerializer):
    subject = SubjectSerializer()

    class Meta:
        model = TeacherSubject
        fields = ["subject", "price", "short_description", "special_offer"]


class TeacherAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherAvailability
        fields = ["day", "time"]


class TeacherSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    subjects = TeacherSubjectSerializer(many=True)
    user_id = serializers.IntegerField(read_only=True)
    reviews = serializers.SerializerMethodField()
    schedule = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()

    class Meta:
        model = Teacher
        fields = [
            "id",
            "user_id",
            "full_name",
            "avatar_url",
            "rating",
            "reviews_count",
            "experience_years",
            "grade_level",
            "bio",
            "education",
            "subjects",
            "reviews",
            "schedule",
        ]

    def get_reviews(self, obj):
        reviews = obj.reviews.select_related("student").filter(status="published")[:10]
        return [
            {
                "id": review.id,
                "author": review.student.full_name,
                "text": review.text,
                "date": review.created_at.strftime("%d.%m.%Y"),
                "rating": review.rating,
            }
            for review in reviews
        ]

    def get_schedule(self, obj):
        schedule = {}
        for slot in obj.availabilities.all():
            schedule.setdefault(slot.day, []).append(slot.time)
        return schedule

    def get_avatar_url(self, obj):
        request = self.context.get("request")
        if obj.user and obj.user.avatar_file:
            url = obj.user.avatar_file.url
            return request.build_absolute_uri(url) if request else url
        if obj.user and obj.user.avatar_url:
            return obj.user.avatar_url
        return obj.avatar_url

    def get_rating(self, obj):
        reviews = obj.reviews.filter(status="published")
        if not reviews.exists():
            return 0
        return round(sum(review.rating for review in reviews) / reviews.count(), 1)

    def get_reviews_count(self, obj):
        return obj.reviews.filter(status="published").count()


class TeacherProfileStateSerializer(serializers.ModelSerializer):
    subjects = TeacherSubjectSerializer(many=True, read_only=True)
    availabilities = TeacherAvailabilitySerializer(many=True, read_only=True)
    schedule = serializers.SerializerMethodField()

    class Meta:
        model = Teacher
        fields = [
            "id",
            "full_name",
            "is_published",
            "bio",
            "education",
            "experience_years",
            "grade_level",
            "subjects",
            "availabilities",
            "schedule",
        ]

    def get_schedule(self, obj):
        schedule = {}
        for slot in obj.availabilities.all():
            schedule.setdefault(slot.day, []).append(slot.time)
        return schedule


class OnboardingPlanItemSerializer(serializers.Serializer):
    teacher_id = serializers.IntegerField()
    teacher_name = serializers.CharField()
    teacher_avatar = serializers.CharField()
    subject_name = serializers.CharField()
    price = serializers.IntegerField()


class LessonSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source="teacher.full_name", read_only=True)
    teacher_avatar = serializers.SerializerMethodField()
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_avatar = serializers.SerializerMethodField()
    counterparty_name = serializers.SerializerMethodField()
    counterparty_avatar = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    cancelled_by_role = serializers.SerializerMethodField()
    cancelled_by_name = serializers.CharField(source="cancelled_by.full_name", read_only=True)

    class Meta:
        model = Lesson
        fields = [
            "id",
            "title",
            "starts_at",
            "ends_at",
            "status",
            "meeting_url",
            "teacher_name",
            "teacher_avatar",
            "student_name",
            "student_avatar",
            "counterparty_name",
            "counterparty_avatar",
            "subject_name",
            "cancelled_by_role",
            "cancelled_by_name",
        ]

    def _build_avatar(self, user):
        request = self.context.get("request")
        if getattr(user, "avatar_file", None):
            url = user.avatar_file.url
            return request.build_absolute_uri(url) if request else url
        return getattr(user, "avatar_url", "")

    def get_teacher_avatar(self, obj):
        if obj.teacher.user:
            return self._build_avatar(obj.teacher.user)
        return obj.teacher.avatar_url

    def get_student_avatar(self, obj):
        return self._build_avatar(obj.student)

    def get_counterparty_name(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and user.role == User.ROLE_TEACHER:
            return obj.student.full_name
        return obj.teacher.full_name

    def get_counterparty_avatar(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and user.role == User.ROLE_TEACHER:
            return self._build_avatar(obj.student)
        if obj.teacher.user:
            return self._build_avatar(obj.teacher.user)
        return obj.teacher.avatar_url

    def get_cancelled_by_role(self, obj):
        if not obj.cancelled_by:
            return ""
        return obj.cancelled_by.role


class ReviewSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source="teacher.full_name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "teacher_name",
            "subject_name",
            "student_name",
            "text",
            "rating",
            "clarity",
            "punctuality",
            "preparation",
            "teacher_reply",
            "status",
            "created_at",
        ]


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "amount", "bonus", "promo_code", "email", "method", "status", "created_at"]


class WithdrawalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Withdrawal
        fields = ["id", "amount", "card_number", "card_holder", "status", "created_at"]


class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = ["id", "title", "document_type", "date", "file_url", "size_label"]

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file:
            url = obj.file.url
            return request.build_absolute_uri(url) if request else url
        return obj.file_url


class NotificationSerializer(serializers.ModelSerializer):
    section = serializers.CharField()

    class Meta:
        model = Notification
        fields = ["id", "title", "message", "created_at", "section", "is_read"]


class BookingCreateSerializer(serializers.Serializer):
    teacher_id = serializers.IntegerField()
    subject_slug = serializers.SlugField()
    day = serializers.CharField()
    time = serializers.RegexField(r"^\d{2}:\d{2}$")
    wishes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        teacher = Teacher.objects.filter(id=attrs["teacher_id"]).first()
        subject = Subject.objects.filter(slug=attrs["subject_slug"]).first()
        if not teacher:
            raise serializers.ValidationError({"teacher_id": "Преподаватель не найден."})
        if not subject:
            raise serializers.ValidationError({"subject_slug": "Предмет не найден."})
        if not TeacherSubject.objects.filter(teacher=teacher, subject=subject).exists():
            raise serializers.ValidationError({"subject_slug": "У преподавателя нет такого предмета."})
        if not TeacherAvailability.objects.filter(teacher=teacher, day=attrs["day"], time=attrs["time"]).exists():
            raise serializers.ValidationError({"time": "Этот слот недоступен у преподавателя."})
        attrs["teacher"] = teacher
        attrs["subject"] = subject
        return attrs

    def create(self, validated_data):
        weekday_map = {
            "Понедельник": 0,
            "Вторник": 1,
            "Среда": 2,
            "Четверг": 3,
            "Пятница": 4,
            "Суббота": 5,
            "Воскресенье": 6,
        }
        now = datetime.now().astimezone()
        target_weekday = weekday_map.get(validated_data["day"], now.weekday())
        days_ahead = (target_weekday - now.weekday()) % 7
        lesson_date = now + timedelta(days=days_ahead)
        hour, minute = [int(part) for part in validated_data["time"].split(":")]
        starts_at = lesson_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if starts_at <= now:
            starts_at += timedelta(days=7)
        ends_at = starts_at + timedelta(hours=1)
        if Lesson.objects.filter(
            teacher=validated_data["teacher"],
            starts_at=starts_at,
            ends_at=ends_at,
            status__in=["upcoming", "active"],
        ).exists():
            raise serializers.ValidationError({"time": "Этот слот уже занят. Выберите другое время."})
        return Lesson.objects.create(
            student=self.context["request"].user,
            teacher=validated_data["teacher"],
            subject=validated_data["subject"],
            title=validated_data["subject"].name,
            starts_at=starts_at,
            ends_at=ends_at,
            status="upcoming",
            meeting_url="",
        )


class PendingReviewSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    teacher_name = serializers.CharField()
    subject_name = serializers.CharField()
    lesson_title = serializers.CharField()
    lesson_date = serializers.CharField()


class AdminSummarySerializer(serializers.Serializer):
    users_total = serializers.IntegerField()
    students_total = serializers.IntegerField()
    teachers_total = serializers.IntegerField()
    lessons_total = serializers.IntegerField()
    pending_reviews_total = serializers.IntegerField()
    revenue_total = serializers.IntegerField()


class TeacherDashboardSerializer(serializers.Serializer):
    teacher = TeacherSerializer()
    lessons = LessonSerializer(many=True)
    reviews = ReviewSerializer(many=True)
