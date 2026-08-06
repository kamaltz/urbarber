import { CustomerScreen } from '@/components/navigation/CustomerScreen';
import { AppButton } from '@/components/ui/AppButton';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { firebaseAuth } from '@/lib/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

export default function ChangePasswordScreen() {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentPassword) {
      setErrorMsg('Password saat ini wajib diisi.');
      return;
    }

    if (!newPassword) {
      setErrorMsg('Password baru wajib diisi.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password baru minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi password baru tidak cocok.');
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMsg('Password baru harus berbeda dari password saat ini.');
      return;
    }

    try {
      setLoading(true);
      const currentUser = firebaseAuth.currentUser;

      if (!currentUser || !currentUser.email) {
        throw new Error('Sesi pengguna tidak valid. Silakan login kembali.');
      }

      // Reauthenticate before updating password
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, newPassword);

      // Clear sensitive inputs
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setSuccessMsg('Password Anda berhasil diperbarui!');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setErrorMsg('Password saat ini salah.');
      } else if (code === 'auth/weak-password') {
        setErrorMsg('Password baru terlalu lemah. Gunakan variasi huruf dan angka.');
      } else if (code === 'auth/requires-recent-login') {
        setErrorMsg('Sesi login Anda telah kadaluarsa. Silakan login kembali terlebih dahulu.');
      } else if (code === 'auth/too-many-requests') {
        setErrorMsg('Terlalu banyak percobaan gagal. Silakan tunggu beberapa menit.');
      } else if (code === 'auth/network-request-failed') {
        setErrorMsg('Koneksi internet terganggu.');
      } else {
        setErrorMsg(err?.message || 'Gagal mengubah password. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomerScreen
      title="Ubah Password"
      description="Perbarui password akun URBarber Anda secara berkala untuk menjaga keamanan."
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="gap-4 mb-6">
          <View>
            <Text className="text-xs font-bold text-slate-700 mb-1">Password Saat Ini *</Text>
            <TextInput
              className="rounded-xl bg-white p-3.5 border border-slate-200 text-sm font-medium text-slate-900"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Masukkan password saat ini"
              placeholderTextColor="#94A3B8"
              secureTextEntry
            />
          </View>

          <View>
            <Text className="text-xs font-bold text-slate-700 mb-1">Password Baru *</Text>
            <TextInput
              className="rounded-xl bg-white p-3.5 border border-slate-200 text-sm font-medium text-slate-900"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Minimal 6 karakter"
              placeholderTextColor="#94A3B8"
              secureTextEntry
            />
          </View>

          <View>
            <Text className="text-xs font-bold text-slate-700 mb-1">Konfirmasi Password Baru *</Text>
            <TextInput
              className="rounded-xl bg-white p-3.5 border border-slate-200 text-sm font-medium text-slate-900"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Ulangi password baru"
              placeholderTextColor="#94A3B8"
              secureTextEntry
            />
          </View>

          {/* Feedback Messages */}
          {errorMsg ? (
            <View className="rounded-xl bg-red-50 p-3 border border-red-200">
              <Text className="text-xs text-red-700 text-center font-medium">{errorMsg}</Text>
            </View>
          ) : null}

          {successMsg ? (
            <View className="rounded-xl bg-emerald-50 p-3 border border-emerald-200">
              <Text className="text-xs text-emerald-700 text-center font-medium">{successMsg}</Text>
            </View>
          ) : null}

          <AppButton
            label={loading ? 'Memperbarui...' : 'Ubah Password'}
            onPress={handleSubmit}
            variant="primary"
            disabled={loading}
          />
        </View>
      </ScrollView>
    </CustomerScreen>
  );
}
