import { Share2 } from 'lucide-react';

import { Button } from '@components/ui/button';
import { Dialog } from '@components/ui/dialog';

interface ShareBillDialogProps {
  billNo: string | null;
  onClose: () => void;
  onShare: () => void;
}

/** The PDF is ready but the phone wants a fresh tap before it opens the share sheet. */
export const ShareBillDialog = ({ billNo, onClose, onShare }: ShareBillDialogProps) => (
  <Dialog
    open={billNo !== null}
    title={`Bill ${billNo} is ready`}
    description="Pick WhatsApp in the share sheet, then the vendor's chat. The PDF goes with it."
    icon={
      <span className="grid size-9 flex-none place-items-center rounded-10 bg-success-soft text-success">
        <Share2 aria-hidden="true" className="size-4.5" strokeWidth={1.8} />
      </span>
    }
    onClose={onClose}
    action={
      <Button size="md" onClick={onShare} className="w-full">
        Send on WhatsApp
      </Button>
    }
  />
);
