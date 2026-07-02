export default function UserNotRegisteredError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white to-slate-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-100 bg-white p-8 shadow-lg">
        <div className="text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <svg
              className="h-8 w-8 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="mb-4 text-3xl font-bold text-slate-900">
            Accès restreint
          </h1>

          <p className="mb-8 text-slate-600">
            Vous n&apos;êtes pas encore autorisé à utiliser cette application.
            Merci de contacter l&apos;administrateur pour demander l&apos;accès.
          </p>

          <div className="rounded-md bg-slate-50 p-4 text-left text-sm text-slate-600">
            <p className="font-medium">Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur :</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Vérifiez que vous êtes connecté avec le bon compte.</li>
              <li>Contactez l&apos;administrateur de l&apos;application.</li>
              <li>Essayez de vous reconnecter.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}