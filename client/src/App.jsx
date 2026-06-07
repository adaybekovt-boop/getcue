import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { api } from "./api.js";
import MainScreen from "./screens/MainScreen.jsx";
import ProScreen from "./screens/ProScreen.jsx";
import ProfileScreen from "./screens/ProfileScreen.jsx";
import AuroraBackground from "./components/AuroraBackground.jsx";
import BottomNav from "./components/BottomNav.jsx";
import SplashScreen from "./components/SplashScreen.jsx";

export default function App() {
  // Shared account state, loaded once from /api/me.
  const [me, setMe] = useState(null); // { credits, isAdmin, packages, generationCost }
  const [meError, setMeError] = useState(null);

  // Launch splash: visible ~3s, fading the last 400ms, then unmounted.
  const [booting, setBooting] = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  function refreshMe() {
    return api("/api/me")
      .then((data) => {
        setMe(data);
        setMeError(null);
        return data;
      })
      .catch((e) => {
        setMeError(e.message);
        throw e;
      });
  }

  useEffect(() => {
    refreshMe();
  }, []);

  useEffect(() => {
    const fade = setTimeout(() => setSplashFading(true), 2600);
    const done = setTimeout(() => setBooting(false), 3000);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, []);

  const setCredits = (credits) => setMe((prev) => (prev ? { ...prev, credits } : prev));

  return (
    <>
      <AuroraBackground />
      <Routes>
        <Route
          path="/"
          element={
            <MainScreen me={me} meError={meError} setCredits={setCredits} />
          }
        />
        <Route
          path="/pro"
          element={<ProScreen me={me} setCredits={setCredits} refreshMe={refreshMe} />}
        />
        <Route path="/profile" element={<ProfileScreen me={me} />} />
      </Routes>
      <BottomNav />
      {booting && <SplashScreen fadingOut={splashFading} />}
    </>
  );
}
