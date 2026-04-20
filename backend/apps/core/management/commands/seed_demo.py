from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.core.models import Achievement, Document, Lesson, Notification, Review, Subject, Teacher, TeacherAvailability, TeacherSubject, User


class Command(BaseCommand):
    help = "Seed demo data for local development"

    def handle(self, *args, **options):
        user, _ = User.objects.get_or_create(
            phone="+79991234567",
            defaults={
                "username": "danil",
                "full_name": "Данил Колбасенко",
                "role": User.ROLE_STUDENT,
                "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
                "balance": 15000,
                "streak": 0,
                "lessons_total": 0,
                "months_learning": 0,
                "missed_lessons": 0,
                "is_onboarded": True,
            },
        )
        user.set_password("1234")
        user.role = User.ROLE_STUDENT
        user.streak = 0
        user.lessons_total = 0
        user.months_learning = 0
        user.missed_lessons = 0
        user.is_onboarded = True
        user.save()

        teacher_user, _ = User.objects.get_or_create(
            phone="+79990000001",
            defaults={
                "username": "teacher_olga",
                "full_name": "Ольга Сергеевна Иванова",
                "role": User.ROLE_TEACHER,
                "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
                "is_onboarded": True,
            },
        )
        teacher_user.set_password("1234")
        teacher_user.save()

        admin_user, _ = User.objects.get_or_create(
            phone="+79990000002",
            defaults={
                "username": "admin_oktiq",
                "full_name": "Администратор OKTIQ",
                "role": User.ROLE_ADMIN,
                "avatar_url": "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=300&q=80",
                "is_staff": True,
                "is_superuser": True,
                "is_onboarded": True,
            },
        )
        admin_user.set_password("1234")
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()

        math, _ = Subject.objects.get_or_create(name="Математика", slug="math", defaults={"icon_url": "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=200&q=80"})
        inf, _ = Subject.objects.get_or_create(name="Информатика", slug="cs", defaults={"icon_url": "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=200&q=80"})
        phys, _ = Subject.objects.get_or_create(name="Физика", slug="physics", defaults={"icon_url": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=200&q=80"})

        teacher1, _ = Teacher.objects.get_or_create(
            full_name="Ольга Сергеевна Иванова",
            defaults={
                "user": teacher_user,
                "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
                "rating": 4.9,
                "reviews_count": 127,
                "experience_years": 12,
                "grade_level": "Алгебра",
                "bio": "Кандидат физико-математических наук. Индивидуальный подход и подготовка к ЕГЭ.",
                "education": "МГУ, механико-математический факультет\nКандидатская диссертация по теории чисел",
                "is_published": True,
            },
        )
        if teacher1.user_id != teacher_user.id:
            teacher1.user = teacher_user
            teacher1.save(update_fields=["user"])
        if not teacher1.is_published:
            teacher1.is_published = True
            teacher1.save(update_fields=["is_published"])
        teacher2, _ = Teacher.objects.get_or_create(
            full_name="Данил Дмитриевич Колбасенко",
            defaults={
                "avatar_url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80",
                "rating": 4.9,
                "reviews_count": 156,
                "experience_years": 12,
                "grade_level": "Программирование",
                "bio": "Senior-разработчик. Обучение Python, Java, C++.",
                "education": "ИТМО, факультет программной инженерии",
                "is_published": True,
            },
        )
        if not teacher2.is_published:
            teacher2.is_published = True
            teacher2.save(update_fields=["is_published"])
        teacher3, _ = Teacher.objects.get_or_create(
            full_name="Игорь Петрович Козлов",
            defaults={
                "avatar_url": "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=300&q=80",
                "rating": 4.7,
                "reviews_count": 64,
                "experience_years": 10,
                "grade_level": "Физика",
                "bio": "Доцент кафедры физики. Олимпиадная подготовка.",
                "education": "МФТИ, кафедра общей физики",
                "is_published": True,
            },
        )
        if not teacher3.is_published:
            teacher3.is_published = True
            teacher3.save(update_fields=["is_published"])

        TeacherSubject.objects.get_or_create(teacher=teacher1, subject=math, defaults={"price": 2000, "short_description": "Производные сложных функций", "special_offer": "Первый урок бесплатно"})
        TeacherSubject.objects.get_or_create(teacher=teacher1, subject=inf, defaults={"price": 2000, "short_description": "Вычислительные машины"})
        TeacherSubject.objects.get_or_create(teacher=teacher2, subject=inf, defaults={"price": 2200, "short_description": "Python, Java, C++"})
        TeacherSubject.objects.get_or_create(teacher=teacher3, subject=phys, defaults={"price": 2500, "short_description": "Олимпиадная физика"})

        Lesson.objects.filter(student=user).delete()
        Review.objects.filter(student=user).delete()

        now = timezone.now()

        docs = [
            "Политика конфиденциальности",
            "Согласие на обработку данных",
            "Акт за октябрь 2024",
        ]
        for title in docs:
            Document.objects.get_or_create(
                user=user,
                title=title,
                date=date(2025, 9, 15),
                defaults={"file_url": "#", "document_type": Document.TYPE_GENERAL},
            )

        Document.objects.get_or_create(
            user=None,
            title="Договор об оказании услуг",
            date=date(2025, 9, 15),
            defaults={"file_url": "", "document_type": Document.TYPE_AGREEMENT},
        )

        Notification.objects.filter(user=user).delete()
        notifications = [
            ("Профиль готов к работе", "Выберите репетитора и запланируйте первый урок.", "Сегодня"),
        ]
        for idx, item in enumerate(notifications):
            Notification.objects.get_or_create(
                user=user,
                title=item[0],
                defaults={
                    "message": item[1],
                    "section": item[2],
                    "created_at": now - timedelta(days=idx),
                },
            )

        Achievement.objects.filter(user=user).delete()
        achievements = [
            ("Первый урок", "Пройти первый урок", 0, 100, False),
            ("На огне!", "Посещать 10 уроков подряд", 0, 100, False),
            ("Путь к цели", "Пройти 100 уроков", 0, 100, False),
        ]
        for title, subtitle, progress, target, completed in achievements:
            Achievement.objects.get_or_create(
                user=user,
                title=title,
                subtitle=subtitle,
                defaults={"progress": progress, "target": target, "completed": completed},
            )

        Achievement.objects.filter(user=teacher_user).delete()
        teacher_achievements = [
            ("Первые 10 уроков", "Провести 10 занятий", 0, 10, False),
        ]
        for title, subtitle, progress, target, completed in teacher_achievements:
            Achievement.objects.get_or_create(
                user=teacher_user,
                title=title,
                subtitle=subtitle,
                defaults={"progress": progress, "target": target, "completed": completed},
            )

        TeacherAvailability.objects.filter(teacher__in=[teacher1, teacher2, teacher3]).delete()
        for day, time in [("Понедельник", "10:00"), ("Среда", "14:00"), ("Пятница", "18:00")]:
            TeacherAvailability.objects.get_or_create(teacher=teacher1, day=day, time=time)
        for day, time in [("Вторник", "11:00"), ("Четверг", "16:00")]:
            TeacherAvailability.objects.get_or_create(teacher=teacher2, day=day, time=time)

        self.stdout.write(self.style.SUCCESS("Demo data seeded"))
