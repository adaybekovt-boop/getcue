import { Link } from "react-router-dom";
import { IconBolt } from "@tabler/icons-react";
import Avatar from "./Avatar.jsx";
import { tgUser } from "../tgUser.js";

// Sticky glass app bar shared across screens: profile avatar + gradient logo
// on the left, credit balance pill on the right.
export default function AppHeader({ me }) {
  const isAdmin = !!(me && me.isAdmin);
  const credits = me ? me.credits : null;
  return (
    <header className="appbar">
      <div className="appbar-inner">
        <div className="appbar-left">
          <Link to="/profile" className="avatar-btn" aria-label="Open profile">
            <Avatar user={tgUser} size={38} />
          </Link>
          <h1 className="logo">Cue</h1>
        </div>
        <Link to="/pro" className="credits-pill" aria-label="Your credit balance">
          <IconBolt className="pill-icon" size={15} stroke={2} />
          {isAdmin ? "Admin ∞" : `${credits ?? "…"} credits`}
        </Link>
      </div>
    </header>
  );
}
