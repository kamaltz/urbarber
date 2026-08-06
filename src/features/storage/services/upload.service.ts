import { storageService } from '@/features/services/storage.service';

export const uploadService = {
  async uploadPublicFile(options: { uri: string; path: string; contentType?: string }) {
    try {
      const parts = options.path.split('/');
      const folder = (parts[1] || 'barbers') as any;
      const filename = parts[parts.length - 1];

      const res = await storageService.uploadPublicFile(options.uri, folder, {
        filename,
        contentType: options.contentType || 'image/jpeg',
      });

      return {
        success: true,
        url: res.publicUrl,
        path: res.path,
      };
    } catch (err: any) {
      return {
        success: false,
        error: { message: err?.message || 'Gagal upload media.' },
      };
    }
  },
};
