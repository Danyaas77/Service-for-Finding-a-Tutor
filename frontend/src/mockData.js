export const mockUser = {
  full_name: "Данил Колбасенко",
  phone: "+7 (999) 123-45-67",
  avatar_url:
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
  role: "Ученик",
  balance: 15000,
  streak: 12,
  lessons_total: 64,
  months_learning: 3,
  missed_lessons: 0,
};

export const mockLessons = [
  {
    id: 1,
    title: "Математика",
    subject_name: "Математика",
    teacher_name: "Иванова Марина Андреевна",
    teacher_avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
    starts_at: "2026-03-26T10:00:00+03:00",
    ends_at: "2026-03-26T11:00:00+03:00",
    status: "active",
    title_description: "Производные сложных функций",
    meeting_url: "#",
  },
  {
    id: 2,
    title: "Информатика",
    subject_name: "Информатика",
    teacher_name: "Иванова Марина Андреевна",
    teacher_avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
    starts_at: "2026-03-27T14:00:00+03:00",
    ends_at: "2026-03-27T15:00:00+03:00",
    status: "upcoming",
    title_description: "Вычислительные машины",
    meeting_url: "#",
  },
  {
    id: 3,
    title: "Математика",
    subject_name: "Математика",
    teacher_name: "Иванова Марина Андреевна",
    teacher_avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
    starts_at: "2026-03-28T15:00:00+03:00",
    ends_at: "2026-03-28T16:00:00+03:00",
    status: "upcoming",
    title_description: "Производные сложных функций",
    meeting_url: "#",
  },
  {
    id: 4,
    title: "Физика",
    subject_name: "Физика",
    teacher_name: "Козлов Игорь Петрович",
    teacher_avatar:
      "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=300&q=80",
    starts_at: "2026-03-29T12:00:00+03:00",
    ends_at: "2026-03-29T13:00:00+03:00",
    status: "completed",
    title_description: "Олимпиадная физика",
    meeting_url: "#",
  },
];

export const mockTutors = [
  {
    id: 1,
    full_name: "Ольга Сергеевна Иванова",
    avatar_url:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
    rating: 4.9,
    reviews_count: 127,
    experience_years: 12,
    bio: "Кандидат физико-математических наук. 12 лет преподавательского опыта. Индивидуальный подход к каждому ученику.",
    education:
      "МГУ, механико-математический факультет\nКандидатская диссертация по теории чисел",
    subjects: [
      {
        subject: { name: "Математика", slug: "math" },
        price: 2000,
        short_description: "Производные сложных функций",
        special_offer: "Первый урок бесплатно",
      },
      {
        subject: { name: "Информатика", slug: "cs" },
        price: 2000,
        short_description: "Вычислительные машины",
      },
    ],
    schedule: {
      "Понедельник": ["10:00", "14:00", "16:00", "18:00"],
      "Вторник": ["10:00", "14:00", "16:00", "18:00"],
      "Среда": ["10:00", "14:00", "16:00", "18:00"],
      "Четверг": ["10:00", "14:00", "16:00", "18:00"],
      "Пятница": ["10:00", "14:00", "16:00", "18:00"],
      "Суббота": ["10:00", "14:00", "16:00", "18:00"],
      "Воскресенье": [],
    },
    reviews: [
      { id: 201, author: "Мария И.", text: "Отличный преподаватель! Объясняет доступно и понятно.", date: "2 дня назад", rating: 5 },
      { id: 202, author: "Дмитрий К.", text: "Подготовили меня к ЕГЭ на 92 балла. Рекомендую!", date: "1 неделю назад", rating: 5 },
    ],
  },
  {
    id: 2,
    full_name: "Данил Дмитриевич Колбасенко",
    avatar_url:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80",
    rating: 4.9,
    reviews_count: 156,
    experience_years: 12,
    bio: "Senior-разработчик. Обучение Python, Java, C++. Подготовка к олимпиадам по информатике.",
    education: "ИТМО, факультет программной инженерии",
    subjects: [
      {
        subject: { name: "Информатика", slug: "cs" },
        price: 2200,
        short_description: "Python, Java, C++",
      },
    ],
    schedule: {
      "Понедельник": ["11:00", "15:00"],
      "Среда": ["11:00", "15:00"],
      "Пятница": ["11:00", "15:00"],
    },
    reviews: [
      { id: 203, author: "Артем Н.", text: "Сильный преподаватель по программированию.", date: "3 дня назад", rating: 5 },
    ],
  },
];

