import { Users, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RoleChooserModalProps {
  open: boolean;
  onChoose: (role: "contributor" | "investor") => void;
}

const RoleChooserModal = ({ open, onChoose }: RoleChooserModalProps) => {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center">Choose how you want to continue</DialogTitle>
          <DialogDescription className="text-center">
            Your account has multiple roles. Select a dashboard to proceed.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <Button
            variant="outline"
            className="h-auto flex flex-col items-center gap-3 p-6 hover:border-contribution hover:bg-contribution/5"
            onClick={() => onChoose("contributor")}
          >
            <div className="w-12 h-12 rounded-xl bg-contribution/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-contribution" />
            </div>
            <span className="font-semibold">Contributor</span>
            <span className="text-xs text-muted-foreground text-center">
              View contributions & loans
            </span>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex flex-col items-center gap-3 p-6 hover:border-investor hover:bg-investor/5"
            onClick={() => onChoose("investor")}
          >
            <div className="w-12 h-12 rounded-xl bg-investor/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-investor" />
            </div>
            <span className="font-semibold">Investor</span>
            <span className="text-xs text-muted-foreground text-center">
              Track investments & returns
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoleChooserModal;
