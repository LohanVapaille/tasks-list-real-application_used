import { supabase } from "./supabaseClient";

// Appelle une Edge Function et renvoie { data } ou { error: "message lisible" }.
export const callFunction = async (name, body) => {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (!error) return { data };

  let message = error.message;
  let code;
  try {
    const payload = await error.context?.json();
    if (payload?.error) message = payload.error;
    code = payload?.code;
  } catch {
    // Pas de corps JSON : on garde le message générique.
  }
  if (/Failed to send|fetch/i.test(message)) {
    message = "Service indisponible. Vérifie ta connexion ou réessaie plus tard.";
  }
  return { error: message, code };
};

export const appUrl = () => `${window.location.origin}${import.meta.env.BASE_URL}`;
