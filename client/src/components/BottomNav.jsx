import { Link, useLocation } from "react-router-dom";
import { IconSparkles, IconCoins } from "@tabler/icons-react";

const TABS = [
  { to: "/", label: "Generate", Icon: IconSparkles },
  { to: "/pro", label: "Credits", Icon: IconCoins },
];

// Fixed glass tab bar. A single indicator pill slides between tabs with a
// springy ease for a fluid, native-feeling transition.
export default function BottomNav() {
  const { pathname } = useLocation();
  const activeIndex = TABS.findIndex((t) => t.to === pathname);
  const hasActive = activeIndex >= 0; // e.g. /profile matches no tab

  return (
    <nav className="bottom-nav" aria-label="Primary">
      <div className="bottom-nav-inner">
        <span
          className="nav-indicator"
          style={{
            transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
            opacity: hasActive ? 1 : 0,
          }}
          aria-hidden="true"
        />
        {TABS.map(({ to, label, Icon }) => {
          const active = to === pathname;
          return (
            <Link
              key={to}
              to={to}
              className={"nav-item" + (active ? " nav-item-active" : "")}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={22} stroke={active ? 2 : 1.6} />
              <span className="nav-label">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
