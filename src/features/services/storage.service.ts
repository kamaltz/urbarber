import * as ImagePicker from "expo-image-picker";

import { firebaseAuth } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";

type PublicMediaFolder = "avatars" | "barber" | "services";

interface UploadedPublicImage {
  path: string;
  publicUrl: string;
}

export async function pickImage(): Promise<
  ImagePicker.ImagePickerAsset | null
> {
  const permission =
    await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error("Izin galeri diperlukan untuk memilih gambar.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 0.8,
    exif: false,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  return result.assets[0];
}

export async function uploadPublicImage(
  image: ImagePicker.ImagePickerAsset,
  folder: PublicMediaFolder,
  filename = `image-${Date.now()}`,
): Promise<UploadedPublicImage> {
  const user = firebaseAuth.currentUser;

  if (!user) {
    throw new Error("Pengguna belum login.");
  }

  const extension =
    image.fileName?.split(".").pop()?.toLowerCase() ??
    image.uri.split(".").pop()?.toLowerCase() ??
    "jpg";

  const mimeType = image.mimeType ?? "image/jpeg";
  const path = `${user.uid}/${folder}/${filename}.${extension}`;

  const arrayBuffer = await fetch(image.uri).then((response) =>
    response.arrayBuffer(),
  );

  const { data, error } = await supabase.storage
    .from("public-media")
    .upload(path, arrayBuffer, {
      contentType: mimeType,
      upsert: true,
      cacheControl: "3600",
    });

  if (error) {
    throw new Error(`Upload gambar gagal: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from("public-media")
    .getPublicUrl(data.path);

  return {
    path: data.path,
    publicUrl: publicUrlData.publicUrl,
  };
}