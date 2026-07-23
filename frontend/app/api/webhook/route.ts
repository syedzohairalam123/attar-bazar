export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { buildEmail, EmailType } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'syedzohairalam@gmail.com'
const FROM_NAME = process.env.EMAIL_FROM_NAME ?? 'Attar Bazaar'
const FROM_EMAIL = process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? ''
const SECRET = process.env.SUPABASE_WEBHOOK_SECRET ?? ''

function getTransporter() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT ?? 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD
  if (!host || !user || !pass || pass.includes('your-16-character')) return null
  return nodemailer.createTransport({ host, port, secure: process.env.SMTP_SECURE === 'true' || port === 465, auth: { user, pass } })
}

async function sendMail(to: string, type: EmailType, data: Record<string, any>) {
  const transporter = getTransporter()
  if (!transporter) return
  const { subject, html } = buildEmail(type, data, FROM_NAME)
  await transporter.sendMail({ from: `"${FROM_NAME}" <${FROM_EMAIL}>`, to, subject, html }).catch(console.error)
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown'
    const { allowed } = rateLimit(`webhook:${ip}`, 60, 60_000)
    if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const secret = req.headers.get('x-webhook-secret')
    if (SECRET && secret !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { type, table, record, old_record } = await req.json()

    if (table === 'profiles' && type === 'INSERT') {
      await sendMail(ADMIN_EMAIL, 'new_listing_admin', { title: 'New user signup', brand: record.full_name ?? 'Unknown', price: 0, condition: record.role ?? 'buyer', city: record.city ?? '—', sellerName: record.full_name ?? 'Unknown', sellerEmail: '(see Supabase)', id: record.id })
    }
    if (table === 'perfumes' && type === 'INSERT') {
      await sendMail(ADMIN_EMAIL, 'new_listing_admin', { id: record.id, title: record.title, brand: record.brand, price: record.price, condition: record.condition, city: record.city ?? '—', sellerName: '(see Supabase)', sellerEmail: '(see Supabase)' })
    }
    if (table === 'orders' && type === 'INSERT') {
      if (record.buyer_email) {
        await sendMail(record.buyer_email, 'order_placed_buyer', { orderId: record.id, buyerName: record.buyer_name ?? 'Customer', total: record.total_price, paymentMethod: record.payment_method, address: record.delivery_address ?? '—', phone: record.buyer_phone ?? '—', items: [] })
      }
      await sendMail(ADMIN_EMAIL, 'order_placed_admin', { orderId: record.id, buyerName: record.buyer_name ?? '—', buyerEmail: record.buyer_email ?? '—', phone: record.buyer_phone ?? '—', total: record.total_price, paymentMethod: record.payment_method, address: record.delivery_address ?? '—', itemCount: record.quantity ?? 1 })
    }
    if (table === 'orders' && type === 'UPDATE' && old_record?.status !== record.status) {
      if (record.buyer_email) {
        await sendMail(record.buyer_email, 'order_status_update', { orderId: record.id, status: record.status, paymentMethod: record.payment_method })
      }
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[webhook]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
