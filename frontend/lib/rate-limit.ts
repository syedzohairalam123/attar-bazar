// Lightweight in-memory rate limiter for Next.js API routes. Good
// enough to stop a single abusive client (or a WhatsApp/email-spam
// script) from hammering /api/email or /api/webhook hard enough to
// exhaust your SMTP quota or spike server load. For very high traffic
// across multiple server instances, an Upstash/Redis-backed limiter
// is the next step up — this covers the realistic single-instance case.
const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  bucket.count += 1
  return { allowed: true, remaining: limit - bucket.count }
}

// Periodic cleanup so the map doesn't grow unbounded over a long-running process.
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets.entries()) {
      if (now > bucket.resetAt) buckets.delete(key)
    }
  }, 60_000).unref?.()
}
