export type EmailType =
  | 'welcome'
  | 'new_device_login'
  | 'order_placed_buyer'
  | 'order_placed_admin'
  | 'order_status_update'
  | 'new_listing_admin'
  | 'contact_form_admin'
  | 'contact_form_user'
  | 'seller_new_order'
  | 'password_reset'

interface EmailPayload { to: string; type: EmailType; data: Record<string, any> }

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  try {
    const res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return res.ok
  } catch { return false }
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', confirmed: 'Confirmed', dispatched: 'Dispatched',
  out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled',
}

export function buildEmail(type: EmailType, data: Record<string, any>, siteName = 'Attar Bazaar') {
  const wrap = (subject: string, body: string) => ({ subject: `${subject} | ${siteName}`, html: layout(siteName, body) })
  switch (type) {
    case 'welcome': return wrap(`Welcome to ${siteName}! 🌸`, welcomeTemplate(data, siteName))
    case 'new_device_login': return wrap('New Login Alert — Security Notice 🔐', newDeviceTemplate(data, siteName))
    case 'order_placed_buyer': return wrap(`Order Confirmed #${(data.orderId ?? '').toString().slice(0, 8).toUpperCase()} ✅`, orderBuyerTemplate(data, siteName))
    case 'order_placed_admin': return wrap(`New Order Received 🛒`, orderAdminTemplate(data, siteName))
    case 'order_status_update': return wrap(`Order Status Update — ${STATUS_LABEL[data.status] ?? data.status} 📦`, orderStatusTemplate(data, siteName))
    case 'new_listing_admin': return wrap(`New Listing: ${data.title}`, newListingTemplate(data, siteName))
    case 'contact_form_admin': return wrap(`Contact Form Message from ${data.name}`, contactAdminTemplate(data, siteName))
    case 'contact_form_user': return wrap(`We received your message!`, contactUserTemplate(data, siteName))
    case 'seller_new_order': return wrap(`Someone ordered your perfume! 🎉`, sellerOrderTemplate(data, siteName))
    case 'password_reset': return wrap('Reset Your Password 🔑', passwordResetTemplate(data, siteName))
    default: return wrap('Notification', `<p>${JSON.stringify(data)}</p>`)
  }
}

