import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header";
import CategoryNav from "./components/CategoryNav";
import Trending from "./pages/Trending";
import Elections from "./pages/Elections";

export default function App() {
  return (
    <>
      <Header />
      <CategoryNav />
      <Routes>
        <Route path="/" element={<Trending />} />
        <Route path="/elections" element={<Elections />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
