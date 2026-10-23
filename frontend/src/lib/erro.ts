/** Erro com a mensagem do servidor e, quando houver, a mensagem de cada campo. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public campos: Record<string, string> = {},
  ) {
    super(message);
  }
}
