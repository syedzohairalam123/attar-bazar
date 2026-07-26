'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ShoppingBag, Store, Shield, ArrowRight, Loader2 } from 'lucide-react';

export default function RoleSelectionModal({ profile, onUpgrade }: { profile: any, onUpgrade?: (role: string) => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleNavigation = (path: string) => {
    setLoading(true);
    router.push(path);
  };

  const handleBecomeSeller = () => {
    setLoading(true);
    try {
      if (onUpgrade) {
        onUpgrade('seller');
      } else {
        // If no onUpgrade callback provided, navigate to seller dashboard directly
        // This handles the case where role is already activated via other means
        router.push('/seller');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      setLoading(false);
    }
  };

  const handleBecomeBuyer = () => {
    setLoading(true);
    try {
      if (onUpgrade) {
        onUpgrade('buyer');
      } else {
        // If no onUpgrade callback provided, navigate to buyer storefront directly
        // This handles the case where role is already activated via other means
        router.push('/');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md p-8 bg-[#0d0a1a] border border-[rgba(201,168,76,0.2)] rounded-3xl shadow-2xl backdrop-blur-xl">
        <h2 className="text-2xl font-bold font-serif text-center text-[#F5F0E8] mb-1">Welcome Back!</h2>
        <p className="text-center text-xs text-[#A89F8F] mb-6">Select where you would like to access</p>

        <div className="space-y-4">
          {/* BUYER OPTION */}
          {profile?.is_buyer !== false ? (
            <button
              type="button"
              onClick={() => handleNavigation('/')}
              className="w-full p-4 text-left flex items-center justify-between bg-[#13112A] hover:border-[#C9A84C] border border-[rgba(201,168,76,0.2)] rounded-2xl transition-all shadow-md group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <span className="text-[#F5F0E8] font-semibold text-sm block">View as Buyer</span>
                  <span className="text-[#A89F8F] text-xs">Browse Storefront & Shop</span>
                </div>
              </div>
              <ArrowRight size={16} className="text-[#A89F8F] group-hover:text-[#C9A84C] group-hover:translate-x-1 transition-all" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleBecomeBuyer}
              className="w-full p-4 text-center flex items-center justify-center bg-transparent border-2 border-dashed border-[rgba(201,168,76,0.3)] hover:border-[#C9A84C] text-[#C9A84C] rounded-2xl transition-all text-xs font-semibold uppercase tracking-wider cursor-pointer"
            >
              + Create Buyer Account
            </button>
          )}

          {/* SELLER OPTION */}
          {profile?.is_seller ? (
            <button
              type="button"
              onClick={() => handleNavigation('/seller')}
              className="w-full p-4 text-left flex items-center justify-between bg-[#13112A] hover:border-[#C9A84C] border border-[rgba(201,168,76,0.2)] rounded-2xl transition-all shadow-md group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Store size={18} />
                </div>
                <div>
                  <span className="text-[#F5F0E8] font-semibold text-sm block">View as Seller</span>
                  <span className="text-[#A89F8F] text-xs">Manage Merchant Dashboard</span>
                </div>
              </div>
              <ArrowRight size={16} className="text-[#A89F8F] group-hover:text-[#C9A84C] group-hover:translate-x-1 transition-all" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleBecomeSeller}
              className="w-full p-3.5 text-center flex items-center justify-center gap-2 bg-[linear-gradient(135deg,#C9A84C,#E8CC7A)] hover:opacity-95 text-[#06040E] rounded-2xl transition-all text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#C9A84C]/10 cursor-pointer"
            >
              <Store size={16} /> + Become a Seller / Merchant
            </button>
          )}

          {/* ADMIN OPTION */}
          {profile?.is_admin && (
            <button
              type="button"
              onClick={() => handleNavigation('/admin')}
              className="w-full p-4 text-left flex items-center justify-between bg-[linear-gradient(135deg,#C9A84C,#E8CC7A)] hover:opacity-95 text-[#06040E] rounded-2xl transition-all shadow-[0_0_20px_rgba(201,168,76,0.25)] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#06040E]/10 flex items-center justify-center text-[#06040E]">
                  <Shield size={18} />
                </div>
                <div>
                  <span className="font-bold text-sm block">Open Admin Portal</span>
                  <span className="text-[#06040E]/70 text-xs">Platform Control Panel</span>
                </div>
              </div>
              <ArrowRight size={16} className="text-[#06040E]" />
            </button>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-center text-[#C9A84C] mt-5 text-xs font-medium animate-pulse">
            <Loader2 size={14} className="animate-spin" /> Redirecting to portal...
          </div>
        )}
      </div>
    </div>
  );
}