/**
 * Helpers para chamadas de API do Planning Poker
 */

interface ApiCallOptions {
  slug: string
  endpoint: string
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  body?: unknown
}

/**
 * Faz uma chamada de API do poker e retorna os dados ou lança erro
 */
export async function pokerApiCall<T = unknown>({
  slug,
  endpoint,
  method = "POST",
  body,
}: ApiCallOptions): Promise<{ data: T; errorCode?: string }> {
  const response = await fetch(`/api/rooms/${slug}/poker${endpoint}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json()

  if (!response.ok || !data.ok) {
    const msg = data.error ?? data.message ?? `Erro na requisição ${endpoint}`
    const error = new Error(msg) as Error & { code?: string }
    error.code = data.code
    throw error
  }

  return { data: data.data, errorCode: data.code }
}
