import Link from 'next/link'

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-10">
      <div className="w-full max-w-lg rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Access denied</h1>
        <p className="mt-3 text-sm text-gray-600">
          Your account is signed in, but it does not have permission to use this part of Alwahaa Ops.
          Ask an admin to assign you a role in Supabase.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
