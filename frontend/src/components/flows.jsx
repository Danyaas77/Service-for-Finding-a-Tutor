import { useEffect, useRef, useState } from "react";
import IMask from "imask";
import { Check, GraduationCap, UserRound } from "lucide-react";
import { formatCurrency } from "../utils";

function PhoneMaskedInput({ value, onChange, error }) {
  const inputRef = useRef(null);
  const maskRef = useRef(null);

  useEffect(() => {
    if (!inputRef.current) {
      return undefined;
    }

    maskRef.current = IMask(inputRef.current, {
      mask: [
        { mask: "+0 (000) 000-00-00", lazy: false },
        { mask: "+00 000 000 0000[0][0]", lazy: false },
        { mask: "+000 000 000 000[0][0][0]", lazy: false },
      ],
      dispatch(appended, dynamicMasked) {
        const nextValue = `${dynamicMasked.value}${appended}`.replace(/\D/g, "");
        if (!nextValue.length) {
          return dynamicMasked.compiledMasks[0];
        }
        if (nextValue[0] === "7" || nextValue[0] === "8" || nextValue.length <= 11) {
          return dynamicMasked.compiledMasks[0];
        }
        if (nextValue.length <= 12) {
          return dynamicMasked.compiledMasks[1];
        }
        return dynamicMasked.compiledMasks[2];
      },
    });

    maskRef.current.on("accept", () => {
      onChange(maskRef.current.value);
    });

    maskRef.current.value = value || "+7";

    return () => {
      maskRef.current?.destroy();
      maskRef.current = null;
    };
  }, [onChange]);

  useEffect(() => {
    if (maskRef.current && value !== maskRef.current.value) {
      maskRef.current.value = value || "+7";
    }
  }, [value]);

  return <input ref={inputRef} type="tel" className={error ? "input error" : "input"} />;
}

export function AuthFlow({ authMode, setAuthMode, phone, setPhone, password, setPassword, passwordRepeat, setPasswordRepeat, error, onSubmit, isSubmitting }) {
  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-card">
          <>
            <h1>{authMode === "login" ? "Здравствуйте!" : "Регистрация"}</h1>
            <p>{authMode === "login" ? "Введите номер телефона и пароль, чтобы войти в личный кабинет" : "Введите номер телефона и придумайте пароль для нового аккаунта"}</p>
            <PhoneMaskedInput value={phone} onChange={setPhone} error={error} />
            <input
              type="password"
              className={error ? "input error" : "input"}
              value={password}
              placeholder="Пароль"
              onChange={(event) => setPassword(event.target.value)}
            />
            {authMode === "register" && (
              <>
                <input
                  type="password"
                  className={error ? "input error" : "input"}
                  value={passwordRepeat}
                  placeholder="Повторите пароль"
                  onChange={(event) => setPasswordRepeat(event.target.value)}
                />
                <div className="muted auth-hint">Минимум 8 символов, хотя бы одна латинская буква и одна цифра.</div>
              </>
            )}
            {error && <span className="field-error">{error}</span>}
            <button className="primary-button" onClick={onSubmit}>
              {isSubmitting ? "Проверяем..." : authMode === "login" ? "Войти" : "Зарегистрироваться"}
            </button>
            <button className="link-button auth-switch" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>
              {authMode === "login" ? "Нет аккаунта? Регистрация" : "Уже есть аккаунт? Войти"}
            </button>
            <small>Нажимая кнопку, вы соглашаетесь с Политикой конфиденциальности и Пользовательским соглашением.</small>
          </>
        </div>
      </div>
      <div className="auth-visual">
        <div className="brand">OKTIS</div>
        <img
          src="https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=1200&q=80"
          alt="Mascot"
        />
        <div className="glass-note">
          <strong>{authMode === "login" ? "Рад встрече!" : "Создадим аккаунт"}</strong>
          <span>{authMode === "login" ? "Я уже подготовил все инструменты. Осталось только войти в кабинет." : "Сначала зарегистрируем профиль, а затем настроим роль и сценарий работы."}</span>
        </div>
      </div>
    </div>
  );
}

