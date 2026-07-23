export default function TermsPage() {
  const sections = [
    { title: '1. Platform Role', body: "Attar Bazaar is a peer-to-peer marketplace platform. We provide the platform only — direct transactions occur between buyers and sellers." },
    { title: '2. Seller Responsibilities', body: "Sellers are responsible for listing only authentic products and responding promptly to buyers." },
    { title: '3. Buyer Responsibilities', body: "Buyers should verify products with the seller before completing a purchase." },
    { title: '4. Prohibited Items', body: "Listing counterfeit perfumes, stolen goods, or any illegal items is strictly prohibited." },
    { title: '5. Payments', body: "Payments are made directly to sellers via JazzCash, EasyPaisa, bank transfer, or cash on delivery. Attar Bazaar does not process payments." },
    { title: '6. Account Termination', body: "We reserve the right to terminate any account that violates these terms." },
  ]
  return (
    <div className="pt-24 pb-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-5xl font-bold mb-2" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Terms of Service</h1>
      <p className="mb-10" style={{ color: '#A89F8F' }}>Last updated: 2024</p>
      <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-8">{sections.map(s => (<div key={s.title}><h2 className="text-xl font-bold mb-3" style={{ color: '#C9A84C', fontFamily: 'Georgia, serif' }}>{s.title}</h2><p className="leading-relaxed" style={{ color: '#A89F8F' }}>{s.body}</p></div>))}</div>
    </div>
  )
}
