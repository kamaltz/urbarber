import { CustomerScreen } from '@/components/navigation/CustomerScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { firebaseAuth } from '@/lib/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

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
        {/* Security Guidance Card */}
        <View className="mb-5 rounded-2xl bg-[#EDEFFB] p-4 border border-[#363062]/10 flex-row gap-3 items-center">
          <Text className="text-xl">🛡️</Text>
          <View className="flex-1">
            <Text className="text-xs font-bold text-[#363062]">Keamanan Kata Sandi</Text>
            <Text className="text-xs text-[#363062]/80 mt-0.5">
              Gunakan kata sandi unik minimal 6 karakter demi keamanan akun Anda.
            </Text>
          </View>
        </View>

        {/* Password Form Inputs */}
        <View className="rounded-2xl bg-white p-5 border border-slate-200/80 shadow-xs gap-4 mb-6">
          <AppInput
            label="Password Saat Ini *"
            placeholder="Masukkan password saat ini"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            editable={!loading}
          />

          <AppInput
            label="Password Baru *"
            placeholder="Minimal 6 karakter"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            editable={!loading}
          />

          <AppInput
            label="Konfirmasi Password Baru *"
            placeholder="Ulangi password baru"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            editable={!loading}
          />

          {/* Feedback Banners */}
          {errorMsg ? (
            <View className="rounded-xl bg-rose-50 p-3.5 border border-rose-200">
              <Text className="text-xs text-rose-700 text-center font-semibold">{errorMsg}</Text>
            </View>
          ) : null}

          {successMsg ? (
            <View className="rounded-xl bg-emerald-50 p-3.5 border border-emerald-200">
              <Text className="text-xs text-emerald-800 text-center font-semibold">{successMsg}</Text>
            </View>
          ) : null}

          <AppButton
            label="Perbarui Password"
            loading={loading}
            onPress={handleSubmit}
            className="h-[54px] rounded-xl bg-[#D2691E] active:bg-[#b85a19] mt-2"
          />
        </View>
      </ScrollView>
    </CustomerScreen>
  );
}
