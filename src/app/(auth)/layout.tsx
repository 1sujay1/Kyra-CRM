import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="mx-auto h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-2xl text-white shadow-lg shadow-emerald-900/50">
          K
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
          Kyra Group Farmland CRM
        </h2>
        <p className="mt-1 text-sm text-emerald-400 font-medium">
          Coimbatore Regional Sales & Lead Operations
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
