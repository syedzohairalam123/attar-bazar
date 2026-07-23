export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { buildEmail, EmailType } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'syedzohairalam@gmail.com'
const FROM_NAME = process.env.EMAIL_FROM_NAME ?? 'Attar Bazaar'
const FROM_EMAIL = process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? ''
const ADMIN_TYPES: EmailType[] = ['order_placed_admin', 'new_listing_admin', 'contact_form_admin']

function getTransporter() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT ?? 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD
  if (!host || !user || !pass || pass.includes('your-16-character')) return null
  return nodemailer.createTransport({ host, port, secure: process.env.SMTP_SECURE === 'true' || port === 465, auth: { user, pass } })
}

export async function POST(req: NextRequest) {
  try {
    // Basic abuse protection: 20 emails per minute per client IP. Stops
    // a script from spamming this endpoint and burning through SMTP quota.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown'
    const { allowed } = rateLimit(`email:${ip}`, 20, 60_000)
    if (!allowed) return NextResponse.json({ error: 'Too many requests, please slow down.' }, { status: 429 })

    const body = await req.json()
    const { to, type, data }: { to: string; type: EmailType; data: Record<string, any> } = body
    if (!to || !type) return NextResponse.json({ error: 'Missing to or type' }, { status: 400 })

    const transporter = getTransporter()
    if (!transporter) {
      console.log(`[Email] SMTP not configured — skipping email to ${to} (type: ${type}).`)
      return NextResponse.json({ success: true, skipped: true, reason: 'SMTP not configured' })
    }

    const recipient = ADMIN_TYPES.includes(type) ? ADMIN_EMAIL : to
    const { subject, html } = buildEmail(type, data, FROM_NAME)
    await transporter.sendMail({ from: `"${FROM_NAME}" <${FROM_EMAIL}>`, to: recipient, subject, html })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[/api/email]', err?.message ?? err)
    return NextResponse.json({ success: false, error: err?.message ?? 'Email send failed' }, { status: 200 })
  }
}
