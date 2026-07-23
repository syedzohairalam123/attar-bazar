export default function PrivacyPage() {
  const sections = [
    { title: '1. Information We Collect', body: "When you register, we collect your name, email address, phone number, and city." },
    { title: '2. How We Use Your Information', body: "Your information is used for order processing, buyer-seller communication, and account security. We never sell your data." },
    { title: '3. Payment Data', body: "Attar Bazaar does not process or store any card numbers, CVV codes, or banking passwords. We only record which payment method you chose (JazzCash, EasyPaisa, bank transfer, or cash) and the order amount — payment itself is arranged directly between you and the seller." },
    { title: '4. WhatsApp Contact', body: "Your WhatsApp number is only shared with buyers/sellers for direct deal communication." },
    { title: '5. Data Security', body: "Passwords are hashed by Supabase Auth using industry-standard algorithms — we never see or store your raw password. Row Level Security ensures your orders and profile can only be read by you, the relevant seller, and administrators." },
    { title: '6. Contact', body: "For any privacy-related questions, contact us through our Contact page." },
  ]
  return (
    <div className="pt-24 pb-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-5xl font-bold mb-2" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Privacy Policy</h1>
      <p className="mb-10" style={{ color: '#A89F8F' }}>Last updated: 2024</p>
      <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-8">{sections.map(s => (<div key={s.title}><h2 className="text-xl font-bold mb-3" style={{ color: '#C9A84C', fontFamily: 'Georgia, serif' }}>{s.title}</h2><p className="leading-relaxed" style={{ color: '#A89F8F' }}>{s.body}</p></div>))}</div>
    </div>
  )
}
