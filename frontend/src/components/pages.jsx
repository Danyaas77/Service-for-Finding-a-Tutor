import { Camera, Check, ChevronLeft, ChevronRight, FileText, LogOut, Pencil, Shield } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatCurrency, formatShortDateTime, formatTime } from "../utils";

const WEEK_DAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
const TIME_SLOTS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

function pluralizeLessons(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "урок";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "урока";
  return "уроков";
}

function formatRole(role) {
  if (role === "student") return "Ученик";
  if (role === "teacher") return "Преподаватель";
  if (role === "admin") return "Администратор";
  return role;
}

function getLessonStatusLabel(status) {
  if (status === "active") return "Сегодня";
  if (status === "completed") return "Проведен";
  if (status === "cancelled") return "Отменено";
  return "Запланирован";
}

function getLessonStatusText(lesson) {
  if (lesson.status === "cancelled" && lesson.cancelled_by_role === "teacher") return "Отменено преподавателем";
  if (lesson.status === "cancelled" && lesson.cancelled_by_role === "student") return "Отменено учеником";
  return getLessonStatusLabel(lesson.status);
}

function normalizeTeacherSubjects(subjects = []) {
  return subjects.map((item) => ({
    subject_id: item.subject.id,
    subject_name: item.subject.name,
    price: String(item.price ?? 2000),
    short_description: item.short_description || "",
    special_offer: item.special_offer || "",
  }));
}

function normalizeTeacherAvailabilities(availabilities = []) {
  return availabilities.map((item) => ({ day: item.day, time: item.time }));
}

