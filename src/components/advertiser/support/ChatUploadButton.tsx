import { useRef, useState } from "react";
import { Paperclip, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ChatUploadButtonProps {
  roomId: string;
  onUploadSuccess: (path: string, type: string, name: string) => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE      = 10 * 1024 * 1024; // 10 Mo

export function ChatUploadButton({ roomId, onUploadSuccess }: ChatUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Format non supporté. JPEG, PNG, WEBP ou PDF uniquement.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Fichier trop volumineux (10 Mo maximum).");
      return;
    }

    try {
      setIsUploading(true);

      const ext      = file.name.split(".").pop();
      const uniqueId = Math.random().toString(36).substring(2, 15);
      const filePath = `${roomId}/${uniqueId}.${ext}`;

      const { data, error } = await supabase.storage
        .from("support-attachments")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (error) throw error;

      // Passer path + type + name au parent pour insérer le message
      onUploadSuccess(data.path, file.type, file.name);
    } catch (err: any) {
      console.error("Erreur upload :", err.message);
      toast.error("Erreur lors de l'envoi du fichier.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        className="hidden"
      />
      <button
        type="button"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
        title="Ajouter une pièce jointe"
        className="p-2 rounded-full transition-colors disabled:opacity-50
          text-muted-foreground hover:text-primary hover:bg-muted"
      >
        {isUploading
          ? <Loader2 className="h-5 w-5 animate-spin" />
          : <Paperclip className="h-5 w-5" />
        }
      </button>
    </div>
  );
}
