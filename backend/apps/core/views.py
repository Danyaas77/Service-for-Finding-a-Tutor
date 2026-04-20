from datetime import timedelta
from decimal import Decimal
from random import randint
import re

from django.conf import settings
from django.db.models import Q, Sum
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Achievement, Document, Lesson, Notification, Payment, Review, Subject, Teacher, User, VerificationCode, Withdrawal
from .permissions import IsAdminRole, IsTeacherRole
from .serializers import (
    AchievementSerializer,
    AdminSummarySerializer,
    BookingCreateSerializer,
    DEFAULT_AVATARS,
    DocumentSerializer,
    LessonSerializer,
    NotificationSerializer,
    OnboardingPlanItemSerializer,
    PendingReviewSerializer,
    PaymentSerializer,
    ProfileUpdateSerializer,
    ReviewSerializer,
    TeacherDashboardSerializer,
    TeacherProfileStateSerializer,
    TeacherSerializer,
    UserSerializer,
    WithdrawalSerializer,
)
def normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 10:
        digits = f"7{digits}"
    elif len(digits) == 11 and digits.startswith("8"):
        digits = "7" + digits[1:]
    if len(digits) < 11 or len(digits) > 15:
        return ""
    return f"+{digits}"


def create_phone_user(phone: str) -> User:
    username = f"user_{phone.replace('+', '')}"
    return User.objects.create(
        username=username,
        phone=phone,
        full_name="Новый пользователь",
        avatar_url=DEFAULT_AVATARS[User.ROLE_STUDENT],
        role=User.ROLE_STUDENT,
        is_onboarded=False,
    )


