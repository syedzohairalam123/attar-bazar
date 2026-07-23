export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)' }}><span className="font-bold text-2xl" style={{ color: '#06040E', fontFamily: 'Georgia, serif' }}>A</span></div>
        <div className="flex gap-1.5">{[0,1,2].map(i => (<span key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#C9A84C', animationDelay: `${i * 0.15}s` }} />))}</div>
      </div>
    </div>
  )
}
