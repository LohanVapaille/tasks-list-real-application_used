import { useCallback, useEffect, useMemo, useState } from "react";
import { appUrl } from "../lib/api";
import { supabase } from "../lib/supabaseClient";
import { AuthContext } from "./contexts";

const AuthProvider = ({ children }) => {
  // undefined = en cours de lecture, null = invité (pas de compte).
  const [session, setSession] = useState(undefined);
  const [storedProfile, setProfile] = useState(null);
  const userId = session?.user.id;
  // Le profil n'est valable que pour le compte actuellement connecté.
  const profile = storedProfile?.id === userId ? storedProfile : null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    setProfile(data);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [userId]);

  const isPro = Boolean(
    profile?.plan === "pro" && (!profile.plan_until || new Date(profile.plan_until) > new Date()),
  );

  const value = useMemo(() => {
    const meta = session?.user.user_metadata ?? {};
    return {
      session,
      user: session?.user ?? null,
      profile,
      isPro,
      displayName: profile?.display_name || meta.full_name || meta.name || session?.user.email || "",
      avatarUrl: meta.avatar_url || profile?.avatar_url || "",
      refreshProfile,
      signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
      signUp: (email, password) =>
        supabase.auth.signUp({ email, password, options: { emailRedirectTo: appUrl() } }),
      signInWithGoogle: () =>
        supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: appUrl() },
        }),
      resetPassword: (email) =>
        supabase.auth.resetPasswordForEmail(email, { redirectTo: appUrl() }),
      signOut: () => supabase.auth.signOut(),
    };
  }, [session, profile, isPro, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
