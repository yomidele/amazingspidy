import { createContext, useCallback, useContext, useRef, useState, ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogOut } from "lucide-react";

type ConfirmCallback = () => void | Promise<void>;

interface LogoutConfirmContextValue {
  /**
   * Show the global "Are you sure you want to logout?" dialog.
   * The provided callback runs only if the user confirms.
   */
  confirmLogout: (onConfirm: ConfirmCallback) => void;
}

const LogoutConfirmContext = createContext<LogoutConfirmContextValue | null>(null);

export const LogoutConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const callbackRef = useRef<ConfirmCallback | null>(null);

  const confirmLogout = useCallback((onConfirm: ConfirmCallback) => {
    callbackRef.current = onConfirm;
    setOpen(true);
  }, []);

  const handleConfirm = async () => {
    const cb = callbackRef.current;
    callbackRef.current = null;
    setOpen(false);
    if (cb) {
      try {
        await cb();
      } catch (err) {
        console.error("Logout callback failed", err);
      }
    }
  };

  const handleCancel = () => {
    callbackRef.current = null;
    setOpen(false);
  };

  return (
    <LogoutConfirmContext.Provider value={{ confirmLogout }}>
      {children}
      <AlertDialog open={open} onOpenChange={(o) => { if (!o) handleCancel(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LogOut className="w-5 h-5 text-destructive" />
              Are you sure you want to logout?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out of your account and returned to the home page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LogoutConfirmContext.Provider>
  );
};

export const useLogoutConfirm = () => {
  const ctx = useContext(LogoutConfirmContext);
  if (!ctx) {
    // Fallback to window.confirm so the app never breaks if provider is missing.
    return {
      confirmLogout: (onConfirm: ConfirmCallback) => {
        if (window.confirm("Are you sure you want to logout?")) {
          Promise.resolve(onConfirm()).catch(() => {});
        }
      },
    };
  }
  return ctx;
};
