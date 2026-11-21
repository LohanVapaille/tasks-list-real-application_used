import { createContext, useContext } from "react";

// Objets Context séparés des Providers (exigence du Fast Refresh de Vite).
export const AuthContext = createContext(null);
export const StoreContext = createContext(null);
export const ToastContext = createContext(null);

export const useAuth = () => useContext(AuthContext);
export const useStore = () => useContext(StoreContext);
export const useToast = () => useContext(ToastContext);
