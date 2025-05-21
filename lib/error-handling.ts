export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  fallback: T,
  errorMessage = "An error occurred",
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    console.error(`${errorMessage}:`, error)
    return fallback
  }
}