function layout(siteName: string, content: string) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${siteName}</title></head>
<body style="margin:0;padding:0;background:#FAF8F3;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F3;">
<tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:linear-gradient(135deg,#06040E,#13112A);border-radius:20px 20px 0 0;padding:28px 40px;text-align:center;">
<div style="display:inline-flex;align-items:center;gap:12px;">
<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#C9A84C,#E8CC7A);display:inline-flex;align-items:center;justify-content:center;">
<span style="color:#06040E;font-weight:800;font-size:16px;font-family:Georgia,serif;">A</span></div>
<span style="color:#C9A84C;font-family:Georgia,serif;font-size:24px;font-weight:700;">${siteName}</span></div>
<p style="color:#A89F8F;font-size:11px;margin:6px 0 0;letter-spacing:2px;text-transform:uppercase;">Pakistan's Luxury Perfume Marketplace</p>
</td></tr>
<tr><td style="height:3px;background:linear-gradient(90deg,#9A7A30,#C9A84C,#E8CC7A,#C9A84C,#9A7A30);"></td></tr>
<tr><td style="background:#FFFFFF;padding:36px 40px;border-radius:0 0 20px 20px;">${content}</td></tr>
<tr><td style="padding:24px 0;text-align:center;">
<p style="color:#A89F8F;font-size:11px;margin:0 0 8px;">© ${new Date().getFullYear()} ${siteName} — Pakistan's #1 Perfume Marketplace</p>
</td></tr>
</table></td></tr></table></body></html>`
}

const h1 = (t: string) => `<h1 style="color:#0D0B1F;font-family:Georgia,serif;font-size:26px;font-weight:700;margin:0 0 14px;line-height:1.2;">${t}</h1>`
const p = (t: string) => `<p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 14px;">${t}</p>`
const btn = (url: string, text: string) => `<a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#E8CC7A);color:#06040E;text-decoration:none;padding:13px 30px;border-radius:50px;font-weight:700;font-size:14px;">⟶ ${text}</a>`
const table = (rows: [string, string][], border = '#C9A84C') =>
  `<table width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid ${border};border-radius:12px;overflow:hidden;margin:18px 0;">
  ${rows.map(([k, v]) => `<tr><td style="padding:10px 16px;color:#6B6358;font-size:13px;width:40%;border-bottom:1px solid #F0ECE4;">${k}</td><td style="padding:10px 16px;color:#1A1A2E;font-size:13px;font-weight:600;border-bottom:1px solid #F0ECE4;">${v}</td></tr>`).join('')}
  </table>`
const box = (icon: string, text: string, bg = '#FFF8E6', border = '#C9A84C') =>
  `<div style="background:${bg};border-left:4px solid ${border};border-radius:8px;padding:14px;margin:16px 0;display:flex;align-items:flex-start;gap:10px;">
  <span style="font-size:18px;">${icon}</span><p style="margin:0;color:#444;font-size:13px;line-height:1.6;">${text}</p></div>`

function welcomeTemplate(d: any, siteName: string) {
  return `${h1(`Welcome, ${d.name ?? 'there'}! 🌸`)}
${p(`Your <strong>${siteName}</strong> account has been created successfully.`)}
${table([['Email', d.email ?? '—'], ['Account Type', d.role === 'seller' ? '💰 Seller Account' : '🛒 Buyer Account'], ['Joined', new Date().toLocaleDateString('en-PK', { dateStyle: 'long' })]])}
${d.role === 'seller' ? box('💡', 'Head to your Seller Dashboard to create your first listing and add your WhatsApp number so buyers can reach you.') : box('💡', 'Browse by city, condition, brand, and price to find exactly what you are looking for!')}
<div style="text-align:center;margin:28px 0;">${btn(d.role === 'seller' ? 'https://attarbazaar.pk/seller' : 'https://attarbazaar.pk/products', d.role === 'seller' ? 'Go to Seller Dashboard' : 'Explore Fragrances')}</div>`
}

function newDeviceTemplate(d: any, siteName: string) {
  return `${h1('New Device Login Detected 🔐')}
${box('⚠️', `A login to your account was detected from a <strong>new device or location</strong>. If this was you, no action is needed.`, '#FFF3CD', '#FF9800')}
${table([['Login Time', d.time ?? new Date().toLocaleString('en-PK')], ['Device', d.device ?? 'Unknown Device'], ['Location', d.location ?? 'Pakistan']], '#FF9800')}
${p('If you <strong>did not log in</strong>, please reset your password immediately:')}
<div style="text-align:center;margin:24px 0;">${btn('https://attarbazaar.pk/auth/forgot', 'Reset Password Now')}</div>`
}

function orderBuyerTemplate(d: any, siteName: string) {
  const items = (d.items ?? []).map((i: any) =>
    `<tr><td style="padding:11px 16px;border-bottom:1px solid #F0ECE4;color:#1A1A2E;font-size:13px;">${i.brand} — ${i.title}</td>
     <td style="padding:11px 16px;border-bottom:1px solid #F0ECE4;color:#6B6358;font-size:12px;text-align:center;">×${i.quantity}</td>
     <td style="padding:11px 16px;border-bottom:1px solid #F0ECE4;color:#C9A84C;font-size:13px;font-weight:700;text-align:right;">Rs ${(i.price * i.quantity).toLocaleString()}</td></tr>`).join('')
  return `${h1('Order Confirmed! ✅')}
${p(`Thank you, <strong>${d.buyerName ?? 'valued customer'}</strong>! Your order has been received.`)}
<div style="background:linear-gradient(135deg,#06040E,#13112A);border-radius:14px;padding:18px;text-align:center;margin:18px 0;">
<p style="color:#A89F8F;font-size:11px;letter-spacing:2px;margin:0 0 6px;text-transform:uppercase;">Order Reference</p>
<p style="color:#C9A84C;font-family:Georgia,serif;font-size:26px;font-weight:700;margin:0;">#${(d.orderId ?? '').toString().slice(0, 8).toUpperCase()}</p>
</div>
<table width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid #C9A84C;border-radius:12px;overflow:hidden;margin:18px 0;">
<tr style="background:#FAF8F3;"><th style="padding:10px 16px;color:#6B6358;font-size:11px;text-align:left;text-transform:uppercase;">Item</th><th style="padding:10px 16px;color:#6B6358;font-size:11px;text-transform:uppercase;">Qty</th><th style="padding:10px 16px;color:#6B6358;font-size:11px;text-transform:uppercase;text-align:right;">Price</th></tr>
${items}
<tr style="background:#FAF8F3;"><td colspan="2" style="padding:13px 16px;color:#1A1A2E;font-weight:700;">Total</td><td style="padding:13px 16px;color:#C9A84C;font-size:17px;font-weight:800;text-align:right;">Rs ${(d.total ?? 0).toLocaleString()}</td></tr>
</table>
${table([['Payment Method', (d.paymentMethod ?? '—').toUpperCase()], ['Delivery Address', d.address ?? '—'], ['Phone', d.phone ?? '—']])}
${box('📱', 'The seller will contact you on WhatsApp shortly to arrange delivery.')}
<div style="text-align:center;margin:24px 0;">${btn('https://attarbazaar.pk/account', 'Track My Order')}</div>`
}

function orderAdminTemplate(d: any, siteName: string) {
  return `${h1('New Order Received! 🛒')}
${box('🎉', `<strong>${d.buyerName}</strong> has placed a new order.`, '#F0FFF4', '#25D366')}
${table([['Order ID', `#${(d.orderId ?? '').toString().slice(0, 8).toUpperCase()}`], ['Buyer Name', d.buyerName ?? '—'], ['Buyer Email', d.buyerEmail ?? '—'], ['Buyer Phone', d.phone ?? '—'], ['Items', `${d.itemCount ?? 1} item(s)`], ['Total Amount', `Rs ${(d.total ?? 0).toLocaleString()}`], ['Payment Method', (d.paymentMethod ?? '—').toUpperCase()], ['Delivery Address', d.address ?? '—']])}
<div style="text-align:center;margin:24px 0;">${btn('https://attarbazaar.pk/admin/orders', 'View in Admin Panel')}</div>`
}

function orderStatusTemplate(d: any, siteName: string) {
  const emojis: Record<string, string> = { confirmed: '✅', dispatched: '📦', out_for_delivery: '🚚', delivered: '🎁', cancelled: '❌', pending: '⏳' }
  const colors: Record<string, string> = { confirmed: '#25D366', dispatched: '#2196F3', out_for_delivery: '#2196F3', delivered: '#C9A84C', cancelled: '#FF5252', pending: '#FF9800' }
  const emoji = emojis[d.status] ?? '📦'
  const color = colors[d.status] ?? '#C9A84C'
  const label = STATUS_LABEL[d.status] ?? d.status
  return `${h1(`Order Status Update ${emoji}`)}
${p(`Your order <strong>#${(d.orderId ?? '').toString().slice(0, 8).toUpperCase()}</strong> status has been updated:`)}
<div style="background:${color}15;border:2px solid ${color};border-radius:14px;padding:22px;text-align:center;margin:22px 0;">
<p style="margin:0 0 4px;color:#6B6358;font-size:12px;text-transform:uppercase;">New Status</p>
<p style="margin:0;color:${color};font-size:28px;font-weight:800;font-family:Georgia,serif;">${emoji} ${label}</p>
</div>
${d.status === 'dispatched' ? box('📦', 'Your parcel has been dispatched by the seller.')
  : d.status === 'out_for_delivery' ? box('🚚', 'Your parcel is out for delivery — it should arrive today or tomorrow!')
  : d.status === 'delivered' ? box('🎁', 'Delivered! Please consider leaving a review for the seller.', '#FFF8E6', '#C9A84C')
  : d.status === 'cancelled' ? box('❌', 'Your order has been cancelled. Contact us if you have questions.', '#FFF0F0', '#FF5252') : ''}
<div style="text-align:center;margin:24px 0;">${btn('https://attarbazaar.pk/account', 'View My Orders')}</div>`
}

function newListingTemplate(d: any, siteName: string) {
  return `${h1('New Perfume Listed! 🧴')}
${p('A seller has created a new listing. Please review it.')}
${table([['Title', d.title ?? '—'], ['Brand', d.brand ?? '—'], ['Price', `Rs ${(d.price ?? 0).toLocaleString()}`], ['Condition', d.condition ?? '—'], ['City', d.city ?? '—'], ['Seller', d.sellerName ?? '—'], ['Seller Email', d.sellerEmail ?? '—']])}
<div style="text-align:center;margin:20px 0 12px;">${d.id ? btn(`https://attarbazaar.pk/products/${d.id}`, 'View Listing') : ''}</div>
<div style="text-align:center;">${btn('https://attarbazaar.pk/admin/listings', 'Manage in Admin Panel')}</div>`
}

function contactAdminTemplate(d: any, siteName: string) {
  return `${h1('New Contact Form Message 📩')}
${box('📬', `<strong>${d.name}</strong> has submitted a contact form.`)}
${table([['Name', d.name ?? '—'], ['Email', d.email ?? '—'], ['Phone', d.phone ?? '—'], ['Subject', d.subject ?? 'No subject']])}
<div style="background:#FAF8F3;border-radius:10px;padding:18px;margin:16px 0;border:1px solid #E8E0D0;"><p style="color:#6B6358;font-size:11px;text-transform:uppercase;margin:0 0 8px;">Message</p><p style="color:#1A1A2E;font-size:14px;line-height:1.7;margin:0;">${d.message ?? ''}</p></div>
<div style="text-align:center;margin:20px 0;">${btn(`mailto:${d.email}`, 'Reply to User')}</div>`
}

function contactUserTemplate(d: any, siteName: string) {
  return `${h1(`Thank you, ${d.name ?? ''}! 💌`)}
${p('We have received your message and will reply within 24 hours.')}
${box('💡', 'For urgent matters, you can also reach us on WhatsApp.')}`
}

function sellerOrderTemplate(d: any, siteName: string) {
  return `${h1('Your Perfume Has Been Ordered! 🎉')}
${box('🛒', `<strong>${d.buyerName}</strong> has ordered your <strong>${d.perfumeTitle}</strong>. Please contact them promptly!`, '#F0FFF4', '#25D366')}
${table([['Perfume', `${d.perfumeBrand} — ${d.perfumeTitle}`], ['Quantity', String(d.quantity ?? 1)], ['Total Amount', `Rs ${(d.total ?? 0).toLocaleString()}`], ['Buyer Name', d.buyerName ?? '—'], ['Buyer Phone', d.buyerPhone ?? '—'], ['Payment Method', (d.paymentMethod ?? '—').toUpperCase()]])}
<div style="text-align:center;margin:24px 0 12px;">${d.buyerPhone ? btn(`https://wa.me/${(d.buyerPhone ?? '').replace(/[^0-9]/g, '')}`, '💬 Contact Buyer on WhatsApp') : ''}</div>
<div style="text-align:center;">${btn('https://attarbazaar.pk/seller/orders', 'My Orders')}</div>`
}

function passwordResetTemplate(d: any, siteName: string) {
  return `${h1('Reset Your Password 🔑')}
${p('You requested a password reset. This link expires in 15 minutes.')}
<div style="text-align:center;margin:28px 0;">${btn(d.resetUrl ?? '#', 'Reset My Password')}</div>
${box('⚠️', 'If you did not request this, please ignore this email — your account is safe.', '#FFF3CD', '#FF9800')}`
}
