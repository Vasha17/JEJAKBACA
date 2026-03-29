import { useState } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { NewListDialog } from "@/component/NewListDialog";
import { Button } from "@/component/ui/button"; 

interface NewListDialogTriggerProps {
  existingCount: number;
  onCreate: (name: string, color: string, visibility: string) => void;
  showLabel?: boolean; 
  trigger?: React.ReactNode;
}

export function NewListDialogTrigger({ existingCount, onCreate, showLabel = true, trigger }: NewListDialogTriggerProps) {
  const [open, setOpen] = useState(false);
  
  const handleCreate = (name: string, color: string, visibility: string) => {
    onCreate(name, color, visibility);
    setOpen(false);
  };

  return (
    <>      
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          <Plus size={18} />
          {showLabel && <span>Add List</span>}
        </Button>
      )}
      
      {open &&
        createPortal(
          <NewListDialog
            open={open}
            onClose={() => setOpen(false)}
            onCreate={handleCreate}
            existingCount={existingCount}
          />,
          document.body
        )}
    </>
  );
}