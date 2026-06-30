/**
 * Authenticated fetch wrapper.
 * Always includes credentials (cookies) and auto-redirects to /login on 401.
 */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, {
    ...init,
    credentials: 'include',
  })

  if (res.status === 401) {
    // Session expired or not authenticated → redirect to login
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  return res
}
