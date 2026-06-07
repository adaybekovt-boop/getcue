import { Link, useNavigate } from "react-router-dom";
import {
  IconArrowLeft,
  IconShieldCheck,
  IconAt,
  IconHash,
  IconChevronRight,
  IconBolt,
} from "@tabler/icons-react";
import Avatar from "../components/Avatar.jsx";
import { tgUser, displayName } from "../tgUser.js";

export default function ProfileScreen({ me }) {
  const navigate = useNavigate();
  const isAdmin = !!(me && me.isAdmin);
  const credits = me ? me.credits : null;
  const name = displayName(tgUser);
  const username = tgUser?.username;
  const id = tgUser?.id;

  const balanceText = isAdmin
    ? "∞ Admin"
    : credits == null
    ? "…"
    : `${credits.toLocaleString()} credits`;

  return (
    <div className="app profile">
      <button
        className="btn-glass back rise"
        style={{ "--i": 0 }}
        onClick={() => navigate(-1)}
      >
        <IconArrowLeft size={16} stroke={2} />
        Back
      </button>

      <section className="profile-hero rise" style={{ "--i": 1 }}>
        <Avatar user={tgUser} size={96} />
        <h1 className="profile-name">{name}</h1>
        {username && <div className="profile-username">@{username}</div>}
        {isAdmin && (
          <div className="profile-badge">
            <IconShieldCheck size={14} stroke={2} />
            Admin
          </div>
        )}
      </section>

      <Link
        to="/pro"
        className="profile-card profile-balance rise"
        style={{ "--i": 2 }}
      >
        <span className="pc-left">
          <span className="pc-icon">
            <IconBolt size={20} stroke={2} />
          </span>
          <span className="pc-text">
            <span className="pc-label">Balance</span>
            <span className="pc-value">{balanceText}</span>
          </span>
        </span>
        <IconChevronRight className="pc-chevron" size={18} stroke={2} />
      </Link>

      <section className="profile-card rise" style={{ "--i": 3 }}>
        {username && (
          <div className="pc-row">
            <span className="pc-row-label">
              <IconAt size={16} stroke={2} />
              Username
            </span>
            <span className="pc-row-val">@{username}</span>
          </div>
        )}
        {id != null && (
          <div className="pc-row">
            <span className="pc-row-label">
              <IconHash size={16} stroke={2} />
              Telegram ID
            </span>
            <span className="pc-row-val">{id}</span>
          </div>
        )}
        <div className="pc-row">
          <span className="pc-row-label">
            <IconShieldCheck size={16} stroke={2} />
            Status
          </span>
          <span className="pc-row-val">{isAdmin ? "Admin" : "Member"}</span>
        </div>
      </section>

      {!tgUser && (
        <p className="free-note">
          Open this app inside Telegram to see your profile.
        </p>
      )}
    </div>
  );
}
