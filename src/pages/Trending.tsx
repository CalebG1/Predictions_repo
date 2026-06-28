import FeaturedCard from "../components/FeaturedCard";
import MarketCard from "../components/MarketCard";
import Sidebar from "../components/Sidebar";
import { corporateFinance } from "../data";

export default function Trending() {
  return (
    <div className="page">
      <main>
        <FeaturedCard />

        <div className="section-head">
          {corporateFinance.title} <span className="chev">›</span>
        </div>
        <div className="card-grid">
          {corporateFinance.markets.map((m) => (
            <MarketCard key={m.id} market={m} />
          ))}
        </div>
      </main>
      <Sidebar />
    </div>
  );
}