function groupLessonsByDate(lessons) {
  return lessons.reduce((accumulator, lesson) => {
    const dateKey = new Date(lesson.starts_at).toLocaleDateString("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    if (!accumulator[dateKey]) accumulator[dateKey] = [];
    accumulator[dateKey].push(lesson);
    return accumulator;
  }, {});
}

function startOfWeek(date) {
  const result = new Date(date);
  const day = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfWeek(date) {
  const result = new Date(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getWeekColumns(lessons, weekStart) {
  return Array.from({ length: 7 }, (_, index) => {
    const columnDate = addDays(weekStart, index);
    const key = columnDate.toDateString();
    return {
      label: columnDate.toLocaleDateString("ru-RU", { weekday: "short" }),
      dayNumber: columnDate.getDate(),
      lessons: lessons.filter((lesson) => new Date(lesson.starts_at).toDateString() === key),
    };
  });
}

function formatWeekRange(weekStart) {
  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  if (sameMonth) {
    return `${weekStart.getDate()}–${weekEnd.getDate()} ${weekStart.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}`;
  }
  return `${weekStart.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })} – ${weekEnd.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}`;
}

export function HomePage({ dashboard, user, setActivePage, setSelectedLesson, onCopyLessonLink }) {
  const isTeacher = user?.role === "teacher";
  return (
    <>
      <section className="hero">
        <div>
          <h1>Добро пожаловать, {user?.full_name?.split(" ")[0]}!</h1>
          <p>Сегодня у вас {dashboard.lessons_today} {pluralizeLessons(dashboard.lessons_today)}. Хорошего дня</p>
        </div>
      </section>
      <section className="grid-home">
        <div className="card lessons-card">
          <div className="section-head">
            <h2>Ваши ближайшие уроки</h2>
            <button className="link-button" onClick={() => setActivePage("schedule")}>
              Расписание
            </button>
          </div>
          {dashboard.upcoming_lessons.length ? (
            <div className="lesson-grid">
              {dashboard.upcoming_lessons.map((lesson) => (
                <article key={lesson.id} className="lesson-preview clickable-card" onClick={() => setSelectedLesson(lesson)}>
                  <img src={lesson.counterparty_avatar} alt={lesson.counterparty_name} />
                  <div className={`lesson-label ${lesson.status}`}>{getLessonStatusText(lesson)}</div>
                  <h3>{lesson.subject_name}</h3>
                  <p>{lesson.counterparty_name}</p>
                  <span>{formatShortDateTime(lesson.starts_at)}</span>
                  <button
                    className={!isTeacher && lesson.meeting_url && lesson.status !== "cancelled" ? "primary-button small" : "secondary-button small"}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (lesson.status === "cancelled") return;
                      if (isTeacher) {
                        setSelectedLesson(lesson);
                        return;
                      }
                      if (lesson.meeting_url) {
                        window.open(lesson.meeting_url, "_blank", "noopener,noreferrer");
                      }
                    }}
                    disabled={lesson.status === "cancelled" || (!isTeacher && !lesson.meeting_url)}
                  >
                    {lesson.status === "cancelled" ? "Отменено" : isTeacher ? "Открыть урок" : lesson.meeting_url ? "Открыть урок" : "Ожидайте ссылку"}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>{isTeacher ? "Дождитесь первого занятия." : "Запланируйте первый урок"}</h3>
              <p>{isTeacher ? "Сейчас ближайших уроков нет." : "Сейчас ближайших уроков нет. Выберите репетитора и создайте первое занятие."}</p>
              {!isTeacher && (
                <button className="primary-button small" onClick={() => setActivePage("tutors")}>
                  Найти репетитора
                </button>
              )}
            </div>
          )}
        </div>
        <SideCards user={user} setActivePage={setActivePage} />
      </section>
    </>
  );
}

function SideCards({ user, setActivePage }) {
  const isTeacher = user?.role === "teacher";

  return (
    <div className="side-stack">
      <div className="balance-card">
        <span>Текущий баланс</span>
        <strong>{formatCurrency(user.balance)} ₽</strong>
        <button className="dark-button" onClick={() => setActivePage("payment")}>
          {isTeacher ? "Открыть кабинет" : "Пополнить баланс"}
        </button>
      </div>
      {!isTeacher && (
        <div className="streak-card">
          <div>
            <h3>Ударный режим</h3>
            <p>Занятия без отмен и пропусков</p>
          </div>
          <div className="streak-badge">{user.streak}</div>
        </div>
      )}
    </div>
  );
}

export function ProfilePage({ profile, user, setActivePage, onShowDocuments, onLogout, onSaveProfile, profileEditError, setProfileEditError }) {
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user.full_name);
  const [avatarFile, setAvatarFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [teacherForm, setTeacherForm] = useState({
    bio: "",
    education: "",
    experience_years: 0,
    grade_level: "",
    subjects: [],
    availabilities: [],
  });
  const [isSavingTeacher, setIsSavingTeacher] = useState(false);

  useEffect(() => {
    setFullName(user.full_name);
  }, [user.full_name]);

  useEffect(() => {
    if (profile.teacher_profile) {
      setTeacherForm({
        bio: profile.teacher_profile.bio || "",
        education: profile.teacher_profile.education || "",
        experience_years: profile.teacher_profile.experience_years || 0,
        grade_level: profile.teacher_profile.grade_level || "",
        subjects: normalizeTeacherSubjects(profile.teacher_profile.subjects),
        availabilities: normalizeTeacherAvailabilities(profile.teacher_profile.availabilities),
      });
    }
  }, [profile.teacher_profile]);

  const avatarPreview = useMemo(() => {
    if (!avatarFile) {
      return user.avatar_url;
    }
    return URL.createObjectURL(avatarFile);
  }, [avatarFile, user.avatar_url]);

  useEffect(() => {
    return () => {
      if (avatarFile) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarFile, avatarPreview]);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await onSaveProfile({ full_name: fullName, avatar: avatarFile });
      setAvatarFile(null);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  const roleLabel = formatRole(user.role);
  const teacherProfile = profile.teacher_profile;
  const isTeacher = user.role === "teacher";
  const isPublished = Boolean(teacherProfile?.is_published);
  const availableSubjects = profile.available_subjects || [];

  async function handleTogglePublication() {
    if (!isTeacher) return;
    setIsPublishing(true);
    try {
      await onSaveProfile({ publish_profile: !isPublished });
    } finally {
      setIsPublishing(false);
    }
  }

  function handleTeacherSubjectToggle(subject) {
    setTeacherForm((prev) => {
      const exists = prev.subjects.some((item) => item.subject_id === subject.id);
      return {
        ...prev,
        subjects: exists
          ? prev.subjects.filter((item) => item.subject_id !== subject.id)
          : [
              ...prev.subjects,
              {
                subject_id: subject.id,
                subject_name: subject.name,
                price: "2000",
                short_description: "",
                special_offer: "",
              },
            ],
      };
    });
  }

  function handleTeacherSubjectField(subjectId, field, value) {
    setTeacherForm((prev) => ({
      ...prev,
      subjects: prev.subjects.map((item) => (item.subject_id === subjectId ? { ...item, [field]: value } : item)),
    }));
  }

  function handleAvailabilityToggle(day, time) {
    setTeacherForm((prev) => {
      const exists = prev.availabilities.some((item) => item.day === day && item.time === time);
      const next = exists
        ? prev.availabilities.filter((item) => !(item.day === day && item.time === time))
        : [...prev.availabilities, { day, time }];
      next.sort((a, b) => WEEK_DAYS.indexOf(a.day) - WEEK_DAYS.indexOf(b.day) || a.time.localeCompare(b.time));
      return { ...prev, availabilities: next };
    });
  }

  async function handleTeacherProfileSave(event) {
    event.preventDefault();
    setIsSavingTeacher(true);
    try {
      await onSaveProfile({
        teacher_bio: teacherForm.bio,
        teacher_education: teacherForm.education,
        teacher_experience_years: Number(teacherForm.experience_years || 0),
        teacher_grade_level: teacherForm.grade_level,
        teacher_subjects: teacherForm.subjects.map((item) => ({
          subject_id: item.subject_id,
          price: Number(item.price || 0),
          short_description: item.short_description,
          special_offer: item.special_offer,
        })),
        teacher_availabilities: teacherForm.availabilities,
      });
    } finally {
      setIsSavingTeacher(false);
    }
  }

  return (
    <>
      <section className="hero">
        <h1>Мой профиль</h1>
      </section>
      <section className="profile-layout">
        <div className="card profile-card">
          <div className="profile-avatar-wrap">
            <img className="profile-avatar" src={avatarPreview} alt={user.full_name} />
            {isEditing && (
              <label className="avatar-upload-button">
                <Camera size={16} /> Загрузить фото
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setAvatarFile(file);
                    if (profileEditError) {
                      setProfileEditError("");
                    }
                  }}
                />
              </label>
            )}
          </div>
          <div className="profile-main">
            <div className="profile-row">
              <div className="profile-edit-block">
                {isEditing ? (
                  <form className="profile-edit-form" onSubmit={handleSubmit}>
                    <label>
                      <span className="input-label">Имя</span>
                      <input
                        className={`input ${profileEditError ? "error" : ""}`}
                        value={fullName}
                        onChange={(event) => {
                          if (profileEditError) {
                            setProfileEditError("");
                          }
                          setFullName(event.target.value);
                        }}
                      />
                    </label>
                    <div className="profile-edit-actions">
                      <button type="submit" className="primary-button small" disabled={isSaving}>
                        {isSaving ? "Сохраняем..." : "Сохранить"}
                      </button>
                      <button
                        type="button"
                        className="secondary-button small"
                        onClick={() => {
                          setIsEditing(false);
                          setFullName(user.full_name);
                          setAvatarFile(null);
                          setProfileEditError("");
                        }}
                      >
                        Отмена
                      </button>
                    </div>
                    {profileEditError && <small className="field-error">{profileEditError}</small>}
                  </form>
                ) : (
                  <div className="profile-identity">
                    <h2>{user.full_name}</h2>
                    <p>{user.phone}</p>
                    <div className="profile-identity-actions">
                      <button className="secondary-button small profile-edit-toggle" onClick={() => setIsEditing(true)}>
                        <Pencil size={16} /> Редактировать профиль
                      </button>
                      {isTeacher && (
                        <button className={`small ${isPublished ? "secondary-button" : "primary-button"} profile-publish-toggle`} onClick={handleTogglePublication} disabled={isPublishing}>
                          {isPublishing ? "Сохраняем..." : isPublished ? "Снять анкету" : "Опубликовать анкету"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <span className="tag">{roleLabel}</span>
            </div>
            <div className="stats-row">
              <div className="stat-box">
                <strong>{user.lessons_total}</strong>
                <span>{isTeacher ? "Проведенные занятия" : "Урока всего пройдено"}</span>
              </div>
              <div className="stat-box">
                <strong>{user.months_learning}</strong>
                <span>{isTeacher ? "Месяца работы" : "Месяца подготовки"}</span>
              </div>
              {!isTeacher ? (
                <div className="stat-box">
                  <strong>{user.missed_lessons}</strong>
                  <span>Пропущенных занятий</span>
                </div>
              ) : (
                <div className="stat-box">
                  <strong>{teacherForm.subjects.length}</strong>
                  <span>Активных предметов</span>
                </div>
              )}
              {!isTeacher ? (
                <div className="stat-box accent">
                  <strong>{user.streak}</strong>
                  <span>Ударный режим</span>
                </div>
              ) : (
                <div className="stat-box">
                  <strong>{teacherForm.availabilities.length}</strong>
                  <span>Свободных слотов</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="side-stack">
          <div className="balance-card">
            <span>Текущий баланс</span>
            <strong>{formatCurrency(user.balance)} ₽</strong>
            <button className="dark-button" onClick={() => setActivePage("payment")}>
              Пополнить баланс
            </button>
          </div>
          <div className="card compact-list">
            <button className="list-link" onClick={onShowDocuments}>
              <FileText size={18} /> Договор и документы
            </button>
            <button className="list-link danger" onClick={onLogout}>
              <LogOut size={18} /> Выйти из аккаунта
            </button>
          </div>
        </div>
      </section>
      <section className="card">
        <div className="section-head">
          <h2>Достижения</h2>
          <span>{profile.achievements.filter((item) => item.completed).length}/{profile.achievements.length} получено</span>
        </div>
        <div className="achievement-grid">
          {profile.achievements.map((item) => (
            <article key={item.id} className="achievement-card">
              <div className="achievement-icon" />
              <h3>{item.title}</h3>
              <p>{item.subtitle}</p>
              {item.completed ? (
                <div className="achievement-done">
                  <Check size={16} /> Получено
                </div>
              ) : (
                <div className="progress-wrap">
                  <div className="progress-meta">
                    <span>Прогресс</span>
                    <span>{item.progress}/{item.target}</span>
                  </div>
                  <div className="progress-bar">
                    <div style={{ width: `${(item.progress / item.target) * 100}%` }} />
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
      {isTeacher && (
        <section className="card teacher-profile-section">
          <div className="section-head">
            <div>
              <h2>Анкета преподавателя</h2>
              <p>Заполните описание, предметы и стоимость занятий. Только опубликованная анкета появится в списке репетиторов.</p>
            </div>
            <span>{isPublished ? "Анкета опубликована" : "Анкета скрыта"}</span>
          </div>
          <form className="teacher-profile-form" onSubmit={handleTeacherProfileSave}>
            <div className="form-grid teacher-profile-grid">
              <label>
                <span className="input-label">Специализация</span>
                <input
                  className="input"
                  value={teacherForm.grade_level}
                  onChange={(event) => setTeacherForm((prev) => ({ ...prev, grade_level: event.target.value }))}
                  placeholder="Например: ЕГЭ, олимпиады, Python"
                />
              </label>
              <label>
                <span className="input-label">Опыт преподавания, лет</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={teacherForm.experience_years}
                  onChange={(event) => setTeacherForm((prev) => ({ ...prev, experience_years: event.target.value }))}
                />
              </label>
            </div>
            <label>
              <span className="input-label">О себе</span>
              <textarea
                className="textarea"
                value={teacherForm.bio}
                onChange={(event) => setTeacherForm((prev) => ({ ...prev, bio: event.target.value }))}
                placeholder="Расскажите о подходе к обучению, сильных сторонах и формате занятий"
              />
            </label>
            <label>
              <span className="input-label">Образование</span>
              <textarea
                className="textarea"
                value={teacherForm.education}
                onChange={(event) => setTeacherForm((prev) => ({ ...prev, education: event.target.value }))}
                placeholder="Укажите вуз, факультет, курсы, сертификаты"
              />
            </label>
            <div className="teacher-subjects-picker">
              <span className="input-label">Предметы</span>
              <div className="teacher-subjects-chips">
                {availableSubjects.map((subject) => {
                  const active = teacherForm.subjects.some((item) => item.subject_id === subject.id);
                  return (
                    <button key={subject.id} type="button" className={`chip ${active ? "active" : ""}`} onClick={() => handleTeacherSubjectToggle(subject)}>
                      {subject.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="teacher-subject-list">
              {teacherForm.subjects.length ? (
                teacherForm.subjects.map((item) => (
                  <article key={item.subject_id} className="teacher-subject-editor">
                    <div className="teacher-subject-editor-head">
                      <h3>{item.subject_name}</h3>
                      <button type="button" className="link-button danger-link" onClick={() => handleTeacherSubjectToggle({ id: item.subject_id })}>
                        Убрать предмет
                      </button>
                    </div>
                    <div className="form-grid teacher-subject-grid">
                      <label>
                        <span className="input-label">Цена за урок</span>
                        <input
                          className="input"
                          type="number"
                          min="1"
                          value={item.price}
                          onChange={(event) => handleTeacherSubjectField(item.subject_id, "price", event.target.value)}
                        />
                      </label>
                      <label>
                        <span className="input-label">Короткое описание</span>
                        <input
                          className="input"
                          value={item.short_description}
                          onChange={(event) => handleTeacherSubjectField(item.subject_id, "short_description", event.target.value)}
                          placeholder="Например: Подготовка к ЕГЭ"
                        />
                      </label>
                    </div>
                    <label>
                      <span className="input-label">Специальное предложение</span>
                      <input
                        className="input"
                        value={item.special_offer}
                        onChange={(event) => handleTeacherSubjectField(item.subject_id, "special_offer", event.target.value)}
                        placeholder="Например: Первый урок бесплатно"
                      />
                    </label>
                  </article>
                ))
              ) : (
                <div className="empty-state compact-empty">
                  <h3>Предметы пока не выбраны</h3>
                  <p>Добавьте хотя бы один предмет, чтобы ученики понимали, с чем вы работаете.</p>
                </div>
              )}
            </div>
            <div className="teacher-availability-picker">
              <span className="input-label">Свободные слоты</span>
              <div className="teacher-availability-grid">
                {WEEK_DAYS.map((day) => (
                  <article key={day} className="teacher-day-card">
                    <h3>{day}</h3>
                    <div className="teacher-day-slots">
                      {TIME_SLOTS.map((time) => {
                        const active = teacherForm.availabilities.some((item) => item.day === day && item.time === time);
                        return (
                          <button key={`${day}-${time}`} type="button" className={`slot-chip ${active ? "active" : ""}`} onClick={() => handleAvailabilityToggle(day, time)}>
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <div className="teacher-profile-actions">
              <button type="submit" className="primary-button small" disabled={isSavingTeacher}>
                {isSavingTeacher ? "Сохраняем..." : "Сохранить анкету"}
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}

export function SchedulePage({ filteredSchedule, scheduleFilters, scheduleFilter, setScheduleFilter, scheduleView, setScheduleView, setSelectedLesson, user, onCopyLessonLink }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const currentWeekStart = useMemo(() => {
    const today = startOfWeek(new Date());
    return addDays(today, weekOffset * 7);
  }, [weekOffset]);
  const currentWeekEnd = useMemo(() => endOfWeek(currentWeekStart), [currentWeekStart]);
  const currentWeekSchedule = useMemo(
    () =>
      filteredSchedule.filter((lesson) => {
        const startsAt = new Date(lesson.starts_at);
        return startsAt >= currentWeekStart && startsAt <= currentWeekEnd;
      }),
    [filteredSchedule, currentWeekStart, currentWeekEnd]
  );
  const groupedLessons = useMemo(() => groupLessonsByDate(currentWeekSchedule), [currentWeekSchedule]);
  const weekColumns = useMemo(() => getWeekColumns(currentWeekSchedule, currentWeekStart), [currentWeekSchedule, currentWeekStart]);
  const weekRangeLabel = useMemo(() => formatWeekRange(currentWeekStart), [currentWeekStart]);

  return (
    <>
      <section className="hero">
        <div className="hero-inline">
          <div>
            <h1>Расписание</h1>
            <p>{weekRangeLabel}</p>
          </div>
          <div className="view-switch">
            <button className={`chip ${scheduleView === "week" ? "active" : ""}`} onClick={() => setScheduleView("week")}>Неделя</button>
            <button className={`chip ${scheduleView === "list" ? "active" : ""}`} onClick={() => setScheduleView("list")}>Список</button>
          </div>
        </div>
      </section>
      <section className="card">
        <div className="schedule-toolbar">
          <div className="chips-row">
            {scheduleFilters.map((item) => (
              <button key={item.key} className={`chip ${scheduleFilter === item.key ? "active" : ""}`} onClick={() => setScheduleFilter(item.key)}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="calendar-arrows">
            <button className="icon-button" onClick={() => setWeekOffset((prev) => prev - 1)} aria-label="Предыдущая неделя">
              <ChevronLeft size={18} />
            </button>
            <button className="icon-button" onClick={() => setWeekOffset((prev) => prev + 1)} aria-label="Следующая неделя">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        {scheduleView === "list" ? (
          currentWeekSchedule.length ? (
            <div className="schedule-groups">
              {Object.entries(groupedLessons).map(([dateLabel, lessons]) => (
                <section key={dateLabel} className="schedule-group">
                  <div className="schedule-group-head">
                    <strong>{dateLabel}</strong>
                    <span>{lessons.length} {pluralizeLessons(lessons.length)}</span>
                  </div>
                  <div className="schedule-list">
                    {lessons.map((lesson) => (
                      <article className="schedule-item clickable-card" key={lesson.id} onClick={() => setSelectedLesson(lesson)}>
                        <div className="schedule-time">
                          <strong>{formatTime(lesson.starts_at)}</strong>
                          <span>{formatTime(lesson.ends_at)}</span>
                        </div>
                        <img src={lesson.counterparty_avatar} alt={lesson.counterparty_name} />
                        <div className="schedule-content">
                          <h3>{lesson.subject_name}</h3>
                          <p>{lesson.title_description || lesson.counterparty_name}</p>
                          <small>{lesson.counterparty_name}</small>
                          <span className={`schedule-status ${lesson.status}`}>{getLessonStatusText(lesson)}</span>
                        </div>
                        <button
                          className={user?.role !== "teacher" && lesson.meeting_url && lesson.status !== "cancelled" ? "primary-button small" : "secondary-button small"}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (lesson.status === "cancelled") return;
                            if (user?.role === "teacher") {
                              setSelectedLesson(lesson);
                              return;
                            }
                            if (lesson.meeting_url) {
                              window.open(lesson.meeting_url, "_blank", "noopener,noreferrer");
                            }
                          }}
                          disabled={lesson.status === "cancelled" || (user?.role !== "teacher" && !lesson.meeting_url)}
                        >
                          {lesson.status === "cancelled" ? "Отменено" : user?.role === "teacher" ? "Открыть урок" : lesson.meeting_url ? "Открыть урок" : "Ожидайте ссылку"}
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>На этой неделе уроков нет</h3>
              <p>{user?.role === "teacher" ? "Переключи неделю стрелками или дождись появления новых учеников." : "Переключи неделю стрелками или запишись к репетитору, чтобы занятия появились в расписании."}</p>
            </div>
          )
        ) : (
          <div className="week-grid">
            {weekColumns.map((column) => (
              <div key={`${column.label}-${column.dayNumber}`} className="week-column">
                <div className="week-head">
                  <span>{column.label}</span>
                  <strong>{column.dayNumber}</strong>
                </div>
                {column.lessons.map((lesson) => (
                    <button key={lesson.id} className={`week-lesson ${lesson.status}`} onClick={() => setSelectedLesson(lesson)}>
                      <strong>{lesson.subject_name}</strong>
                      <span>{formatTime(lesson.starts_at)} - {formatTime(lesson.ends_at)}</span>
                      <small>{lesson.counterparty_name}</small>
                      {lesson.status === "cancelled" && <small>{getLessonStatusText(lesson)}</small>}
                    </button>
                  ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export function TutorsPage({ tutors, openTutorModal, setBookingTutor, tutorFilter, setTutorFilter, user }) {
  const isTeacher = user?.role === "teacher";
  return (
    <>
      <section className="hero">
        <div>
          <h1>Репетиторы</h1>
          <p>Найдите идеального преподавателя для ваших целей</p>
        </div>
      </section>
      <section className="tutors-layout">
        <aside className="card filters">
          <h3>Предмет</h3>
          <button className={`filter-pill ${tutorFilter.subject === "math" ? "active" : ""}`} onClick={() => setTutorFilter((prev) => ({ ...prev, subject: prev.subject === "math" ? "all" : "math" }))}>Математика</button>
          <button className={`filter-pill ${tutorFilter.subject === "cs" ? "active" : ""}`} onClick={() => setTutorFilter((prev) => ({ ...prev, subject: prev.subject === "cs" ? "all" : "cs" }))}>Информатика</button>
          <button className={`filter-pill ${tutorFilter.subject === "physics" ? "active" : ""}`} onClick={() => setTutorFilter((prev) => ({ ...prev, subject: prev.subject === "physics" ? "all" : "physics" }))}>Физика</button>
          <div className="filter-block">
            <span>Цена за час</span>
            <label>
              <span>От</span>
              <input className="input" type="number" min="0" value={tutorFilter.minPrice} onChange={(event) => setTutorFilter((prev) => ({ ...prev, minPrice: event.target.value }))} />
            </label>
            <label>
              <span>До</span>
              <input className="input" type="number" min="0" value={tutorFilter.maxPrice} onChange={(event) => setTutorFilter((prev) => ({ ...prev, maxPrice: event.target.value }))} />
            </label>
          </div>
          <button className="secondary-button small" onClick={() => setTutorFilter({ subject: "all", minPrice: "", maxPrice: "" })}>Сбросить фильтры</button>
        </aside>
        <div className="tutor-list">
          {tutors.length === 0 && (
            <div className="empty-state">
              <h3>Репетиторы не найдены</h3>
              <p>Измени фильтры или добавь преподавателей через админку.</p>
            </div>
          )}
          {tutors.map((tutor) => (
            <article key={tutor.id} className="card tutor-card">
              <img src={tutor.avatar_url} alt={tutor.full_name} />
              <div className="tutor-main">
                <div className="tutor-header">
                  <div>
                    <h3>{tutor.full_name}</h3>
                    <p>★ {tutor.rating} ({tutor.reviews_count} отзывов) • {tutor.experience_years} лет опыта</p>
                  </div>
                  <strong>{formatCurrency(tutor.subjects[0]?.price)} ₽</strong>
                </div>
                <span>{tutor.subjects.map((item) => item.subject.name).join(" • ")}</span>
                <p>{tutor.bio}</p>
                <div className="tutor-actions">
                  {!isTeacher && <button className="secondary-button small" onClick={() => setBookingTutor(tutor)}>Записаться</button>}
                  <button className="secondary-button small" onClick={() => openTutorModal(tutor, "about")}>Подробнее</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

export function ReviewsPage({ reviewTab, setReviewTab, reviewCollections, setReviewModal }) {
  const myCount = reviewCollections.my.length;
  const pendingCount = reviewCollections.pending.length;
  const communityCount = reviewCollections.community.length;

  return (
    <>
      <section className="hero">
        <div className="hero-inline reviews-top">
          <div>
            <h1>Отзывы</h1>
            <p>Ваши отзывы о занятиях и отзывы сообщества</p>
          </div>
          <div className="tab-strip">
            <button className={`tab-button ${reviewTab === "my" ? "active" : ""}`} onClick={() => setReviewTab("my")}>Мои отзывы {myCount}</button>
            <button className={`tab-button ${reviewTab === "pending" ? "active" : ""}`} onClick={() => setReviewTab("pending")}>Ожидают ответа {pendingCount}</button>
            <button className={`tab-button ${reviewTab === "community" ? "active" : ""}`} onClick={() => setReviewTab("community")}>Все отзывы {communityCount}</button>
          </div>
        </div>
      </section>
      <section className="card review-list">
        {reviewTab === "pending" && (
          reviewCollections.pending.length ? (
            reviewCollections.pending.map((item) => (
              <article key={item.id} className="review-card compact">
                <div className="review-heading">
                  <div>
                    <h3>{item.subject_name}</h3>
                    <p>{item.lesson_title}</p>
                    <small>{item.lesson_date} • {item.teacher_name}</small>
                  </div>
                </div>
                <button className="secondary-button small" onClick={() => setReviewModal(item)}>Оставить отзыв</button>
              </article>
            ))
          ) : (
            <div className="empty-state compact-empty">
              <h3>Нет уроков без отзыва</h3>
              <p>Как только появятся завершенные занятия без оценки, они отобразятся в этом разделе.</p>
            </div>
          )
        )}
        {reviewTab === "my" && (
          reviewCollections.my.length ? (
            reviewCollections.my.map((review) => (
              <article key={review.id} className="review-card">
                <div className="review-heading">
                  <div>
                    <h3>{review.subject_name}</h3>
                    <p>{review.teacher_name}</p>
                  </div>
                  <span>{"★".repeat(review.rating)}</span>
                </div>
                <p>{review.text}</p>
                <small>Объяснение: {review.clarity}/5 • Пунктуальность: {review.punctuality}/5 • Подготовка: {review.preparation}/5</small>
                {review.teacher_reply && (
                  <div className="reply-box">
                    <strong>Ответ преподавателя:</strong>
                    <p>{review.teacher_reply}</p>
                  </div>
                )}
              </article>
            ))
          ) : (
            <div className="empty-state compact-empty">
              <h3>Вы еще не оставляли отзывы</h3>
              <p>После завершенных уроков здесь появятся ваши реальные отзывы из базы данных.</p>
            </div>
          )
        )}
        {reviewTab === "community" && (
          reviewCollections.community.length ? (
            reviewCollections.community.map((review) => (
              <article key={review.id} className="review-card">
                <div className="review-heading">
                  <div>
                    <h3>{review.student_name}</h3>
                    <p>{review.subject_name} • {review.teacher_name}</p>
                  </div>
                  <span>{"★".repeat(review.rating)}</span>
                </div>
                <p>{review.text}</p>
                <small>Объяснение: {review.clarity}/5 • Пунктуальность: {review.punctuality}/5 • Подготовка: {review.preparation}/5</small>
                {review.teacher_reply && (
                  <div className="reply-box">
                    <strong>Ответ преподавателя:</strong>
                    <p>{review.teacher_reply}</p>
                  </div>
                )}
              </article>
            ))
          ) : (
            <div className="empty-state compact-empty">
              <h3>Отзывов сообщества пока нет</h3>
              <p>Когда ученики начнут публиковать отзывы, они появятся здесь автоматически.</p>
            </div>
          )
        )}
      </section>
    </>
  );
}

export function PaymentPage({ user, paymentForm, setPaymentForm, paymentTotal, onPay, paymentError, setPaymentError, financeForm, setFinanceForm, onWithdraw, financeError, setFinanceError }) {
  const isTeacher = user?.role === "teacher";

  if (isTeacher) {
    return (
      <>
        <section className="hero">
          <h1>Финансовый кабинет</h1>
        </section>
        <section className="payment-layout">
          <div className="card payment-main">
            <h2>Вывод средств</h2>
            <div className="form-grid teacher-subject-grid">
              <label>
                <span className="input-label">Сумма вывода</span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={financeForm.amount}
                  onChange={(event) => {
                    if (financeError) setFinanceError("");
                    setFinanceForm((prev) => ({ ...prev, amount: event.target.value }));
                  }}
                  placeholder="Например: 5000"
                />
              </label>
              <label>
                <span className="input-label">Имя держателя карты</span>
                <input
                  className="input"
                  value={financeForm.card_holder}
                  onChange={(event) => setFinanceForm((prev) => ({ ...prev, card_holder: event.target.value }))}
                  placeholder="Как на карте"
                />
              </label>
            </div>
            <label>
              <span className="input-label">Номер карты</span>
              <input
                className={`input ${financeError ? "error" : ""}`}
                inputMode="numeric"
                value={financeForm.card_number}
                onChange={(event) => {
                  if (financeError) setFinanceError("");
                  setFinanceForm((prev) => ({ ...prev, card_number: event.target.value }));
                }}
                placeholder="0000 0000 0000 0000"
              />
            </label>
            {financeError && <small className="field-error">{financeError}</small>}
            <button className="primary-button" onClick={onWithdraw}>Вывести средства</button>
          </div>
          <aside className="card payment-sidebar">
            <h2>Ваш баланс</h2>
            <div className="summary-row">
              <span>Доступно к выводу:</span>
              <strong>{formatCurrency(user.balance)} ₽</strong>
            </div>
            <small>Баланс отражает сумму, которую преподаватель заработал после проведенных занятий.</small>
            <small><Shield size={14} /> Выплаты выполняются на указанную карту</small>
          </aside>
        </section>
      </>
    );
  }

  return (
    <>
      <section className="hero">
        <h1>Оплата</h1>
      </section>
      <section className="payment-layout">
        <div className="card payment-main">
          <h2>1. Сумма пополнения</h2>
          <div className="payment-top">
            <input className="input" value={paymentForm.amount} onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))} />
            <div className="chips-row">
              {[2000, 5000, 7000, 10000].map((amount) => (
                <button key={amount} className={`chip ${Number(paymentForm.amount) === amount ? "active" : ""}`} onClick={() => setPaymentForm((prev) => ({ ...prev, amount }))}>
                  {formatCurrency(amount)} ₽
                </button>
              ))}
            </div>
          </div>
          <h2>2. Способ оплаты</h2>
          <div className="method-grid">
            {[["sbp", "СБП"], ["card", "Банковская карта"], ["sberpay", "SberPay"], ["tpay", "T-pay"]].map(([key, label]) => (
              <button key={key} className={`method-card ${paymentForm.method === key ? "active" : ""}`} onClick={() => setPaymentForm((prev) => ({ ...prev, method: key }))}>
                <strong>{label}</strong>
              </button>
            ))}
          </div>
        </div>
        <aside className="card payment-sidebar">
          <h2>К оплате</h2>
          <div className="summary-row">
            <span>Итого:</span>
            <strong>{formatCurrency(paymentForm.amount)} ₽</strong>
          </div>
          <label className="input-label">У меня есть промокод</label>
          <input className={`input ${paymentForm.promo_code && paymentForm.promo_code.toLowerCase() !== "деп" ? "error" : ""}`} placeholder="Введите промокод" value={paymentForm.promo_code} onChange={(event) => setPaymentForm((prev) => ({ ...prev, promo_code: event.target.value }))} />
          {paymentForm.promo_code && paymentForm.promo_code.toLowerCase() !== "деп" && <small className="field-error">Код не найден</small>}
          {paymentTotal.bonus > 0 && <small className="success">+10% к пополнению по промокоду</small>}
          <label className="input-label">Email для чека</label>
          <input
            className={`input ${paymentError ? "error" : ""}`}
            type="email"
            placeholder="your@email.com"
            value={paymentForm.email}
            onChange={(event) => {
              if (paymentError) {
                setPaymentError("");
              }
              setPaymentForm((prev) => ({ ...prev, email: event.target.value }));
            }}
          />
          {paymentError && <small className="field-error">{paymentError}</small>}
          <button className="primary-button" onClick={onPay}>Оплатить {formatCurrency(paymentTotal.total)} ₽</button>
          <small><Shield size={14} /> Безопасная оплата</small>
        </aside>
      </section>
    </>
  );
}