def computed_user_data(user: User, request=None) -> dict:
    if user.role == User.ROLE_TEACHER and hasattr(user, "teacher_profile"):
        lessons = Lesson.objects.filter(teacher=user.teacher_profile)
    else:
        lessons = Lesson.objects.filter(student=user)

    completed_lessons = lessons.filter(status="completed").order_by("-starts_at")
    streak = 0
    for lesson in completed_lessons:
        streak += 1
    first_completed = completed_lessons.order_by("starts_at").first()
    months_learning = 0
    if first_completed:
        delta_days = max((timezone.now().date() - first_completed.starts_at.date()).days, 0)
        months_learning = max(delta_days // 30, 1)

    data = UserSerializer(user, context={"request": request} if request else {}).data
    data["streak"] = streak
    data["lessons_total"] = completed_lessons.count()
    data["months_learning"] = months_learning
    data["missed_lessons"] = lessons.filter(status="missed").count()
    return data


def complete_expired_lessons(user: User | None = None):
    queryset = Lesson.objects.filter(status__in=["upcoming", "active"], ends_at__lt=timezone.now())
    if user:
        if user.role == User.ROLE_TEACHER and hasattr(user, "teacher_profile"):
            queryset = queryset.filter(teacher=user.teacher_profile)
        else:
            queryset = queryset.filter(student=user)
    return queryset.update(status="completed")


def ensure_teacher_profile(user: User):
    if user.role != User.ROLE_TEACHER:
        return None
    teacher, _ = Teacher.objects.get_or_create(
        user=user,
        defaults={
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
        },
    )
    updated_fields = []
    if teacher.full_name != user.full_name:
        teacher.full_name = user.full_name
        updated_fields.append("full_name")
    if teacher.avatar_url != user.avatar_url and user.avatar_url:
        teacher.avatar_url = user.avatar_url
        updated_fields.append("avatar_url")
    if updated_fields:
        teacher.save(update_fields=updated_fields)
    return teacher


def create_user_notification(user: User, title: str, message: str, created_at=None):
    Notification.objects.create(
        user=user,
        title=title,
        message=message,
        created_at=created_at or timezone.now(),
        section="Сегодня",
    )


def get_agreement_document(user: User, request):
    document = (
        Document.objects.filter(document_type=Document.TYPE_AGREEMENT, user__isnull=True)
        .order_by("-date", "-id")
        .first()
    )
    if not document and user:
        document = (
            Document.objects.filter(user=user)
            .filter(Q(title__icontains="договор") | Q(title__icontains="оферта"))
            .order_by("-date", "-id")
            .first()
        )
    if not document:
        return None
    return DocumentSerializer(document, context={"request": request}).data


def validate_registration_password(password: str) -> str | None:
    if len(password) < 8:
        return "Пароль должен содержать минимум 8 символов."
    if re.search(r"[А-Яа-яЁё]", password):
        return "Используйте только латиницу, цифры и специальные символы."
    if not re.search(r"[A-Za-z]", password):
        return "Пароль должен содержать хотя бы одну латинскую букву."
    if not re.search(r"\d", password):
        return "Пароль должен содержать хотя бы одну цифру."
    return None


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def api_root(request):
    return Response(
        {
            "name": "OKTIQ API",
            "version": "1.0",
            "auth": {
                "login": "/api/auth/login/",
                "register": "/api/auth/register/",
            },
            "protected_examples": [
                "/api/dashboard/",
                "/api/profile/",
                "/api/schedule/",
                "/api/tutors/",
                "/api/reviews/collections/",
                "/api/teacher/dashboard/",
                "/api/admin/summary/",
            ],
        }
    )


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login_with_password(request):
    phone = normalize_phone(request.data.get("phone", ""))
    password = request.data.get("password", "")
    if not phone:
        return Response({"detail": "Введите корректный номер телефона."}, status=status.HTTP_400_BAD_REQUEST)
    if not password:
        return Response({"detail": "Введите пароль."}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(phone=phone).first()
    if not user or not user.check_password(password):
        return Response({"detail": "Неверный номер телефона или пароль."}, status=status.HTTP_400_BAD_REQUEST)

    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": computed_user_data(user, request=request)})


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register_with_password(request):
    phone = normalize_phone(request.data.get("phone", ""))
    password = request.data.get("password", "")
    password_repeat = request.data.get("password_repeat", "")
    if not phone:
        return Response({"detail": "Введите корректный номер телефона."}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(phone=phone).exists():
        return Response({"detail": "Аккаунт уже существует. Войдите."}, status=status.HTTP_400_BAD_REQUEST)
    password_error = validate_registration_password(password)
    if password_error:
        return Response({"detail": password_error}, status=status.HTTP_400_BAD_REQUEST)
    if password != password_repeat:
        return Response({"detail": "Пароли не совпадают."}, status=status.HTTP_400_BAD_REQUEST)

    user = create_phone_user(phone)
    user.set_password(password)
    user.save(update_fields=["password"])
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": computed_user_data(user, request=request)}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def request_code(request):
    phone = normalize_phone(request.data.get("phone", ""))
    mode = request.data.get("mode", "login")
    if not phone:
        return Response({"detail": "Введите корректный номер телефона."}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(phone=phone).first()
    if mode == "login" and not user:
        return Response({"detail": "Аккаунт не найден. Зарегистрируйтесь."}, status=status.HTTP_404_NOT_FOUND)
    if mode == "register" and user:
        return Response({"detail": "Аккаунт уже существует. Войдите."}, status=status.HTTP_400_BAD_REQUEST)

    VerificationCode.objects.filter(phone=phone, is_used=False).update(is_used=True)
    code = "1234" if settings.DEBUG else f"{randint(0, 9999):04d}"
    verification = VerificationCode.objects.create(
        phone=phone,
        code=code,
        expires_at=timezone.now() + timedelta(minutes=5),
    )
    payload = {
        "detail": "Код отправлен",
        "cooldown": 59,
        "phone": phone,
        "is_new_user": not bool(user),
        "expires_at": verification.expires_at,
    }
    if settings.DEBUG:
        payload["debug_code"] = code
    return Response(payload)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def verify_code(request):
    phone = normalize_phone(request.data.get("phone", ""))
    code = request.data.get("code", "")
    mode = request.data.get("mode", "login")
    if not phone:
        return Response({"detail": "Введите корректный номер телефона."}, status=status.HTTP_400_BAD_REQUEST)

    verification = VerificationCode.objects.filter(phone=phone, is_used=False).order_by("-created_at").first()
    if not verification or verification.expires_at < timezone.now():
        return Response({"detail": "Код истек. Запросите новый код."}, status=status.HTTP_400_BAD_REQUEST)
    if verification.code != code:
        return Response({"detail": "Неверный код. Попробуйте ещё раз."}, status=status.HTTP_400_BAD_REQUEST)

    verification.is_used = True
    verification.save(update_fields=["is_used"])
    user = User.objects.filter(phone=phone).first()
    if mode == "register":
        if user:
            return Response({"detail": "Аккаунт уже существует. Войдите."}, status=status.HTTP_400_BAD_REQUEST)
        user = create_phone_user(phone)
    elif not user:
        return Response({"detail": "Аккаунт не найден. Зарегистрируйтесь."}, status=status.HTTP_404_NOT_FOUND)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": computed_user_data(user, request=request)})


@api_view(["GET"])
def me(request):
    complete_expired_lessons(request.user)
    return Response(computed_user_data(request.user, request=request))


@api_view(["GET"])
def dashboard(request):
    complete_expired_lessons(request.user)
    if request.user.role == User.ROLE_TEACHER and hasattr(request.user, "teacher_profile"):
        lessons = Lesson.objects.filter(teacher=request.user.teacher_profile)
    else:
        lessons = Lesson.objects.filter(student=request.user)
    upcoming = lessons.filter(status__in=["upcoming", "active"], ends_at__gte=timezone.now()).order_by("starts_at")[:3]
    achievements = Achievement.objects.filter(user=request.user)[:3]
    today = timezone.localdate()
    return Response(
        {
            "user": computed_user_data(request.user, request=request),
            "upcoming_lessons": LessonSerializer(upcoming, many=True, context={"request": request}).data,
            "achievements": AchievementSerializer(achievements, many=True).data,
            "lessons_today": lessons.filter(starts_at__date=today).exclude(status="cancelled").count(),
            "onboarding_plan": get_onboarding_plan(request),
            "agreement_document": get_agreement_document(request.user, request),
        }
    )


def get_onboarding_plan(request):
    published_teachers = Teacher.objects.filter(is_published=True).prefetch_related("subjects__subject", "user")[:4]
    items = []
    for teacher in published_teachers:
        for teacher_subject in teacher.subjects.all():
            avatar = teacher.avatar_url
            if teacher.user:
                if teacher.user.avatar_file:
                    avatar = request.build_absolute_uri(teacher.user.avatar_file.url)
                elif teacher.user.avatar_url:
                    avatar = teacher.user.avatar_url
            items.append(
                {
                    "teacher_id": teacher.id,
                    "teacher_name": teacher.full_name,
                    "teacher_avatar": avatar,
                    "subject_name": teacher_subject.subject.name,
                    "price": teacher_subject.price,
                }
            )
            if len(items) >= 3:
                return OnboardingPlanItemSerializer(items, many=True).data
    return OnboardingPlanItemSerializer(items, many=True).data


@api_view(["GET", "PATCH"])
def profile(request):
    complete_expired_lessons(request.user)
    if request.method == "PATCH":
        serializer = ProfileUpdateSerializer(instance=request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

    if request.user.role == User.ROLE_TEACHER and hasattr(request.user, "teacher_profile"):
        completed_count = Lesson.objects.filter(teacher=request.user.teacher_profile, status="completed").count()
        achievement, _ = Achievement.objects.get_or_create(
            user=request.user,
            title="Первые 10 уроков",
            defaults={"subtitle": "Провести 10 занятий", "progress": 0, "target": 10, "completed": False},
        )
        achievement.progress = min(completed_count, achievement.target)
        achievement.completed = completed_count >= achievement.target
        achievement.save(update_fields=["progress", "completed"])

    documents = Document.objects.filter(user=request.user)
    achievements = Achievement.objects.filter(user=request.user)
    teacher_profile = ensure_teacher_profile(request.user)
    return Response(
        {
            "user": computed_user_data(request.user, request=request),
            "documents": DocumentSerializer(documents, many=True, context={"request": request}).data,
            "achievements": AchievementSerializer(achievements, many=True).data,
            "teacher_profile": TeacherProfileStateSerializer(teacher_profile, context={"request": request}).data if teacher_profile else None,
            "agreement_document": get_agreement_document(request.user, request),
            "available_subjects": [
                {"id": subject.id, "name": subject.name, "slug": subject.slug}
                for subject in Subject.objects.order_by("name")
            ],
        }
    )


@api_view(["GET"])
def schedule(request):
    complete_expired_lessons(request.user)
    subject = request.GET.get("subject")
    if request.user.role == User.ROLE_TEACHER and hasattr(request.user, "teacher_profile"):
        queryset = Lesson.objects.filter(teacher=request.user.teacher_profile)
    else:
        queryset = Lesson.objects.filter(student=request.user)
    if subject and subject != "all":
        queryset = queryset.filter(subject__slug=subject)
    return Response(LessonSerializer(queryset, many=True, context={"request": request}).data)


@api_view(["GET"])
def tutors(request):
    query = request.GET.get("q")
    subject = request.GET.get("subject")
    min_price = request.GET.get("min_price")
    max_price = request.GET.get("max_price")
    queryset = Teacher.objects.prefetch_related("subjects__subject", "reviews__student", "availabilities").filter(is_published=True)
    if query:
        queryset = queryset.filter(
            Q(full_name__icontains=query)
            | Q(subjects__subject__name__icontains=query)
            | Q(subjects__short_description__icontains=query)
        ).distinct()
    if subject and subject != "all":
        queryset = queryset.filter(subjects__subject__slug=subject)
    if min_price:
        queryset = queryset.filter(subjects__price__gte=min_price)
    if max_price:
        queryset = queryset.filter(subjects__price__lte=max_price)
    return Response(TeacherSerializer(queryset, many=True, context={"request": request}).data)


@api_view(["GET", "POST"])
def reviews(request):
    complete_expired_lessons(request.user)
    if request.method == "GET":
        queryset = Review.objects.filter(student=request.user).select_related("teacher", "subject", "student")
        return Response(ReviewSerializer(queryset, many=True).data)

    lesson_id = request.data.get("lesson_id")
    lesson = Lesson.objects.filter(id=lesson_id, student=request.user).first()
    review = Review.objects.create(
        student=request.user,
        teacher=lesson.teacher if lesson else Teacher.objects.first(),
        lesson=lesson,
        subject=lesson.subject if lesson else Teacher.objects.first().subjects.first().subject,
        text=request.data.get("text", ""),
        rating=request.data.get("rating", 5),
        clarity=request.data.get("clarity", 5),
        punctuality=request.data.get("punctuality", 5),
        preparation=request.data.get("preparation", 5),
        status="published",
    )
    return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def review_collections(request):
    complete_expired_lessons(request.user)
    my_reviews = Review.objects.filter(student=request.user).select_related("teacher", "subject", "student")
    community_reviews = Review.objects.select_related("teacher", "subject", "student").filter(status="published")[:12]
    reviewed_lesson_ids = set(my_reviews.exclude(lesson__isnull=True).values_list("lesson_id", flat=True))
    pending_lessons = (
        Lesson.objects.filter(student=request.user, status="completed")
        .exclude(id__in=reviewed_lesson_ids)
        .select_related("teacher", "subject")[:12]
    )
    pending_data = [
        {
            "id": lesson.id,
            "teacher_name": lesson.teacher.full_name,
            "subject_name": lesson.subject.name,
            "lesson_title": lesson.title,
            "lesson_date": lesson.starts_at.strftime("%d.%m.%Y"),
        }
        for lesson in pending_lessons
    ]
    return Response(
        {
            "my": ReviewSerializer(my_reviews, many=True).data,
            "pending": PendingReviewSerializer(pending_data, many=True).data,
            "community": ReviewSerializer(community_reviews, many=True).data,
        }
    )


@api_view(["POST"])
def create_booking(request):
    serializer = BookingCreateSerializer(data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)
    lesson = serializer.save()
    create_user_notification(
        request.user,
        title=f"Урок записан: {lesson.subject.name}",
        message=f"Занятие с {lesson.teacher.full_name} запланировано на {lesson.starts_at.strftime('%d.%m %H:%M')}.",
        created_at=timezone.now(),
    )
    if lesson.teacher.user:
        create_user_notification(
            lesson.teacher.user,
            title="Новая запись на урок",
            message=f"{request.user.full_name} записался на {lesson.subject.name} {lesson.starts_at.strftime('%d.%m %H:%M')}.",
            created_at=timezone.now(),
        )
    return Response(LessonSerializer(lesson, context={"request": request}).data, status=status.HTTP_201_CREATED)


@api_view(["PATCH"])
def lesson_detail(request, lesson_id):
    lesson = Lesson.objects.filter(id=lesson_id).select_related("teacher__user", "student", "subject", "cancelled_by").first()
    if not lesson:
        return Response({"detail": "Урок не найден."}, status=status.HTTP_404_NOT_FOUND)

    teacher = getattr(request.user, "teacher_profile", None)
    is_teacher = request.user.role == User.ROLE_TEACHER and teacher and lesson.teacher_id == teacher.id
    is_student = lesson.student_id == request.user.id
    if not is_teacher and not is_student:
        return Response({"detail": "Нет доступа к этому уроку."}, status=status.HTTP_403_FORBIDDEN)

    updated_fields = []
    rescheduled = False

    if "starts_at" in request.data:
        if lesson.status == "completed":
            return Response({"detail": "Проведенное занятие уже нельзя перенести."}, status=status.HTTP_400_BAD_REQUEST)
        if lesson.status == "cancelled":
            return Response({"detail": "Отмененное занятие уже нельзя перенести."}, status=status.HTTP_400_BAD_REQUEST)

        starts_at = parse_datetime(str(request.data.get("starts_at", "")))
        if not starts_at:
            return Response({"detail": "Введите корректные дату и время урока."}, status=status.HTTP_400_BAD_REQUEST)
        if timezone.is_naive(starts_at):
            starts_at = timezone.make_aware(starts_at, timezone.get_current_timezone())
        starts_at = starts_at.astimezone(timezone.get_current_timezone())
        if starts_at <= timezone.now():
            return Response({"detail": "Нельзя перенести урок в прошлое."}, status=status.HTTP_400_BAD_REQUEST)

        ends_at = starts_at + timedelta(hours=1)
        slot_is_busy = Lesson.objects.filter(
            teacher=lesson.teacher,
            status__in=["upcoming", "active"],
            starts_at__lt=ends_at,
            ends_at__gt=starts_at,
        ).exclude(id=lesson.id).exists()
        if slot_is_busy:
            return Response({"detail": "У преподавателя уже есть урок на это время."}, status=status.HTTP_400_BAD_REQUEST)

        lesson.starts_at = starts_at
        lesson.ends_at = ends_at
        updated_fields.extend(["starts_at", "ends_at"])
        rescheduled = True

    if is_teacher and "meeting_url" in request.data:
        meeting_url = request.data.get("meeting_url", "").strip()
        lesson.meeting_url = meeting_url
        updated_fields.append("meeting_url")

    if not updated_fields:
        return Response({"detail": "Нет данных для обновления."}, status=status.HTTP_400_BAD_REQUEST)

    lesson.save(update_fields=updated_fields)

    if rescheduled:
        lesson_time = lesson.starts_at.strftime("%d.%m %H:%M")
        if is_teacher:
            create_user_notification(
                lesson.student,
                title="Занятие перенесено",
                message=f"{lesson.teacher.full_name} перенес занятие по {lesson.subject.name} на {lesson_time}.",
            )
        elif lesson.teacher.user:
            create_user_notification(
                lesson.teacher.user,
                title="Занятие перенесено",
                message=f"{lesson.student.full_name} перенес занятие по {lesson.subject.name} на {lesson_time}.",
            )
        create_user_notification(
            request.user,
            title="Занятие перенесено",
            message=f"Занятие по {lesson.subject.name} перенесено на {lesson_time}.",
        )

    return Response(LessonSerializer(lesson, context={"request": request}).data)


@api_view(["POST"])
def cancel_lesson(request, lesson_id):
    lesson = Lesson.objects.filter(id=lesson_id).select_related("teacher__user", "student", "subject").first()
    if not lesson:
        return Response({"detail": "Урок не найден."}, status=status.HTTP_404_NOT_FOUND)

    teacher = getattr(request.user, "teacher_profile", None)
    is_teacher = request.user.role == User.ROLE_TEACHER and teacher and lesson.teacher_id == teacher.id
    is_student = lesson.student_id == request.user.id
    if not is_teacher and not is_student:
        return Response({"detail": "Нет доступа к этому уроку."}, status=status.HTTP_403_FORBIDDEN)

    if lesson.status == "completed":
        return Response({"detail": "Проведенное занятие уже нельзя отменить."}, status=status.HTTP_400_BAD_REQUEST)
    if lesson.status == "cancelled":
        return Response({"detail": "Занятие уже отменено."}, status=status.HTTP_400_BAD_REQUEST)

    lesson.status = "cancelled"
    lesson.cancelled_by = request.user
    lesson.cancelled_at = timezone.now()
    lesson.save(update_fields=["status", "cancelled_by", "cancelled_at"])

    lesson_time = lesson.starts_at.strftime("%d.%m %H:%M")
    if is_teacher:
        create_user_notification(
            lesson.student,
            title="Занятие отменено",
            message=f"{lesson.teacher.full_name} отменил занятие по {lesson.subject.name} {lesson_time}.",
        )
    elif lesson.teacher.user:
        create_user_notification(
            lesson.teacher.user,
            title="Занятие отменено",
            message=f"{lesson.student.full_name} отменил занятие по {lesson.subject.name} {lesson_time}.",
        )

    create_user_notification(
        request.user,
        title="Занятие отменено",
        message=f"Занятие по {lesson.subject.name} {lesson_time} отменено.",
    )
    return Response(LessonSerializer(lesson, context={"request": request}).data)


@api_view(["POST"])
def create_payment(request):
    amount = int(request.data.get("amount", 0))
    promo_code = request.data.get("promo_code", "").strip().lower()
    bonus = 0
    if promo_code == "деп":
        bonus = amount // 10
    payment = Payment.objects.create(
        user=request.user,
        amount=amount,
        bonus=bonus,
        promo_code=promo_code,
        email=request.data.get("email", ""),
        method=request.data.get("method", "card"),
        status="paid",
    )
    request.user.balance = Decimal(request.user.balance) + Decimal(amount + bonus)
    request.user.save(update_fields=["balance"])
    create_user_notification(
        request.user,
        title=f"Баланс пополнен на {payment.amount} ₽",
        message="Платеж успешно зачислен.",
        created_at=payment.created_at,
    )
    return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
def create_withdrawal(request):
    if request.user.role != User.ROLE_TEACHER:
        return Response({"detail": "Вывод доступен только преподавателям."}, status=status.HTTP_403_FORBIDDEN)

    amount = int(request.data.get("amount", 0))
    card_number = re.sub(r"\D", "", request.data.get("card_number", ""))
    card_holder = request.data.get("card_holder", "").strip()

    if amount <= 0:
        return Response({"detail": "Введите корректную сумму для вывода."}, status=status.HTTP_400_BAD_REQUEST)
    if Decimal(request.user.balance) < Decimal(amount):
        return Response({"detail": "Недостаточно средств для вывода."}, status=status.HTTP_400_BAD_REQUEST)
    if len(card_number) < 16:
        return Response({"detail": "Введите корректный номер карты."}, status=status.HTTP_400_BAD_REQUEST)

    withdrawal = Withdrawal.objects.create(
        user=request.user,
        amount=amount,
        card_number=card_number,
        card_holder=card_holder,
        status="paid",
    )
    request.user.balance = Decimal(request.user.balance) - Decimal(amount)
    request.user.save(update_fields=["balance"])
    Notification.objects.create(
        user=request.user,
        title=f"Вывод средств на {amount} ₽",
        message="Деньги отправлены на указанную карту.",
        created_at=timezone.now(),
        section="Сегодня",
    )
    return Response(WithdrawalSerializer(withdrawal).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def payments(request):
    return Response(PaymentSerializer(Payment.objects.filter(user=request.user), many=True).data)


@api_view(["GET"])
def documents(request):
    queryset = Document.objects.filter(Q(user=request.user) | Q(document_type=Document.TYPE_AGREEMENT, user__isnull=True))
    return Response(DocumentSerializer(queryset, many=True, context={"request": request}).data)


@api_view(["GET"])
def notifications(request):
    return Response(NotificationSerializer(Notification.objects.filter(user=request.user), many=True).data)


@api_view(["DELETE"])
def notification_detail(request, notification_id):
    notification = Notification.objects.filter(id=notification_id, user=request.user).first()
    if not notification:
        return Response({"detail": "Уведомление не найдено."}, status=status.HTTP_404_NOT_FOUND)
    notification.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsTeacherRole])
def teacher_dashboard(request):
    complete_expired_lessons(request.user)
    teacher = getattr(request.user, "teacher_profile", None)
    if not teacher:
        return Response({"detail": "Профиль преподавателя не найден."}, status=status.HTTP_404_NOT_FOUND)
    lessons = Lesson.objects.filter(teacher=teacher).select_related("student", "subject")[:10]
    reviews = Review.objects.filter(teacher=teacher).select_related("student", "subject")[:10]
    payload = {
        "teacher": TeacherSerializer(teacher, context={"request": request}).data,
        "lessons": LessonSerializer(lessons, many=True, context={"request": request}).data,
        "reviews": ReviewSerializer(reviews, many=True).data,
    }
    return Response(TeacherDashboardSerializer(payload).data)


@api_view(["GET"])
@permission_classes([IsAdminRole])
def admin_summary(request):
    complete_expired_lessons()
    users_total = User.objects.count()
    students_total = User.objects.filter(role=User.ROLE_STUDENT).count()
    teachers_total = User.objects.filter(role=User.ROLE_TEACHER).count()
    lessons_total = Lesson.objects.count()
    pending_reviews_total = Lesson.objects.filter(status="completed").count() - Review.objects.exclude(lesson__isnull=True).count()
    revenue_total = Payment.objects.filter(status="paid").aggregate(total=Sum("amount")).get("total") or 0
    payload = {
        "users_total": users_total,
        "students_total": students_total,
        "teachers_total": teachers_total,
        "lessons_total": lessons_total,
        "pending_reviews_total": max(pending_reviews_total, 0),
        "revenue_total": revenue_total,
    }
    return Response(AdminSummarySerializer(payload).data)
