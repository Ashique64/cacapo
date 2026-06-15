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
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, loading: false });
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
}));

// Auto-initialize on client side
if (typeof window !== "undefined") {
  useAuthStore.getState().initialize();
}

