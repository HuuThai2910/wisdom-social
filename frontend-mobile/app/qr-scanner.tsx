import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function QRScanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAndRequestPermission = async () => {
      if (!permission) return;

      console.log('Camera permission status:', permission);

      if (!permission.granted && permission.canAskAgain) {
        const { status } = await requestPermission();
        console.log('Permission request result:', status);
      }
    };

    checkAndRequestPermission();
  }, [permission]);

  // Reset state khi component mount lại (ví dụ khi user back về)
  useEffect(() => {
    setScanned(false);
    setIsProcessing(false);
  }, []);

  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    if (scanned || isProcessing) return;

    setScanned(true);
    setIsProcessing(true);

    console.log('QR Code scanned, raw data:', data);

    try {
      // Parse QR data
      const qrData = JSON.parse(data);
      console.log('Parsed QR data:', qrData);

      if (qrData.type === 'qr_login' && qrData.session_id) {
        console.log('Valid QR login code, session_id:', qrData.session_id);

        // Navigate to confirmation screen with session_id
        setTimeout(() => {
          router.push({
            pathname: '/qr-confirm' as any,
            params: { session_id: qrData.session_id },
          });
        }, 100); // Delay nhỏ để đảm bảo state updated
      } else {
        console.log('Invalid QR code format');
        Alert.alert('Lỗi', 'Mã QR không hợp lệ. Vui lòng quét mã QR đăng nhập.', [
          {
            text: 'OK',
            onPress: () => {
              setScanned(false);
              setIsProcessing(false);
            },
          },
        ]);
      }
    } catch (error) {
      console.error('Error parsing QR code:', error);
      Alert.alert('Lỗi', 'Không thể đọc mã QR. Vui lòng thử lại.', [
        {
          text: 'OK',
          onPress: () => {
            setScanned(false);
            setIsProcessing(false);
          },
        },
      ]);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!permission.granted) {
    const canRequest = permission.canAskAgain;
    const isPermanentlyDenied = !canRequest && !permission.granted;

    return (
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={64} color="#999" />
        <Text style={styles.permissionText}>
          Cần quyền truy cập camera để quét mã QR
        </Text>

        {isPermanentlyDenied && (
          <Text style={styles.permissionSubtext}>
            Quyền camera đã bị từ chối. Vui lòng bật trong Settings.
          </Text>
        )}

        {canRequest ? (
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Cấp quyền</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }}
          >
            <Text style={styles.buttonText}>Mở Settings</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => router.back()}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            Quay lại
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={isProcessing}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quét mã QR</Text>
        <View style={styles.placeholder} />
      </View>

      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.unfocusedContainer}></View>
          <View style={styles.middleContainer}>
            <View style={styles.unfocusedContainer}></View>
            <View style={styles.focusedContainer}>
              <View style={styles.scannerCorner} />
              <View style={[styles.scannerCorner, styles.topRight]} />
              <View style={[styles.scannerCorner, styles.bottomLeft]} />
              <View style={[styles.scannerCorner, styles.bottomRight]} />
            </View>
            <View style={styles.unfocusedContainer}></View>
          </View>
          <View style={styles.unfocusedContainer}></View>
        </View>

        {isProcessing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.processingText}>Đang xử lý...</Text>
          </View>
        )}
      </CameraView>

      <View style={styles.instructionContainer}>
        <Text style={styles.instructionTitle}>Hướng dẫn quét mã QR</Text>
        <Text style={styles.instructionText}>
          1. Đảm bảo mã QR nằm trong khung vuông
        </Text>
        <Text style={styles.instructionText}>
          2. Giữ điện thoại ổn định và đủ ánh sáng
        </Text>
        <Text style={styles.instructionText}>
          3. Mã QR sẽ được quét tự động
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: '#000',
    width: '100%',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  unfocusedContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  middleContainer: {
    flexDirection: 'row',
    height: 250,
  },
  focusedContainer: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  scannerCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#fff',
    borderWidth: 3,
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  topRight: {
    left: undefined,
    right: 0,
    borderLeftWidth: 0,
    borderRightWidth: 3,
  },
  bottomLeft: {
    top: undefined,
    bottom: 0,
    borderTopWidth: 0,
    borderBottomWidth: 3,
  },
  bottomRight: {
    top: undefined,
    bottom: 0,
    left: undefined,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '600',
  },
  instructionContainer: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    width: '100%',
  },
  instructionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  instructionText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
    paddingHorizontal: 40,
  },
  permissionSubtext: {
    color: '#FF9500',
    fontSize: 14,
    textAlign: 'center',
    marginTop: -10,
    marginBottom: 10,
    paddingHorizontal: 40,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
});
