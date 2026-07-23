import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-center">
      <div>
        <p className="font-bold mb-4" style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(5rem,15vw,8rem)', background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>404</p>
        <h1 className="text-4xl font-bold mb-3" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Page Not Found</h1>
        <p className="mb-8" style={{ color: '#A89F8F' }}>The page you are looking for doesn't exist or has been moved.</p>
        <Link href="/" className="px-8 py-4 rounded-2xl font-semibold inline-flex items-center gap-3 transition-all" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}><ArrowLeft size={18} /> Back to Home</Link>
      </div>
    </div>
  )
}
