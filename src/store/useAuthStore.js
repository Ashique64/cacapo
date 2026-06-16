import { create } from "zustand";
import { supabase } from "@/lib/supabase";

export const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  loading: true,

  initialize: () => {
    set({ loading: true });
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null, loading: false });
      if (typeof window !== "undefined") {
        if (session) {
          document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${3600 * 24 * 7}; SameSite=Lax; Secure`;
        } else {
          document.cookie = `sb-access-token=; path=/; max-age=0; SameSite=Lax; Secure`;
        }
      }
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, loading: false });
      if (typeof window !== "undefined") {
        if (session) {
          document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${3600 * 24 * 7}; SameSite=Lax; Secure`;
        } else {
          document.cookie = `sb-access-token=; path=/; max-age=0; SameSite=Lax; Secure`;
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  },

  signUp: async (email, password, metadata) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    set({ loading: false });
    return { data, error };
  },

  signIn: async (email, password) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    set({ loading: false });
    return { data, error };
  },

  signOut: async () => {
    set({ loading: true });
    const { error } = await supabase.auth.signOut();
    set({ user: null, session: null, loading: false });
    return { error };
  },

  resetPasswordForEmail: async (email, redirectTo) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    set({ loading: false });
    return { data, error };
  },

  updatePassword: async (newPassword) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    set({ loading: false });
    return { data, error };
  },
}));

// Auto-initialize on client side
if (typeof window !== "undefined") {
  useAuthStore.getState().initialize();
}

