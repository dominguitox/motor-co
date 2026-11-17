import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )
}

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    json: async () => body,
  } as unknown as Response
}

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('muestra el estado de carga mientras la API responde', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))

    renderApp()

    expect(screen.getByRole('status')).toHaveTextContent('Conectando con la API')
  })

  it('muestra la API conectada cuando responde 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ status: 'ok', app: 'motor-co' })),
    )

    renderApp()

    expect(await screen.findByText(/API conectada/)).toBeInTheDocument()
  })

  it('muestra el error cuando la API no responde', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('sin conexión')
      }),
    )

    renderApp()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con la API',
    )
  })
})
