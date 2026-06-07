import { useState } from "react";
import { IconUser } from "@tabler/icons-react";

// Circular Telegram avatar. Shows the user's photo when available; falls back
// to the first initial, then to a generic user glyph. Handles broken image
// URLs by switching to the initial fallback.
export default function Avatar({ user, size = 40 }) {
  const [broken, setBroken] = useState(false);
  const photo = user?.photo_url;
  const name = user?.first_name || user?.username || "";
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <span className="avatar" style={{ width: size, height: size }}>
      {photo && !broken ? (
        <img
          className="avatar-img"
          src={photo}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : initial ? (
        <span className="avatar-initial" style={{ fontSize: Math.round(size * 0.42) }}>
          {initial}
        </span>
      ) : (
        <IconUser size={Math.round(size * 0.55)} stroke={1.8} />
      )}
    </span>
  );
}
