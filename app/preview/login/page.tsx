export default function PreviewLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
          <p className="mt-2 text-sm text-gray-500">
            Use your Alwahaa Ops account to access invoices, receipts, and client records.
          </p>
        </div>

        <form className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
              value="admin@alwahaagroup.com"
              readOnly
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
              value="temporary-password"
              readOnly
            />
          </div>

          <button
            type="button"
            className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}
