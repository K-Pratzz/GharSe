import { Link } from 'react-router-dom';

const WHY = [
  { title: 'Home-style food', body: 'Made the way it is at home, not restaurant-style batch cooking.' },
  { title: 'Affordable', body: 'Priced for students and everyday budgets, not tourist menus.' },
  { title: 'Local cooks', body: 'From someone in your own neighbourhood, not a distant kitchen.' },
  { title: 'Flexible daily menus', body: 'Cooks publish what they are actually making that day.' },
  { title: 'Pickup or short delivery', body: 'Walk over, or get it delivered close by.' },
];

export default function Landing() {
  return (
    <div>
      <section className="max-w-6xl mx-auto px-5 pt-16 pb-14 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="font-display text-5xl leading-tight text-ink">Ghar ka khana,<br />aapke paas.</h1>
          <p className="mt-4 text-lg text-clay max-w-md">
            Fresh home-cooked meals from verified local cooks — for students and
            professionals living away from home.
          </p>
          <div className="mt-7 flex gap-4">
            <Link to="/browse" className="px-6 py-3 rounded-full bg-marigold text-ink font-medium hover:bg-marigold-dark hover:text-ivory transition">
              Find food
            </Link>
            <Link to="/signup/seller" className="px-6 py-3 rounded-full border border-tulsi text-tulsi font-medium hover:bg-tulsi hover:text-ivory transition">
              Become a home cook
            </Link>
          </div>

          <div className="mt-10 flex items-center gap-4 text-sm text-clay">
            <span className="font-medium text-ink">Discover</span>
            <span>→</span>
            <span className="font-medium text-ink">Order</span>
            <span>→</span>
            <span className="font-medium text-ink">Pickup or delivery</span>
          </div>
        </div>

        <div className="bg-white rounded-card border border-marigold-light/50 p-6 shadow-sm">
          <p className="text-sm text-clay mb-3">Today, near you</p>
          <div className="border-b border-marigold-light/40 pb-3 mb-3">
            <p className="font-display text-xl">Rajma Chawal</p>
            <p className="text-sm text-clay">By Anita's Kitchen · 0.8 km away</p>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-tulsi-dark font-semibold">₹80</span>
              <span className="text-clay">8 portions left</span>
            </div>
            <p className="text-xs text-clay mt-1">Ready by 1:30 PM · ★ 4.7</p>
          </div>
          <p className="text-xs text-clay">This is a sample — real listings change daily based on what local cooks are making.</p>
        </div>
      </section>

      <section className="bg-tulsi/5 py-14">
        <div className="max-w-6xl mx-auto px-5">
          <h2 className="font-display text-3xl text-ink mb-8">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <p className="font-display text-4xl text-marigold-dark mb-2">1</p>
              <h3 className="font-medium text-lg mb-1">Discover</h3>
              <p className="text-clay text-sm">Find today's food near you.</p>
            </div>
            <div>
              <p className="font-display text-4xl text-marigold-dark mb-2">2</p>
              <h3 className="font-medium text-lg mb-1">Order</h3>
              <p className="text-clay text-sm">Choose your meal and quantity.</p>
            </div>
            <div>
              <p className="font-display text-4xl text-marigold-dark mb-2">3</p>
              <h3 className="font-medium text-lg mb-1">Pickup or delivery</h3>
              <p className="text-clay text-sm">Get it nearby, however suits you.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-14">
        <h2 className="font-display text-3xl text-ink mb-8">Why GharSe?</h2>
        <div className="grid md:grid-cols-5 gap-6">
          {WHY.map((w) => (
            <div key={w.title}>
              <h3 className="font-medium mb-1">{w.title}</h3>
              <p className="text-sm text-clay">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ink text-ivory/90 py-10">
        <div className="max-w-6xl mx-auto px-5 text-sm">
          <p>
            GharSe lists home cooks who are subject to applicable food-safety and local
            regulatory requirements. Verification status, ingredients, and allergens are
            shown on every listing. Please report any issue through order support.
          </p>
        </div>
      </section>
    </div>
  );
}
