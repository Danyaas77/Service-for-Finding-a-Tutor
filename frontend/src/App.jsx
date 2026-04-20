import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CreditCard, Home, Search, Star } from "lucide-react";
import {
  cancelLesson,
  createBooking,
  createPayment,
  createReview,
  createWithdrawal,
  deleteNotification,
  fetchDashboard,
  fetchNotifications,
  fetchProfile,
  fetchReviewCollections,
  fetchSchedule,
  fetchTutors,
  login,
  register,
  updateLesson,
  updateProfile,
} from "./api";
import { AuthFlow, OnboardingFlow } from "./components/flows";
import { TopBar } from "./components/layout";
import {
  BookingModal,
  DocumentsModal,
  LessonModal,
  NotificationsDrawer,
  ReviewModal,
  TutorModal,
} from "./components/modals";
import { HomePage, PaymentPage, ProfilePage, ReviewsPage, SchedulePage, TutorsPage } from "./components/pages";
import { groupBySection, subjectToSlug } from "./utils";

const navItems = [
  { key: "home", label: "Главная", icon: Home },
  { key: "schedule", label: "Расписание", icon: CalendarDays },
  { key: "tutors", label: "Репетиторы", icon: Search },
  { key: "reviews", label: "Отзывы", icon: Star },
  { key: "payment", label: "Оплата", icon: CreditCard },
];

const scheduleFilters = [
  { key: "all", label: "Все" },
  { key: "math", label: "Математика" },
  { key: "physics", label: "Физика" },
  { key: "cs", label: "Информатика" },
];

