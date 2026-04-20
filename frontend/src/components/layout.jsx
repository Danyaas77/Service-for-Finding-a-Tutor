import { Bell, ChevronDown, CreditCard, LogOut, UserCircle2 } from "lucide-react";

export function TopBar({ navItems, activePage, setActivePage, showProfileMenu, setShowProfileMenu, onShowNotifications, onLogout, user, onToggleProfileMenu }) {
  const paymentLabel = user?.role === "teacher" ? "Финансовый кабинет" : "Оплата";
  return (
    <header className="topbar">
      <div className="logo">OKTIQ</div>
      <nav className="nav">
        {navItems.map(({ key, label, icon: Icon }) => (
          <button key={key} className={`nav-pill ${activePage === key ? "active" : ""}`} onClick={() => setActivePage(key)}>
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>
      <div className="topbar-actions">
        <button className="icon-button" onClick={onShowNotifications}>
          <Bell size={18} />
        </button>
        <div className="profile-menu-wrap">
          <button className="profile-chip" onClick={onToggleProfileMenu}>
            <img src={user?.avatar_url} alt={user?.full_name} />
            <span>{user?.full_name?.split(" ")[0]}</span>
            <ChevronDown size={16} />
          </button>
          {showProfileMenu && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-head">
                <strong>{user.full_name}</strong>
                <span>{user.phone}</span>
              </div>
              <button className="dropdown-link" onClick={() => { setActivePage("profile"); setShowProfileMenu(false); }}>
                <UserCircle2 size={16} /> Мой профиль
              </button>
              <button className="dropdown-link" onClick={() => { setActivePage("payment"); setShowProfileMenu(false); }}>
                <CreditCard size={16} /> {paymentLabel}
              </button>
              <button className="dropdown-link danger" onClick={onLogout}>
                <LogOut size={16} /> Выйти из аккаунта
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
