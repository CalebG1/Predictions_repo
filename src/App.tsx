import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header";
import CategoryNav from "./components/CategoryNav";
import Overview from "./pages/Overview";
import QuestionDetail from "./pages/QuestionDetail";
import RiskMatrix from "./pages/RiskMatrix";
import Calibration from "./pages/Calibration";
import Decision from "./pages/Decision";
import Movers from "./pages/Movers";

export default function App() {
  return (
    <>
      <Header />
      <CategoryNav />
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/q/:id" element={<QuestionDetail />} />
        <Route path="/matrix" element={<RiskMatrix />} />
        <Route path="/calibration" element={<Calibration />} />
        <Route path="/decision" element={<Decision />} />
        <Route path="/movers" element={<Movers />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
