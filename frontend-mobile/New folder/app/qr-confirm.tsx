import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api/apiClient';
import { getDeviceInfo } from '../utils/deviceInfo';
import authService from '../services/authService';

interface ScanResponse {
  seesion_id: string;
  status: string;
  user: {
    id: number;
    username: string;
    name: string;
    avatarUrl?: string;
  };
  expireAt: string;
}

export default function QRConfirm() {
  const params = useLocalSearchParams();
  const sessionId = params.session_id as string;
  const router = useRouter();

  const navigateToSettingsWithCleanStack = () => {
    router.dismissAll();
    router.push('/settings' as any);
  };

  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [sessionData, setSessionData] = useState<ScanResponse | null>(null);
  const [error, setError] = useState('');

  const handleHeaderBack = () => {
    if (sessionData && !error) {
      router.replace('/settings' as any);
      return;
    }

    router.back();
  };

  useEffect(() => {

    // Đợi một chút để đảm bảo params đã được set
    const timer = setTimeout(() => {
      if (sessionId && sessionId !== 'undefined' && sessionId !== '') {
        scanQRCode();
      } else {
        setError('Mã QR không hợp lệ');
        setLoading(false);
      }
    }, 50); 

    return () => clearTimeout(timer);
  }, [sessionId]);

  const scanQRCode = async () => {
    if (!sessionId || sessionId === 'undefined' || sessionId === '') {
      setError('Mã QR không hợp lệ');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await apiClient.get('/session/qr-login/scan', {
        params: { session_id: sessionId },
        timeout: 15000,
      });

      const scanData = response.data.data;

      if (
        scanData &&
        typeof scanData === 'object' &&
        ('user' in scanData || 'seesion_id' in scanData || 'session_id' in scanData)
      ) {
        setSessionData(scanData);
        return;
      }
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        setSessionData({
          seesion_id: sessionId,
          status: 'SCANNED',
          user: currentUser,
          expireAt: new Date(Date.now() + 60_000).toISOString(),
        });
      } else {
        setError('Không thể xác thực mã QR. Vui lòng thử lại.');
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Không thể xác thực mã QR. Vui lòng thử lại.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    try {
      setConfirming(true);

      const deviceInfo = await getDeviceInfo();

      const requestData = {
        session_id: sessionId,
        deviceType: deviceInfo.deviceType,
        deviceName: deviceInfo.deviceName,
        ipAddress: deviceInfo.ipAddress,
      };

      await apiClient.post('/session/qr-login/confirm', requestData);

      Alert.alert(
        'Thành công',
        'Đăng nhập thành công! Vui lòng kiểm tra trên trình duyệt web.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigateToSettingsWithCleanStack();
            },
          },
        ],
        { cancelable: false } // Không cho dismiss bằng cách tap outside
      );
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        'Không thể xác nhận đăng nhập. Vui lòng thử lại.';
      Alert.alert('Lỗi', errorMsg);
    } finally {
      setConfirming(false);
    }
  };

  const handleReject = async () => {
    try {
      setConfirming(true);

      await apiClient.get('/session/qr-login/reject', {
        params: { session_id: sessionId },
      });

      Alert.alert(
        'Đã từ chối',
        'Bạn đã từ chối yêu cầu đăng nhập.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigateToSettingsWithCleanStack();
            },
          },
        ],
        { cancelable: false } // Không cho dismiss bằng cách tap outside
      );
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
      Alert.alert('Lỗi', errorMsg);
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleHeaderBack}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Xác nhận đăng nhập</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Đang xác thực...</Text>
        </View>
      </View>
    );
  }

  if (error || !sessionData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleHeaderBack}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Xác nhận đăng nhập</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ff3b30" />
          <Text style={styles.errorText}>{error || 'Lỗi không xác định'}</Text>
          {__DEV__ && (
            <Text style={styles.debugText}>
              Session ID: {sessionId || 'undefined'}
            </Text>
          )}
          <TouchableOpacity style={styles.retryButton} onPress={scanQRCode}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.retryButton, styles.backButtonStyle]}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleHeaderBack}
          disabled={confirming}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác nhận đăng nhập</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="checkmark-circle" size={64} color="#34c759" />
          <Text style={styles.title}>Xác nhận đăng nhập</Text>
          <Text style={styles.subtitle}>
            Bạn có muốn đăng nhập với tài khoản này trên trình duyệt web không?
          </Text>

          <View style={styles.userInfo}>
            <Image
              source={{
                uri:
                  sessionData.user.avatarUrl ||
                  'https://i.pravatar.cc/150?img=5',
              }}
              style={styles.avatar}
            />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{sessionData.user.name}</Text>
              <Text style={styles.userUsername}>
                @{sessionData.user.username}
              </Text>
            </View>
          </View>

          <View style={styles.warningBox}>
            <Ionicons name="information-circle" size={20} color="#ff9500" />
            <Text style={styles.warningText}>
              Chỉ xác nhận nếu bạn đang cố gắng đăng nhập trên trình duyệt web
              của mình
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.confirmButton,
              confirming && styles.disabledButton,
            ]}
            onPress={handleConfirm}
            disabled={confirming}
          >
            {confirming ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={24} color="#fff" />
                <Text style={styles.buttonText}>Xác nhận</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.rejectButton,
              confirming && styles.disabledButton,
            ]}
            onPress={handleReject}
            disabled={confirming}
          >
            {confirming ? (
              <ActivityIndicator color="#ff3b30" />
            ) : (
              <>
                <Ionicons name="close" size={24} color="#ff3b30" />
                <Text style={[styles.buttonText, styles.rejectButtonText]}>
                  Từ chối
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonStyle: {
    backgroundColor: '#6c757d',
    marginTop: 12,
  },
  debugText: {
    marginTop: 12,
    fontSize: 12,
    color: '#999',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  userUsername: {
    fontSize: 14,
    color: '#666',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fff7e6',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffd699',
    width: '100%',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#996300',
    marginLeft: 8,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  rejectButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ff3b30',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  rejectButtonText: {
    color: '#ff3b30',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
