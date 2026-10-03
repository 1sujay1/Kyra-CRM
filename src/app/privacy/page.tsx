import React from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Trees } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold">
              <Trees className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-xl text-slate-900">Kyra Group Farmlands</h1>
              <p className="text-xs text-slate-500">Privacy Policy & Data Protection</p>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Home</span>
          </Link>
        </div>

        {/* Content */}
        <div className="space-y-4 text-xs leading-relaxed text-slate-600">
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span>1. Information We Collect</span>
            </h2>
            <p>
              Kyra Group Farmlands collects lead information submitted through Meta Facebook/Instagram Lead Ads, Google Ads, website contact forms, and authorized marketing partners. This includes your name, phone number, email address, city, and farmland plot preferences.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span>2. How We Use Your Information</span>
            </h2>
            <p>
              Your contact details are strictly used by Kyra Group sales executives to contact you regarding farmland property availability, site visit arrangements, booking confirmations, and project documentation in Coimbatore, Anaikatti, Pollachi, and Siruvani.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span>3. Data Protection & Confidentiality</span>
            </h2>
            <p>
              We do not sell, rent, or trade your personal information to third parties. All lead data is encrypted and securely stored in our CRM database with strict role-based access control.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span>4. Contact Us</span>
            </h2>
            <p>
              If you have any questions regarding this Privacy Policy or wish to request data deletion, please contact us at <span className="font-semibold text-slate-900">admin@kyragroupindia.com</span> or visit our office at Coimbatore Foothills Estates.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t text-[11px] text-slate-400 flex items-center justify-between">
          <span>© {new Date().getFullYear()} Kyra Group Farmlands. All rights reserved.</span>
          <span>Last Updated: October 2026</span>
        </div>
      </div>
    </div>
  );
}
