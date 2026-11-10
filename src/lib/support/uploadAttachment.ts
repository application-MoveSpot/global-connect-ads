import { supabase } from "@/integrations/supabase/client";

export async function uploadSupportAttachment(file: File, roomId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const ext      = file.name.split(".").pop();
  const filePath = `${roomId}/${crypto.randomUUID()}.${ext}`;

  // 1. Upload vers le bucket privé
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("support-attachments")
    .upload(filePath, file);
  if (uploadError) throw uploadError;

  // 2. Insérer le message avec le chemin Storage (pas d'URL signée ici — générée à l'affichage)
  const { error: messageError } = await supabase
    .from("support_messages")
    .insert({
      room_id:         roomId,
      sender_id:       user.id,
      sender_type:     "advertiser",
      content:         `Fichier partagé : ${file.name}`,
      attachment_url:  uploadData.path,
      attachment_name: file.name,
      attachment_type: file.type,
    });
  if (messageError) throw messageError;
}

/** Génère une URL signée (60 min) depuis un chemin Storage privé */
export async function getAttachmentSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("support-attachments")
    .createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}
