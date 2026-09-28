import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="mx-auto flex justify-center mb-3">
          <img
            src="/kyra-logo.png"
            alt="Kyra Group"
            className="h-16 w-auto object-contain bg-white rounded-xl px-4 py-2 shadow-md"
          />
        </div>
        <h2 className="text-lg font-bold tracking-tight text-white">
          Farmland Sales & Operations CRM
        </h2>
        <p className="mt-0.5 text-xs text-emerald-400 font-medium">
          Coimbatore Regional Operations & Lead Pipeline
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-800">
          {children}
        </div>
      </div>
    </div>
  );
}
