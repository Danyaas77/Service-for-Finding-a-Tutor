from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_STUDENT = "student"
    ROLE_TEACHER = "teacher"
    ROLE_ADMIN = "admin"
    ROLE_CHOICES = [
        (ROLE_STUDENT, "Ученик"),
        (ROLE_TEACHER, "Преподаватель"),
        (ROLE_ADMIN, "Администратор"),
    ]

    username = models.CharField(max_length=150, unique=True)
    phone = models.CharField(max_length=20, unique=True)
    full_name = models.CharField(max_length=255)
    avatar_url = models.URLField(blank=True)
    avatar_file = models.FileField(upload_to="avatars/", blank=True, null=True)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default=ROLE_STUDENT)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    streak = models.PositiveIntegerField(default=0)
    lessons_total = models.PositiveIntegerField(default=0)
    months_learning = models.PositiveIntegerField(default=0)
    missed_lessons = models.PositiveIntegerField(default=0)
    is_onboarded = models.BooleanField(default=False)

    REQUIRED_FIELDS = ["phone", "full_name"]

    def __str__(self) -> str:
        return self.full_name


class Subject(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    icon_url = models.URLField(blank=True)

    def __str__(self) -> str:
        return self.name


class Teacher(models.Model):
    user = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="teacher_profile")
    full_name = models.CharField(max_length=255)
    avatar_url = models.URLField(blank=True)
    rating = models.DecimalField(max_digits=2, decimal_places=1, default=5)
    reviews_count = models.PositiveIntegerField(default=0)
    experience_years = models.PositiveIntegerField(default=0)
    grade_level = models.CharField(max_length=120, blank=True)
    bio = models.TextField(blank=True)
    education = models.TextField(blank=True)
    is_published = models.BooleanField(default=False)

    def __str__(self) -> str:
        return self.full_name


class TeacherAvailability(models.Model):
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name="availabilities")
    day = models.CharField(max_length=30)
    time = models.CharField(max_length=5)

    class Meta:
        unique_together = ("teacher", "day", "time")
        ordering = ["day", "time"]


class TeacherSubject(models.Model):
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name="subjects")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="teachers")
    price = models.PositiveIntegerField(default=2000)
    short_description = models.CharField(max_length=255, blank=True)
    special_offer = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ("teacher", "subject")


class Lesson(models.Model):
    STATUS_CHOICES = [
        ("upcoming", "Upcoming"),
        ("active", "Active"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="lessons")
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name="lessons")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=255)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="upcoming")
    meeting_url = models.URLField(blank=True)
    cancelled_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cancelled_lessons")
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["starts_at"]


class Review(models.Model):
    CATEGORY_DEFAULT = 5

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reviews")
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name="reviews")
    lesson = models.ForeignKey(Lesson, on_delete=models.SET_NULL, null=True, blank=True, related_name="reviews")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="reviews")
    text = models.TextField()
    rating = models.PositiveSmallIntegerField(default=5)
    clarity = models.PositiveSmallIntegerField(default=CATEGORY_DEFAULT)
    punctuality = models.PositiveSmallIntegerField(default=CATEGORY_DEFAULT)
    preparation = models.PositiveSmallIntegerField(default=CATEGORY_DEFAULT)
    teacher_reply = models.TextField(blank=True)
    status = models.CharField(max_length=20, default="published")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class Payment(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("failed", "Failed"),
    ]
    METHOD_CHOICES = [
        ("sbp", "SBP"),
        ("card", "Card"),
        ("sberpay", "SberPay"),
        ("tpay", "TPay"),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="payments")
    amount = models.PositiveIntegerField()
    bonus = models.PositiveIntegerField(default=0)
    promo_code = models.CharField(max_length=50, blank=True)
    email = models.EmailField()
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default="card")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="paid")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class Withdrawal(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("failed", "Failed"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="withdrawals")
    amount = models.PositiveIntegerField()
    card_number = models.CharField(max_length=32)
    card_holder = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="paid")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class Document(models.Model):
    TYPE_GENERAL = "general"
    TYPE_AGREEMENT = "agreement"
    TYPE_CHOICES = [
        (TYPE_GENERAL, "Обычный документ"),
        (TYPE_AGREEMENT, "Договор для онбординга"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="documents", blank=True, null=True)
    document_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_GENERAL)
    title = models.CharField(max_length=255)
    date = models.DateField()
    file_url = models.URLField(blank=True)
    file = models.FileField(upload_to="documents/", blank=True, null=True)
    size_label = models.CharField(max_length=50, default="PDF, 245 KB")

    class Meta:
        ordering = ["-date"]


class Notification(models.Model):
    SECTION_CHOICES = [
        ("Сегодня", "Сегодня"),
        ("Вчера", "Вчера"),
        ("Ранее", "Ранее"),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=255)
    message = models.TextField()
    created_at = models.DateTimeField()
    section = models.CharField(max_length=50, choices=SECTION_CHOICES, default="Сегодня")
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]


class VerificationCode(models.Model):
    phone = models.CharField(max_length=20, db_index=True)
    code = models.CharField(max_length=4)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class Achievement(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="achievements")
    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255)
    progress = models.PositiveIntegerField(default=0)
    target = models.PositiveIntegerField(default=100)
    completed = models.BooleanField(default=False)

    def __str__(self) -> str:
        return self.title
