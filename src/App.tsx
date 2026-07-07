import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header";
import CategoryNav from "./components/CategoryNav";
import Overview from "./pages/Overview";
import QuestionDetail from "./pages/QuestionDetail";
import QuestionEmbed from "./pages/QuestionEmbed";
import Movers from "./pages/Movers";
import Settings from "./pages/Settings";
import Methodology from "./pages/settings/Methodology";
import Context from "./pages/settings/Context";
import Profile from "./pages/settings/Profile";
import ForecastProcessing from "./pages/ForecastProcessing";
import Cybersecurity from "./pages/Cybersecurity";

function AppShell() {
  return (
    <>
      <Header />
      <CategoryNav />
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/forecast/:jobId/processing" element={<ForecastProcessing />} />
        <Route path="/q/:id" element={<QuestionDetail />} />
        <Route path="/movers" element={<Movers />} />
        <Route path="/cybersecurity" element={<Cybersecurity />} />
        <Route path="/settings" element={<Settings />}>
          <Route index element={<Navigate to="methodology" replace />} />
          <Route path="methodology" element={<Methodology />} />
          <Route path="context" element={<Context />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/embed/q/:id" element={<QuestionEmbed />} />
      <Route path="/*" element={<AppShell />} />
    </Routes>
  );
}
