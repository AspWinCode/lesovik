import { create } from "zustand";
import {
  login as apiLogin,
  logout as apiLogout,
  fetchMe,
  type CurrentUser,
  type LoginPayload,
} from "../api/auth";
import { clearTokens, getRefreshToken, isAuthenticated, setTokens } from "./tokens";

interface AuthState {
  user: CurrentUser | null;
  /** True until the initial "am I logged in?" check resolves. */
  initializing: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  /** Load the current user if a token exists (call once on app start). */
  bootstrap: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initializing: true,
  isAuthenticated: isAuthenticated(),

  login: async (payload) => {
    const tokens = await apiLogin(payload);
    setTokens(tokens.access_token, tokens.refresh_token);
    set({ isAuthenticated: true });
    const user = await fetchMe();
    set({ user });
  },

  logout: async () => {
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        await apiLogout(refresh);
      } catch {
        /* best-effort — clear locally regardless */
      }
    }
    clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  bootstrap: async () => {
    if (!isAuthenticated()) {
      set({ initializing: false, isAuthenticated: false });
      return;
    }
    try {
      const user = await fetchMe();
      set({ user, isAuthenticated: true, initializing: false });
    } catch {
      clearTokens();
      set({ user: null, isAuthenticated: false, initializing: false });
    }
  },
}));