export const mockReviews = [
  {
    id: 1,
    teacher_name: "Ольга Сергеевна Иванова",
    subject_name: "Математика",
    student_name: "Мария И.",
    text: "Прекрасный преподаватель! За 3 месяца подняла мой уровень с тройки до пятёрки.",
    rating: 5,
    clarity: 5,
    punctuality: 5,
    preparation: 5,
    teacher_reply: "Спасибо, Александр! Рада, что тема стала понятной.",
    created_at: "2026-03-20T12:00:00+03:00",
  },
  {
    id: 2,
    teacher_name: "Ольга Сергеевна Иванова",
    subject_name: "Физика",
    student_name: "Дмитрий К.",
    text: "Лучший преподаватель физики. Объясняет сложные вещи простым языком.",
    rating: 5,
    clarity: 5,
    punctuality: 5,
    preparation: 5,
    teacher_reply: "",
    created_at: "2026-03-18T12:00:00+03:00",
  },
];

export const mockPendingReviews = [
  {
    id: 31,
    teacher_name: "Ольга Сергеевна Иванова",
    subject_name: "Математика",
    lesson_title: "Производные сложных функций",
    lesson_date: "1 день назад",
  },
  {
    id: 32,
    teacher_name: "Ольга Сергеевна Иванова",
    subject_name: "Математика",
    lesson_title: "Производные сложных функций",
    lesson_date: "2 дня назад",
  },
];

export const mockCommunityReviews = [
  {
    id: 41,
    subject_name: "Математика",
    student_name: "Мария И.",
    teacher_name: "Иванова М.А.",
    text: "Прекрасный преподаватель! За 3 месяца подняла мой уровень с тройки до пятёрки.",
    rating: 5,
    clarity: 5,
    punctuality: 5,
    preparation: 5,
    teacher_reply: "Спасибо, Александр! Рада, что тема стала понятной. На следующем уроке разберём интегралы.",
    created_at: "2026-03-20T12:00:00+03:00",
  },
  {
    id: 42,
    subject_name: "Физика",
    student_name: "Дмитрий К.",
    teacher_name: "Иванова М.А.",
    text: "Лучший преподаватель физики. Объясняет сложные вещи простым языком.",
    rating: 5,
    clarity: 5,
    punctuality: 5,
    preparation: 5,
    teacher_reply: "",
    created_at: "2026-03-19T12:00:00+03:00",
  },
];

export const mockDocuments = [
  { id: 1, title: "Политика конфиденциальности", date: "2025-09-15", size_label: "PDF, 245 KB" },
  { id: 2, title: "Согласие на обработку данных", date: "2025-09-15", size_label: "PDF, 245 KB" },
  { id: 3, title: "Акт за октябрь 2024", date: "2025-09-15", size_label: "PDF, 245 KB" },
  { id: 4, title: "Договор об оказании услуг", date: "2025-09-15", size_label: "PDF, 245 KB" },
];

export const mockNotifications = [
  { id: 1, title: "Урок по математике через 2 часа", message: "13:00", section: "Сегодня" },
  { id: 2, title: "Баланс скоро закончится, осталось на 1 урок", message: "Вчера", section: "Вчера" },
  { id: 3, title: "Баланс пополнен на 10 000 ₽", message: "20 нояб., 14:30", section: "Ранее" },
  { id: 4, title: "Урок по физике завершён", message: "19 нояб., 12:00", section: "Ранее" },
];

export const mockAchievements = [
  { id: 1, title: "Первый урок", subtitle: "Пройти первый урок", progress: 100, target: 100, completed: true },
  { id: 2, title: "На огне!", subtitle: "Посещать 10 уроков подряд", progress: 100, target: 100, completed: true },
  { id: 3, title: "Первый урок", subtitle: "Пройти первый урок", progress: 64, target: 100, completed: false },
];

export const onboardingPlan = [
  {
    id: "math",
    title: "Математика",
    teacher: "Алексей Петров",
    price: 2000,
    image:
      "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "cs",
    title: "Информатика",
    teacher: "Мария Иванова",
    price: 2000,
    image:
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=200&q=80",
  },
];