function App() {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordHasLatin = /[A-Za-z]/;
  const passwordHasDigit = /\d/;
  const passwordHasCyrillic = /[А-Яа-яЁё]/;
  const [session, setSession] = useState(localStorage.getItem("oktiq-token"));
  const [authMode, setAuthMode] = useState("login");
  const [activePage, setActivePage] = useState("home");
  const [phone, setPhone] = useState("+7");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [error, setError] = useState("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [profile, setProfile] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [reviewCollections, setReviewCollections] = useState({ my: [], pending: [], community: [] });
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [tutorModalMode, setTutorModalMode] = useState("about");
  const [bookingTutor, setBookingTutor] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewTab, setReviewTab] = useState("my");
  const [scheduleFilter, setScheduleFilter] = useState("all");
  const [scheduleView, setScheduleView] = useState("list");
  const [tutorFilter, setTutorFilter] = useState({ subject: "all", minPrice: "", maxPrice: "" });
  const [paymentForm, setPaymentForm] = useState({ amount: 3000, method: "sbp", promo_code: "", email: "" });
  const [paymentError, setPaymentError] = useState("");
  const [financeForm, setFinanceForm] = useState({ amount: "", card_number: "", card_holder: "" });
  const [financeError, setFinanceError] = useState("");
  const [profileEditError, setProfileEditError] = useState("");
  const [reviewForm, setReviewForm] = useState({ text: "", rating: 5, clarity: 5, punctuality: 5, preparation: 5 });
  const [bookingForm, setBookingForm] = useState({ subject: "Математика", day: "Понедельник", time: "10:00", wishes: "" });
  const [downloadToast, setDownloadToast] = useState("");
  const [onboardingStep, setOnboardingStep] = useState("done");
  const [selectedRole, setSelectedRole] = useState("");
  const user = dashboard?.user || profile?.user;

  useEffect(() => {
    if (!session) return;

    Promise.all([
      fetchDashboard(),
      fetchProfile(),
      fetchSchedule(),
      fetchTutors(tutorFilter),
      fetchNotifications(),
      fetchReviewCollections(),
    ]).then(([dashboardData, profileData, scheduleData, tutorsData, notificationsData, reviewData]) => {
      setDashboard(dashboardData);
      setProfile(profileData);
      setSchedule(scheduleData);
      setTutors(tutorsData);
      setNotifications(notificationsData);
      setReviewCollections(reviewData);
    });
  }, [session, tutorFilter]);

  useEffect(() => {
    if (!downloadToast) return undefined;
    const timeout = setTimeout(() => setDownloadToast(""), 2200);
    return () => clearTimeout(timeout);
  }, [downloadToast]);

  useEffect(() => {
    if (!user) {
      return;
    }
    if (onboardingStep === "done") {
      setSelectedRole(user.role || "");
    }
  }, [user, onboardingStep]);

  const paymentTotal = useMemo(() => {
    const amount = Number(paymentForm.amount || 0);
    const bonus = paymentForm.promo_code.trim().toLowerCase() === "деп" ? Math.round(amount / 10) : 0;
    return { bonus, total: amount + bonus };
  }, [paymentForm]);

  const filteredSchedule = useMemo(() => {
    if (scheduleFilter === "all") return schedule;
    return schedule.filter((item) => subjectToSlug(item.subject_name) === scheduleFilter);
  }, [schedule, scheduleFilter]);

  const groupedNotifications = useMemo(() => groupBySection(notifications), [notifications]);
  const visibleNavItems = useMemo(
    () =>
      navItems
        .filter((item) => !(user?.role === "teacher" && item.key === "reviews"))
        .map((item) => (item.key === "payment" && user?.role === "teacher" ? { ...item, label: "Финансовый кабинет" } : item)),
    [user]
  );

  useEffect(() => {
    if (user?.role === "teacher" && activePage === "reviews") {
      setActivePage("home");
    }
  }, [user, activePage]);

  function openTutorModal(tutor, mode = "about") {
    setSelectedTutor(tutor);
    setTutorModalMode(mode);
  }

  async function reloadNotifications() {
    const data = await fetchNotifications();
    setNotifications(data);
  }

  function handleShowNotifications() {
    setShowProfileMenu(false);
    setShowNotifications(true);
  }

  function handleToggleProfileMenu() {
    setShowNotifications(false);
    setShowProfileMenu((prev) => !prev);
  }

  function openBookingModal(tutor) {
    const firstSubject = tutor.subjects[0]?.subject?.name || "";
    const scheduleMap = tutor.schedule || {};
    const days = Object.keys(scheduleMap);
    const firstDay = days[0] || "";
    const firstTime = (scheduleMap[firstDay] || [])[0] || "";
    setBookingForm({ subject: firstSubject, day: firstDay, time: firstTime, wishes: "" });
    setBookingTutor(tutor);
  }

  function handleLogout() {
    localStorage.removeItem("oktiq-token");
    setSession(null);
    setDashboard(null);
    setProfile(null);
    setSchedule([]);
    setTutors([]);
    setNotifications([]);
    setReviewCollections({ my: [], pending: [], community: [] });
    setShowProfileMenu(false);
    setShowNotifications(false);
    setOnboardingStep("done");
    setSelectedRole("");
    setAuthMode("login");
    setPhone("+7");
    setPassword("");
    setPasswordRepeat("");
  }

  async function finishOnboarding() {
    await handleProfileSave({ role: selectedRole || user?.role, is_onboarded: true });
    setOnboardingStep("done");
  }

  async function handleAuthSubmit() {
    try {
      setError("");
      if (authMode === "register") {
        if (password.length < 8) {
          setError("Пароль должен содержать минимум 8 символов.");
          return;
        }
        if (passwordHasCyrillic.test(password)) {
          setError("Используйте только латиницу, цифры и специальные символы.");
          return;
        }
        if (!passwordHasLatin.test(password)) {
          setError("Пароль должен содержать хотя бы одну латинскую букву.");
          return;
        }
        if (!passwordHasDigit.test(password)) {
          setError("Пароль должен содержать хотя бы одну цифру.");
          return;
        }
        if (password !== passwordRepeat) {
          setError("Пароли не совпадают.");
          return;
        }
      }
      setIsAuthSubmitting(true);
      let result;
      if (authMode === "login") {
        result = await login(phone, password);
      } else {
        result = await register(phone, password, passwordRepeat);
      }
      setSession(localStorage.getItem("oktiq-token"));
      setPassword("");
      setPasswordRepeat("");
      setSelectedRole("");
      setOnboardingStep(authMode === "register" ? "role-select" : "done");
    } catch (authError) {
      setError(authError.message);
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function handlePayment() {
    const normalizedEmail = paymentForm.email.trim();
    if (!normalizedEmail || !emailPattern.test(normalizedEmail)) {
      setPaymentError("Введите корректный email для чека");
      return;
    }
    setPaymentError("");
    const result = await createPayment(paymentForm);
    setDashboard((prev) =>
      prev
        ? {
            ...prev,
            user: {
              ...prev.user,
              balance: Number(prev.user.balance) + Number(result.amount) + Number(result.bonus || 0),
            },
          }
        : prev
    );
    await reloadNotifications();
  }

  async function handleWithdrawal() {
    const amount = Number(financeForm.amount || 0);
    if (!amount || amount <= 0) {
      setFinanceError("Введите сумму для вывода");
      return;
    }
    if (!financeForm.card_number.replace(/\D/g, "") || financeForm.card_number.replace(/\D/g, "").length < 16) {
      setFinanceError("Введите корректный номер карты");
      return;
    }
    setFinanceError("");
    const result = await createWithdrawal(financeForm);
    setDashboard((prev) =>
      prev
        ? {
            ...prev,
            user: {
              ...prev.user,
              balance: Number(prev.user.balance) - Number(result.amount),
            },
          }
        : prev
    );
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            user: {
              ...prev.user,
              balance: Number(prev.user.balance) - Number(result.amount),
            },
          }
        : prev
    );
    setNotifications((prev) => [
      {
        id: Date.now(),
        title: `Вывод средств на ${result.amount} ₽`,
        message: "Деньги отправлены на указанную карту.",
        created_at: new Date().toISOString(),
        section: "Сегодня",
        is_read: false,
      },
      ...prev,
    ]);
    setFinanceForm({ amount: "", card_number: "", card_holder: "" });
    setDownloadToast("Заявка на вывод средств создана");
    await reloadNotifications();
  }

  async function handleRemoveNotification(notificationId) {
    await deleteNotification(notificationId);
    setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
  }

  async function handleProfileSave(payload) {
    try {
      setProfileEditError("");
      const updatedProfile = await updateProfile(payload);
      setProfile(updatedProfile);
      setDashboard((prev) => (prev ? { ...prev, user: updatedProfile.user } : prev));
    } catch (saveError) {
      setProfileEditError(saveError.message);
      throw saveError;
    }
  }

  async function handleRoleContinue() {
    if (!selectedRole) {
      return;
    }
    await handleProfileSave({ role: selectedRole });
    setOnboardingStep(selectedRole === "teacher" ? "teacher-welcome" : "welcome");
  }

  async function handleReviewSubmit() {
    if (!reviewModal) return;
    const created = await createReview({
      ...reviewForm,
      text: reviewForm.text || "Спасибо за урок!",
      lesson_id: reviewModal.id,
      teacher_name: reviewModal.teacher_name,
      subject_name: reviewModal.subject_name,
    });
    setReviewCollections((prev) => ({
      ...prev,
      my: [created, ...prev.my],
      pending: prev.pending.filter((item) => item.id !== reviewModal.id),
    }));
    setReviewModal(null);
    setReviewForm({ text: "", rating: 5, clarity: 5, punctuality: 5, preparation: 5 });
  }

  async function handleBookLesson() {
    if (!bookingTutor) return;
    const targetSubject = bookingTutor.subjects.find((item) => item.subject.name === bookingForm.subject) || bookingTutor.subjects[0];
    const lesson = await createBooking({
      teacher_id: bookingTutor.id,
      teacher_name: bookingTutor.full_name,
      subject_slug: targetSubject.subject.slug,
      day: bookingForm.day,
      time: bookingForm.time,
      wishes: bookingForm.wishes,
    });
    setSchedule((prev) => [...prev, lesson]);
    setDashboard((prev) =>
      prev
        ? {
            ...prev,
            upcoming_lessons: [lesson, ...prev.upcoming_lessons].slice(0, 3),
          }
        : prev
    );
    await reloadNotifications();
    setDownloadToast(`Урок с ${bookingTutor.full_name} запланирован`);
    setBookingTutor(null);
    setActivePage("schedule");
  }

  async function handleLessonUpdate(lessonId, payload) {
    const updatedLesson = await updateLesson(lessonId, payload);
    setSelectedLesson(updatedLesson);
    setSchedule((prev) => prev.map((lesson) => (lesson.id === updatedLesson.id ? updatedLesson : lesson)));
    const freshDashboard = await fetchDashboard();
    setDashboard(freshDashboard);
    await reloadNotifications();
    setDownloadToast(payload.starts_at ? "Занятие перенесено" : "Ссылка на урок обновлена");
  }

  async function handleLessonCancel(lessonId) {
    const updatedLesson = await cancelLesson(lessonId);
    setSelectedLesson(updatedLesson);
    setSchedule((prev) => prev.map((lesson) => (lesson.id === updatedLesson.id ? updatedLesson : lesson)));
    setDashboard((prev) =>
      prev
        ? {
            ...prev,
            upcoming_lessons: prev.upcoming_lessons.filter((lesson) => lesson.id !== updatedLesson.id),
          }
        : prev
    );
    await reloadNotifications();
    setDownloadToast("Занятие отменено");
  }

  function startDownload(documentOrTitle) {
    if (typeof documentOrTitle === "string") {
      setDownloadToast(`${documentOrTitle} загружается...`);
      return;
    }
    if (documentOrTitle?.file_url) {
      window.open(documentOrTitle.file_url, "_blank", "noopener,noreferrer");
      setDownloadToast(`${documentOrTitle.title} загружается...`);
      return;
    }
    setDownloadToast("Файл пока не загружен");
  }

  async function handleCopyLessonLink(link) {
    try {
      await navigator.clipboard.writeText(link);
      setDownloadToast("Ссылка скопирована");
    } catch {
      setDownloadToast("Не удалось скопировать ссылку");
    }
  }

  if (!session) {
    return (
      <AuthFlow
        authMode={authMode}
        setAuthMode={(mode) => {
          setAuthMode(mode);
          setError("");
          setPassword("");
          setPasswordRepeat("");
        }}
        phone={phone}
        setPhone={setPhone}
        password={password}
        setPassword={setPassword}
        passwordRepeat={passwordRepeat}
        setPasswordRepeat={setPasswordRepeat}
        error={error}
        onSubmit={handleAuthSubmit}
        isSubmitting={isAuthSubmitting}
      />
    );
  }

  if (onboardingStep !== "done" && user) {
    return (
      <OnboardingFlow
        step={onboardingStep}
        setStep={setOnboardingStep}
        user={user}
        selectedRole={selectedRole}
        setSelectedRole={setSelectedRole}
        onDownload={startDownload}
        onFinish={finishOnboarding}
        onRoleContinue={handleRoleContinue}
        toast={downloadToast}
        onboardingPlan={dashboard?.onboarding_plan || []}
        agreementDocument={dashboard?.agreement_document || profile?.agreement_document || null}
      />
    );
  }

  return (
    <div className="app-shell">
      <TopBar
        navItems={visibleNavItems}
        activePage={activePage}
        setActivePage={setActivePage}
        showProfileMenu={showProfileMenu}
        setShowProfileMenu={setShowProfileMenu}
        onShowNotifications={handleShowNotifications}
        onToggleProfileMenu={handleToggleProfileMenu}
        onLogout={handleLogout}
        user={user}
      />

      <main className="page">
        {activePage === "home" && dashboard && <HomePage dashboard={dashboard} user={user} setActivePage={setActivePage} setSelectedLesson={setSelectedLesson} onCopyLessonLink={handleCopyLessonLink} />}
        {activePage === "profile" && profile && <ProfilePage profile={profile} user={user} setActivePage={setActivePage} onShowDocuments={() => setShowDocuments(true)} onLogout={handleLogout} onSaveProfile={handleProfileSave} profileEditError={profileEditError} setProfileEditError={setProfileEditError} />}
        {activePage === "schedule" && <SchedulePage filteredSchedule={filteredSchedule} scheduleFilters={scheduleFilters} scheduleFilter={scheduleFilter} setScheduleFilter={setScheduleFilter} scheduleView={scheduleView} setScheduleView={setScheduleView} setSelectedLesson={setSelectedLesson} user={user} onCopyLessonLink={handleCopyLessonLink} />}
        {activePage === "tutors" && <TutorsPage tutors={tutors} openTutorModal={openTutorModal} setBookingTutor={openBookingModal} tutorFilter={tutorFilter} setTutorFilter={setTutorFilter} user={user} />}
        {activePage === "reviews" && <ReviewsPage reviewTab={reviewTab} setReviewTab={setReviewTab} reviewCollections={reviewCollections} setReviewModal={setReviewModal} />}
        {activePage === "payment" && <PaymentPage user={user} paymentForm={paymentForm} setPaymentForm={setPaymentForm} paymentTotal={paymentTotal} onPay={handlePayment} paymentError={paymentError} setPaymentError={setPaymentError} financeForm={financeForm} setFinanceForm={setFinanceForm} onWithdraw={handleWithdrawal} financeError={financeError} setFinanceError={setFinanceError} />}
      </main>

      {showNotifications && <NotificationsDrawer groupedNotifications={groupedNotifications} onClose={() => setShowNotifications(false)} onRemoveNotification={handleRemoveNotification} />}
      {showDocuments && profile && <DocumentsModal documents={profile.documents} onClose={() => setShowDocuments(false)} onDownload={startDownload} />}
      {selectedTutor && <TutorModal tutor={selectedTutor} mode={tutorModalMode} setMode={setTutorModalMode} onClose={() => setSelectedTutor(null)} onBook={() => { openBookingModal(selectedTutor); setSelectedTutor(null); }} user={user} />}
      {bookingTutor && <BookingModal tutor={bookingTutor} bookingForm={bookingForm} setBookingForm={setBookingForm} onClose={() => setBookingTutor(null)} onSubmit={handleBookLesson} />}
      {reviewModal && <ReviewModal modal={reviewModal} reviewForm={reviewForm} setReviewForm={setReviewForm} onClose={() => setReviewModal(null)} onSubmit={handleReviewSubmit} />}
      {selectedLesson && <LessonModal lesson={selectedLesson} user={user} onClose={() => setSelectedLesson(null)} onSaveMeetingUrl={handleLessonUpdate} onCancelLesson={handleLessonCancel} onCopyLessonLink={handleCopyLessonLink} />}
      {downloadToast && <div className="toast">{downloadToast}</div>}
    </div>
  );
}

export default App;