export function OnboardingFlow({ step, setStep, user, selectedRole, setSelectedRole, onDownload, onFinish, onRoleContinue, toast, onboardingPlan = [], agreementDocument = null }) {
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  useEffect(() => {
    if (step === "agreement-intro") {
      setAgreementAccepted(false);
    }
  }, [step]);

  return (
    <div className="auth-shell onboarding-shell">
      <div className="auth-panel">
        <div className={`auth-card onboarding-card ${step === "role-select" ? "role-select-card" : ""}`}>
          {step === "role-select" && (
            <>
              <h1>Кто вы?</h1>
              <p>Выберите роль, чтобы мы настроили кабинет и подходящий сценарий входа.</p>
              <div className="role-grid">
                <button className={`role-card ${selectedRole === "student" ? "active" : ""}`} onClick={() => setSelectedRole("student")}>
                  <div className="role-card-head">
                    <UserRound size={26} />
                    <strong>Ученик</strong>
                  </div>
                  <span className="role-card-copy">Учиться, выбирать репетиторов, оплачивать уроки и отслеживать расписание.</span>
                </button>
                <button className={`role-card ${selectedRole === "teacher" ? "active" : ""}`} onClick={() => setSelectedRole("teacher")}>
                  <div className="role-card-head">
                    <GraduationCap size={26} />
                    <strong>Преподаватель</strong>
                  </div>
                  <span className="role-card-copy">Вести занятия, работать с расписанием и управлять своей карточкой преподавателя.</span>
                </button>
              </div>
              <button className="primary-button" disabled={!selectedRole} onClick={onRoleContinue}>
                Продолжить
              </button>
            </>
          )}
          {step === "welcome" && (
            <>
              <h1>Добро пожаловать, {user.full_name.split(" ")[0]}!</h1>
              <p>Подготовили для вас персональный план обучения</p>
              <div className="plan-list">
                {onboardingPlan.length > 0 ? onboardingPlan.map((item, index) => (
                  <div className="plan-row" key={`${item.teacher_id}-${item.subject_name}-${index}`}>
                    <img src={item.teacher_avatar} alt={item.teacher_name} />
                    <div className="plan-row-copy">
                      <strong className="plan-row-title">{item.subject_name}</strong>
                      <span className="plan-row-subtitle">{item.teacher_name}</span>
                    </div>
                    <div className="price-badge">
                      <strong className="price-badge-value">{formatCurrency(item.price)} ₽</strong>
                      <span className="price-badge-note">за урок</span>
                    </div>
                  </div>
                )) : (
                  <div className="empty-plan">
                    <strong>План обучения пока не сформирован</strong>
                    <span>После публикации преподавателей и предметов рекомендации появятся здесь автоматически.</span>
                  </div>
                )}
              </div>
              <small>Стоимость зафиксирована до конца учебного года. Об изменениях сообщим заранее.</small>
              <button className="primary-button" onClick={() => setStep("agreement-intro")}>
                Далее
              </button>
            </>
          )}
          {step === "teacher-welcome" && (
            <>
              <div className="step-badges">
                <div className="step-badge active">Роль выбрана</div>
              </div>
              <h1>Добро пожаловать, преподаватель!</h1>
              <p>Мы подготовили кабинет для преподавателя. Дальше вы сможете заполнить профиль, настроить предметы и расписание.</p>
              <div className="role-summary-card">
                <strong>Что дальше</strong>
                <span>Добавьте предметы, стоимость занятий и свободные слоты, чтобы ученики могли записываться на уроки.</span>
              </div>
              <button className="primary-button" onClick={onFinish}>
                Перейти в кабинет
              </button>
            </>
          )}
          {step === "agreement-intro" && (
            <>
              <div className="step-badges">
                <div className="step-badge active">1 из 2</div>
                <div className="step-badge">Почти готово</div>
              </div>
              <h1>Договор</h1>
              <p>Договор оказания образовательных услуг</p>
              <div className="document-row large">
                <div>
                  <strong>{agreementDocument?.title || "Договор пока не загружен"}</strong>
                  <span>{agreementDocument ? `от ${agreementDocument.date} • ${agreementDocument.size_label}` : "Загрузите договор через админку, чтобы открыть следующий шаг"}</span>
                </div>
                <button className="secondary-button small" onClick={() => onDownload(agreementDocument)}>
                  Скачать
                </button>
              </div>
              <label className="checkbox-line">
                <input type="checkbox" checked={agreementAccepted} onChange={(event) => setAgreementAccepted(event.target.checked)} />
                <span>С тарифами и условиями договора ознакомлен</span>
              </label>
              <button className="primary-button" disabled={!agreementAccepted || !agreementDocument?.file_url} onClick={() => setStep("agreement-sign")}>
                Подписать и войти
              </button>
            </>
          )}
          {step === "agreement-sign" && (
            <>
              <div className="step-badges">
                <div className="step-badge done">
                  <Check size={16} /> Шаг 2
                </div>
              </div>
              <h1>Все готово!</h1>
              <p>Ваш личный кабинет настроен. Можно переходить к занятиям.</p>
              <button className="primary-button" onClick={onFinish}>
                Открыть кабинет
              </button>
            </>
          )}
        </div>
      </div>
      <div className="auth-visual">
        <div className="brand">OKTIS</div>
        <img
          src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80"
          alt="Onboarding"
        />
        <div className="glass-note">
          <strong>
            {step === "role-select" && "Настроим кабинет"}
            {step === "welcome" && "Ваш план обучения"}
            {step === "teacher-welcome" && "Кабинет преподавателя"}
            {step === "agreement-intro" && "Подпишите договор"}
            {step === "agreement-sign" && "Все готово"}
          </strong>
          <span>
            {step === "role-select" && "Сначала определим ваш сценарий использования, а затем покажем нужные шаги."}
            {step === "welcome" && "Мы подобрали предметы и преподавателей под ваши цели."}
            {step === "teacher-welcome" && "Сейчас важнее всего подтвердить роль и завершить первичную настройку."}
            {step === "agreement-intro" && "Остался последний шаг перед началом занятий."}
            {step === "agreement-sign" && "Личный кабинет уже почти готов к работе."}
          </span>
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
