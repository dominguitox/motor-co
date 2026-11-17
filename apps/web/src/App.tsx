import { useQuery } from '@tanstack/react-query'

type Health = {
  status: string
  app: string
}

async function fetchHealth(): Promise<Health> {
  const response = await fetch('/api/health', {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`La API respondió con estado ${response.status}`)
  }

  return (await response.json()) as Health
}

export default function App() {
  const { data, error, isError, isPending } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    retry: false,
    staleTime: 30_000,
  })

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">
          Motor de modelos y flujos
        </p>
        <h1 className="mt-2 text-3xl font-bold">motor-co</h1>
        <p className="mt-2 text-sm text-slate-400">
          Define modelos, carga registros y automatiza flujos sin tocar código.
        </p>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Estado de la API
          </p>

          {isPending && (
            <p role="status" className="mt-2 flex items-center gap-2 text-slate-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
              Conectando con la API…
            </p>
          )}

          {isError && (
            <p role="alert" className="mt-2 text-rose-400">
              No se pudo conectar con la API.
              <span className="mt-1 block text-xs text-rose-300/80">{error.message}</span>
            </p>
          )}

          {data && (
            <p role="status" className="mt-2 flex items-center gap-2 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              API conectada · {data.app}
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
