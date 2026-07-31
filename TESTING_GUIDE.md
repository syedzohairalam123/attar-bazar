# 🧪 Attar Bazaar - Live Testing Guide

**Server Running:** http://localhost:3001  
**Status:** Ready for comprehensive testing

## 📋 Testing Checklist

### Phase 1: Initial Setup & Database Connection
- [ ] Open http://localhost:3001 in browser
- [ ] Check if homepage loads correctly
- [ ] Look for any console errors (F12)
- [ ] Verify site styling and layout

### Phase 2: User Registration (Buyer)
- [ ] Click "Sign In" → "Create Account"
- [ ] Select "🛒 I Want to Buy" tab
- [ ] Fill in registration form:
  - Full Name: Test Buyer
  - Email: test.buyer@example.com
  - Phone: +92 300 1234567
  - City: Karachi
  - Password: test123456
- [ ] Click "Create Account"
- [ ] **Expected:** Success message and redirect to homepage
- [ ] **Check:** User is logged in as Buyer

### Phase 3: Buyer Login & Role Selection
- [ ] Logout if logged in
- [ ] Go to http://localhost:3001/auth/login
- [ ] Login with: test.buyer@example.com / test123456
- [ ] **Expected:** Role selection modal appears
- [ ] **Check:** Shows "View as Buyer" and "Become a Seller" options
- [ ] Click "View as Buyer"
- [ ] **Expected:** Redirect to homepage, logged in as Buyer

### Phase 4: CRITICAL TEST - "Become a Seller" Button
- [ ] Logout and login again as test.buyer@example.com
- [ ] In role selection modal, click **"+ Become a Seller / Merchant"**
- [ ] **Expected:** 
  - Success message: "Seller account activated successfully!"
  - Redirect to Seller Dashboard (/seller)
  - User still has same email/auth
- [ ] **Check:** User can now access both Buyer and Seller areas

### Phase 5: Role Switching (Buyer ↔ Seller)
- [ ] While on Seller Dashboard, find role switching in sidebar
- [ ] Click "View as Buyer"
- [ ] **Expected:** Redirect to homepage
- [ ] In navbar user menu, click "View as Seller"
- [ ] **Expected:** Redirect to Seller Dashboard
- [ ] **Repeat:** Switch back and forth multiple times
- [ ] **Check:** No login required, smooth switching

### Phase 6: Seller Dashboard Functionality
- [ ] Navigate to Seller Dashboard
- [ ] **Check:** Dashboard loads without errors
- [ ] **Check:** "My Products" tab works
- [ ] **Check:** "Orders" tab works
- [ ] **Try:** Add a new product (if form is available)
- [ ] **Check:** Role switching still works from seller layout

### Phase 7: User Registration (Seller)
- [ ] Logout completely
- [ ] Register new seller account:
  - Full Name: Test Seller
  - Email: test.seller@example.com
  - Phone: +92 300 7654321
  - City: Lahore
  - WhatsApp: 923007654321
  - Password: test123456
  - Select "💰 I Want to Sell" tab
- [ ] **Expected:** Redirect to Seller Dashboard
- [ ] **Check:** User is logged in as Seller

### Phase 8: Seller "Become a Buyer" Flow
- [ ] Login as test.seller@example.com
- [ ] In role selection/sidebar, click **"+ Become a Buyer"**
- [ ] **Expected:**
  - Success message: "Buyer account activated successfully!"
  - Redirect to homepage
  - User can now switch between Buyer and Seller

### Phase 9: Admin Setup
- [ ] Go to Supabase Dashboard → Table Editor → profiles
- [ ] Find your test user or create admin user
- [ ] Set `is_admin = true` for a user
- [ ] Logout and login as that user
- [ ] **Expected:** "Open Admin Portal" option appears
- [ ] Click "Open Admin Portal"
- [ ] **Expected:** Access to /admin routes

### Phase 10: Admin Portal Testing
- [ ] Navigate to Admin Portal
- [ ] **Check:** Dashboard loads
- [ ] **Check:** All admin menu items work
- [ ] **Check:** Role switching to Buyer/Seller works
- [ ] **Try:** Access admin features (users, listings, etc.)

### Phase 11: Protected Routes Testing
- [ ] Logout completely
- [ ] Try to access http://localhost:3001/admin
- [ ] **Expected:** Redirect to login page
- [ ] Try to access http://localhost:3001/seller
- [ ] **Expected:** Redirect to login page
- [ ] Try to access http://localhost:3001/account
- [ ] **Expected:** Redirect to login page

### Phase 12: Multi-Role User Testing
- [ ] Create a user with all 3 roles (via database)
- [ ] Login as that user
- [ ] **Expected:** All three options appear (Buyer, Seller, Admin)
- [ ] Test switching between all three roles
- [ ] **Check:** Each role loads correct interface

## 🐛 Issue Reporting

If you encounter any issues, please report:
1. **What you were trying to do** (specific step)
2. **What happened instead** (error message, unexpected behavior)
3. **Console errors** (F12 → Console tab)
4. **Network errors** (F12 → Network tab)

## 🔄 Testing Loop

I will monitor the server logs and fix any issues you discover in real-time. We will continue testing until:
- ✅ All registration flows work
- ✅ All login flows work  
- ✅ "Become a Seller/Buyer" buttons work perfectly
- ✅ Role switching works smoothly
- ✅ Admin portal is accessible
- ✅ Protected routes work correctly
- ✅ No console errors
- ✅ No unexpected behaviors

**Current Status:** 🟢 Server running, ready for testing
**Testing URL:** http://localhost:3001