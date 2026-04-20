import { ChevronRight, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatCurrency, formatShortDateTime, formatTime } from "../utils";

const WEEKDAY_ORDER = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

export function NotificationsDrawer({ groupedNotifications, onClose, onRemoveNotification }) {
  const sections = Object.entries(groupedNotifications);

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-head">
          <h3>Уведомления</h3>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="notification-list grouped">
          {sections.length ? (
            sections.map(([section, items]) => (
              <div key={section} className="notification-group">
                <div className="notification-group-head">
                  <span>{section}</span>
                </div>
                {items.map((item) => (
                  <article key={item.id} className="notification-item">
                    <div className="notification-copy">
                      <strong>{item.title}</strong>
                      <span>{item.message}</span>
                    </div>
                    <button className="icon-button notification-remove" onClick={() => onRemoveNotification(item.id)} aria-label="Удалить уведомление" title="Удалить уведомление">
                      <Trash2 size={16} />
                    </button>
                  </article>
                ))}
              </div>
            ))
          ) : (
            <div className="empty-state compact-empty">
              <h3>Уведомлений пока нет</h3>
              <p>Новые уведомления появятся после оплаты, записи на урок или обновлений по занятиям.</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

export function DocumentsModal({ documents, onClose, onDownload }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-sm" onClick={(event) => event.stopPropagation()}>
        <button className="icon-button close-button" onClick={onClose}>
          <X size={18} />
        </button>
        <h2>Договор и документы</h2>
        <div className="document-list">
          {documents.map((item) => (
            <button key={item.id} className="document-row" onClick={() => onDownload(item.title)}>
              <div>
                <strong>{item.title}</strong>
                <span>от {item.date} • {item.size_label}</span>
              </div>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TutorModal({ tutor, mode, setMode, onClose, onBook, user }) {
  const tutorReviews = tutor.reviews || [];
  const tutorSchedule = tutor.schedule || {};
  const hasSchedule = Object.keys(tutorSchedule).length > 0;
  const isTeacher = user?.role === "teacher";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <button className="icon-button close-button" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="modal-header">
          <img src={tutor.avatar_url} alt={tutor.full_name} />
          <div className="modal-header-copy">
            <h2>{tutor.full_name}</h2>
            <p>
              {tutor.reviews_count ? `★ ${tutor.rating} (${tutor.reviews_count} отзывов)` : "Отзывов пока нет"}
              {" • "}
              {tutor.experience_years} лет опыта
            </p>
          </div>
        </div>
        <div className="tabs">
          <button className={`tab ${mode === "about" ? "active" : ""}`} onClick={() => setMode("about")}>О репетиторе</button>
          <button className={`tab ${mode === "reviews" ? "active" : ""}`} onClick={() => setMode("reviews")}>Отзывы</button>
          <button className={`tab ${mode === "schedule" ? "active" : ""}`} onClick={() => setMode("schedule")}>Расписание</button>
        </div>
        {mode === "about" && (
          <section className="modal-section">
            <h3>Образование</h3>
            <p>{tutor.education}</p>
            <h3>О себе</h3>
            <p>{tutor.bio}</p>
            <h3>Предметы</h3>
            <div className="subject-list">
              {tutor.subjects.map((item) => (
                <div key={item.subject.slug} className="subject-row">
                  <div>
                    <strong>{item.subject.name}</strong>
                    <p>{item.short_description}</p>
                  </div>
                  <strong>{formatCurrency(item.price)} ₽</strong>
                </div>
              ))}
            </div>
          </section>
        )}
        {mode === "reviews" && (
          <section className="modal-section">
            {tutorReviews.length ? (
              tutorReviews.map((item) => (
                <div key={item.id} className="review-inline">
                  <div className="review-inline-head">
                    <strong>{item.author}</strong>
                    <span>{"★".repeat(item.rating)}</span>
                  </div>
                  <p>{item.text}</p>
                  <small>{item.date}</small>
                </div>
              ))
            ) : (
              <div className="empty-state compact-empty">
                <h3>Отзывов пока нет</h3>
                <p>Как только ученики оставят отзывы, они появятся здесь автоматически.</p>
              </div>
            )}
          </section>
        )}
        {mode === "schedule" && (
          <section className="modal-section schedule-slots">
            {hasSchedule ? (
              Object.entries(tutorSchedule).map(([day, slots]) => (
                <div key={day}>
                  <h3>{day}</h3>
                  <div className="slot-list">
                    {slots.length ? slots.map((slot) => <button key={slot} className="slot-chip">{slot}</button>) : <span className="muted">Нет доступных слотов</span>}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state compact-empty">
                <h3>Расписание пока не заполнено</h3>
                <p>Свободные слоты преподавателя появятся здесь после добавления расписания в системе.</p>
              </div>
            )}
          </section>
        )}
        {!isTeacher && <button className="primary-button" onClick={onBook}>Записаться на урок</button>}
      </div>
    </div>
  );
}

export function BookingModal({ tutor, bookingForm, setBookingForm, onClose, onSubmit }) {
  const tutorSchedule = tutor.schedule || {};
  const availableDays = Object.keys(tutorSchedule).sort((left, right) => WEEKDAY_ORDER.indexOf(left) - WEEKDAY_ORDER.indexOf(right));
  const hasSchedule = availableDays.length > 0;
  const availableSlots = hasSchedule ? tutorSchedule[bookingForm.day] || tutorSchedule[availableDays[0]] || [] : [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-booking" onClick={(event) => event.stopPropagation()}>
        <button className="icon-button close-button" onClick={onClose}>
          <X size={18} />
        </button>
        <h2>Записаться на урок</h2>
        <div className="booking-teacher">
          <img src={tutor.avatar_url} alt={tutor.full_name} />
          <div>
            <strong>{tutor.full_name}</strong>
            <span>★ {tutor.rating} ({tutor.reviews_count} отзывов) • {tutor.experience_years} лет опыта</span>
          </div>
        </div>
        <div className="form-grid">
          <label>
            <span>Предмет</span>
            <select className="input" value={bookingForm.subject} onChange={(event) => setBookingForm((prev) => ({ ...prev, subject: event.target.value }))}>
              {tutor.subjects.map((item) => (
                <option key={item.subject.slug}>{item.subject.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>День</span>
            <select className="input" value={bookingForm.day} onChange={(event) => setBookingForm((prev) => ({ ...prev, day: event.target.value, time: (tutorSchedule[event.target.value] || [])[0] || "" }))} disabled={!hasSchedule}>
              {availableDays.map((day) => (
                <option key={day}>{day}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Время</span>
            <select className="input" value={bookingForm.time} onChange={(event) => setBookingForm((prev) => ({ ...prev, time: event.target.value }))} disabled={!hasSchedule}>
              {availableSlots.map((slot) => (
                <option key={slot}>{slot}</option>
              ))}
            </select>
          </label>
        </div>
        {!hasSchedule && (
          <div className="empty-state compact-empty">
            <h3>Расписание пока не заполнено</h3>
            <p>Пока у преподавателя нет свободных слотов. Попробуйте выбрать другого репетитора позже.</p>
          </div>
        )}
        {tutor.subjects[0]?.special_offer && (
          <div className="special-offer">
            <strong>{tutor.subjects[0].special_offer}</strong>
            <p>Познакомьтесь с репетитором, оцените формат и примите решение без спешки.</p>
          </div>
        )}
        <label>
          <span>Пожелания</span>
          <textarea className="textarea" placeholder="Расскажите о ваших целях" value={bookingForm.wishes} onChange={(event) => setBookingForm((prev) => ({ ...prev, wishes: event.target.value }))} />
        </label>
        <button className="primary-button" onClick={onSubmit} disabled={!hasSchedule || !availableSlots.length}>Записаться на урок</button>
      </div>
    </div>
  );
}

export function ReviewModal({ modal, reviewForm, setReviewForm, onClose, onSubmit }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-review" onClick={(event) => event.stopPropagation()}>
        <button className="icon-button close-button" onClick={onClose}>
          <X size={18} />
        </button>
        <h2>Оставить отзыв</h2>
        <div className="booking-teacher">
          <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80" alt={modal.teacher_name} />
          <div>
            <strong>{modal.teacher_name}</strong>
            <span>{modal.subject_name}</span>
          </div>
        </div>
        <div className="rating-grid">
          {[
            ["rating", "Общая оценка"],
            ["clarity", "Объяснение материала"],
            ["punctuality", "Пунктуальность"],
            ["preparation", "Подготовка к уроку"],
          ].map(([key, label]) => (
            <label key={key}>
              <span>{label}</span>
              <input className="input" type="number" min="1" max="5" value={reviewForm[key]} onChange={(event) => setReviewForm((prev) => ({ ...prev, [key]: Number(event.target.value) }))} />
            </label>
          ))}
        </div>
        <textarea className="textarea" placeholder="Расскажите о ваших впечатлениях" value={reviewForm.text} onChange={(event) => setReviewForm((prev) => ({ ...prev, text: event.target.value }))} />
        <button className="primary-button" onClick={onSubmit}>Опубликовать</button>
      </div>
    </div>
  );
}

function getLessonStatusLabel(status) {
  if (status === "active") return "Урок начался";
  if (status === "completed") return "Проведен";
  if (status === "cancelled") return "Отменено";
  return "Предстоит";
}

function getCancellationText(lesson) {
  if (lesson.status !== "cancelled") return "";
  if (lesson.cancelled_by_role === "teacher") return "Отменено преподавателем. На статистику ученика не влияет.";
  if (lesson.cancelled_by_role === "student") return "Отменено учеником.";
  return "Занятие отменено.";
}

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function getDateInputValue(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function getTimeInputValue(value) {
  const date = new Date(value);
  return `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

function buildLessonDateTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hours, minutes] = timeValue.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes).toISOString();
}

export function LessonModal({ lesson, user, onClose, onSaveMeetingUrl, onCancelLesson, onCopyLessonLink }) {
  const isTeacher = user?.role === "teacher";
  const [meetingUrl, setMeetingUrl] = useState(lesson.meeting_url || "");
  const [lessonDate, setLessonDate] = useState(getDateInputValue(lesson.starts_at));
  const [lessonTime, setLessonTime] = useState(getTimeInputValue(lesson.starts_at));
  const canCancel = ["upcoming", "active"].includes(lesson.status);
  const canReschedule = ["upcoming", "active"].includes(lesson.status);

  useEffect(() => {
    setMeetingUrl(lesson.meeting_url || "");
    setLessonDate(getDateInputValue(lesson.starts_at));
    setLessonTime(getTimeInputValue(lesson.starts_at));
  }, [lesson.meeting_url, lesson.starts_at]);

  function handleCancelClick() {
    if (!canCancel) return;
    const confirmed = window.confirm("Отменить это занятие? Вторая сторона получит уведомление.");
    if (confirmed) {
      onCancelLesson(lesson.id);
    }
  }

  function handleRescheduleClick() {
    const startsAt = buildLessonDateTime(lessonDate, lessonTime);
    if (startsAt) {
      onSaveMeetingUrl(lesson.id, { starts_at: startsAt });
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-sm lesson-modal" onClick={(event) => event.stopPropagation()}>
        <button className="icon-button close-button" onClick={onClose}>
          <X size={18} />
        </button>
        <div className={`lesson-state ${lesson.status}`}>{getLessonStatusLabel(lesson.status)}</div>
        <div className="lesson-mini-head">
          <img src={lesson.counterparty_avatar} alt={lesson.counterparty_name} />
          <h2>{lesson.subject_name}</h2>
        </div>
        <div className="lesson-meta">
          <div>
            <span>Тема урока</span>
            <strong>{lesson.title_description || lesson.title}</strong>
          </div>
          <div>
            <span>{isTeacher ? "Ученик" : "Преподаватель"}</span>
            <strong>{lesson.counterparty_name}</strong>
          </div>
          <div>
            <span>Дата и время</span>
            <strong>{formatShortDateTime(lesson.starts_at)} - {formatTime(lesson.ends_at)}</strong>
          </div>
          {lesson.status === "cancelled" && (
            <div className="lesson-cancel-note">
              <span>Статус</span>
              <strong>{getCancellationText(lesson)}</strong>
            </div>
          )}
          {canReschedule && (
            <div className="lesson-reschedule-form">
              <span>Перенести занятие</span>
              <div className="lesson-reschedule-grid">
                <input className="input" type="date" value={lessonDate} onChange={(event) => setLessonDate(event.target.value)} />
                <input className="input" type="time" value={lessonTime} onChange={(event) => setLessonTime(event.target.value)} />
                <button className="secondary-button small" onClick={handleRescheduleClick}>
                  Перенести
                </button>
              </div>
            </div>
          )}
          {isTeacher && lesson.status !== "cancelled" ? (
            <div className="lesson-link-editor">
              <span>Ссылка на урок</span>
              <div className="lesson-link-actions">
                <input className="input" value={meetingUrl} placeholder="https://..." onChange={(event) => setMeetingUrl(event.target.value)} />
                <button className="secondary-button small" onClick={() => onSaveMeetingUrl(lesson.id, { meeting_url: meetingUrl })}>
                  <Save size={16} /> Сохранить
                </button>
              </div>
            </div>
          ) : (
            <div>
              <span>Ссылка на урок</span>
              <strong>{lesson.meeting_url || "Ожидайте ссылку"}</strong>
            </div>
          )}
        </div>
        {lesson.status === "cancelled" ? (
          <button className="secondary-button" disabled>
            Занятие отменено
          </button>
        ) : isTeacher ? (
          <button className="primary-button" disabled={!lesson.meeting_url} onClick={() => lesson.meeting_url && window.open(lesson.meeting_url, "_blank", "noopener,noreferrer")}>
            {lesson.meeting_url ? "Открыть ссылку" : "Ссылка не добавлена"}
          </button>
        ) : (
          <button className="primary-button" disabled={!lesson.meeting_url} onClick={() => lesson.meeting_url && window.open(lesson.meeting_url, "_blank", "noopener,noreferrer")}>
            {lesson.meeting_url ? "Открыть урок" : "Ожидайте ссылку"}
          </button>
        )}
        {canCancel && (
          <button className="danger-button" onClick={handleCancelClick}>
            <Trash2 size={16} /> Отменить занятие
          </button>
        )}
      </div>
    </div>
  );
}
