export function friendlyServerError(error: unknown, fallback: string) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message).toLowerCase()
      : "";

  if (message.includes("authentication required") || message.includes("jwt")) {
    return "Você precisa entrar na sua conta para continuar.";
  }
  if (message.includes("terms acceptance required")) {
    return "Aceite os Termos de Serviço antes de continuar.";
  }
  if (message.includes("account disabled")) {
    return "Sua conta está suspensa. Fale com a administração.";
  }
  if (message.includes("predictions are locked")) {
    return "O prazo para este palpite já terminou.";
  }
  if (message.includes("pool not found") || message.includes("public pool not found")) {
    return "Este bolão não está disponível.";
  }
  if (message.includes("pool membership limit")) {
    return "Você atingiu o limite de bolões participantes.";
  }
  if (message.includes("pool ownership limit")) {
    return "Você atingiu o limite de bolões criados.";
  }
  if (message.includes("pool member limit")) {
    return "Este bolão atingiu o limite de participantes.";
  }
  if (message.includes("only the master administrator can restore")) {
    return "Somente um administrador global pode recuperar este bolão.";
  }
  if (message.includes("principal master administrator cannot be altered")) {
    return "O master principal é protegido e não pode ser alterado.";
  }

  return fallback;
}
