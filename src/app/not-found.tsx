import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#091B15] text-[#F4EFE6] px-4" dir="rtl">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-4xl font-bold font-quran text-[#C5A059]">الصفحة غير موجودة</h1>
        <p className="text-sm text-[#A6B8B0]">الصفحة أو الختمة التي تبحث عنها غير متوفرة حالياً.</p>
        <Link
          href="/"
          className="inline-block mt-4 rounded-xl border border-[#C5A059] bg-[#C5A059] px-6 py-2.5 text-xs font-bold text-[#081A14] hover:bg-[#D4B06A] transition-colors"
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
