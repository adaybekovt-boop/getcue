import { Link, useLocation } from "react-router-dom";
import {
  IconPencil,
  IconPhoto,
  IconClockHour3,
  IconSettings2,
} from "@tabler/icons-react";

const TABS = [
  { to: "/", label: "Text", Icon: IconPencil },
  { to: "/image", label: "Image", Icon: IconPhoto },
  { to: "/history", label: "History", Icon: IconClockHour3 },
  { to: "/settings", label: "Settings", Icon: IconSettings2 },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {TABS.map(({ to, label, Icon }) => {
        const active = to === pathname;
        return (
          <Link
            key={to}
            to={to}
            className={"nav-item" + (active ? " active" : "")}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={20} stroke={active ? 2 : 1.6} />
            <span className="nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
