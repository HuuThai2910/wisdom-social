import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

interface User {
  id: number;
  username: string;
  fullName: string;
  avatar: string;
  bio?: string;
  phone?: string;
}

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const refreshUser = () => {
    const userStr = localStorage.getItem("current_user");
    const user = userStr ? JSON.parse(userStr) : null;
    console.log("AuthContext refreshUser:", user);
    setCurrentUser(user);
  };

  useEffect(() => {
    // Load user khi app khởi động
    refreshUser();

    // Register callback với auth utils
    import("../utils/auth").then(({ setAuthChangeCallback }) => {
      setAuthChangeCallback(refreshUser);
    });

    // Lắng nghe storage event để cập nhật khi localStorage thay đổi
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "current_user") {
        refreshUser();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
