import { useEffect, useState, useRef } from 'react';
import { 
  Animated, 
  Easing, 
  View, 
  Image, 
  StyleSheet, 
  StatusBar, 
  ActivityIndicator, 
  Modal, 
  Text, 
  TextInput, 
  TouchableOpacity,
  Alert,
  Platform 
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

// Core Notification Imports
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

import LoginScreen from './login';

// --- NOTIFICATION HANDLER CONFIG ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Global Helper for Scheduling
export async function scheduleShootReminder(clientName, shootDateString) {
  const shootDate = new Date(shootDateString);
  const triggerDate = new Date(shootDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before
  triggerDate.setHours(9, 0, 0, 0);

  if (triggerDate < new Date()) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "📽️ Production Reminder",
        body: `Upcoming shoot for ${clientName} tomorrow!`,
        data: { clientName },
      },
      trigger: triggerDate,
    });
  } catch (e) {
    console.error("Scheduling Error:", e);
  }
}

function CustomDrawerContent(props) {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [accessType, setAccessType] = useState(''); 
  const user = auth.currentUser;
  
  const ADMIN_PIN = "1234";
  const EDITOR_PIN = "5678";

  const handleVerifyPasscode = () => {
    const correctPin = accessType === 'admin' ? ADMIN_PIN : EDITOR_PIN;
    if (passcodeInput === correctPin) {
      setModalVisible(false);
      setPasscodeInput('');
      router.push(accessType === 'admin' ? '/admin-dash' : '/editor-dash');
    } else {
      Alert.alert("Security Alert", "Unauthorized PIN attempt.");
      setPasscodeInput('');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      <DrawerContentScrollView {...props}>
        <View style={styles.drawerHeader}>
          <Image 
            source={require('../assets/images/logo.png')} 
            style={[styles.drawerLogo, { tintColor: '#fff' }]} 
          />
          <Text style={styles.brandText}>{user?.displayName?.toUpperCase() || "CREATIVE MEMBER"}</Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>VERIFIED CREATIVE</Text>
          </View>
        </View>

        <View style={styles.navSection}>
          <Text style={styles.sectionHeader}>GENERAL</Text>
          <DrawerItem 
            label="Production Calendar" 
            labelStyle={styles.navLabel}
            icon={({size}) => <Ionicons name="calendar" color="#fff" size={size} />}
            onPress={() => router.push('/(tabs)/')} 
          />
          <DrawerItem 
            label="My Performance" 
            labelStyle={styles.navLabel}
            icon={({size}) => <Ionicons name="analytics" color="#fff" size={size} />}
            onPress={() => router.push('/dashboard')} 
          />
          <DrawerItem 
            label="Profile Settings" 
            labelStyle={styles.navLabel}
            icon={({size}) => <Ionicons name="person-circle-outline" color="#fff" size={size} />}
            onPress={() => router.push('/account')} 
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.navSection}>
          <Text style={styles.sectionHeader}>MANAGEMENT</Text>
          <TouchableOpacity 
            style={styles.panelBtn} 
            onPress={() => {setAccessType('editor'); setModalVisible(true); props.navigation.closeDrawer();}}
          >
            <View style={styles.panelIconBox}><Ionicons name="film" color="#007AFF" size={20} /></View>
            <Text style={styles.panelBtnText}>EDITOR PANEL</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.panelBtn} 
            onPress={() => {setAccessType('admin'); setModalVisible(true); props.navigation.closeDrawer();}}
          >
            <View style={styles.panelIconBox}><Ionicons name="shield-checkmark" color="#007AFF" size={20} /></View>
            <Text style={styles.panelBtnText}>ADMIN PANEL</Text>
          </TouchableOpacity>
        </View>
      </DrawerContentScrollView>

      <TouchableOpacity style={styles.logoutBtn} onPress={() => signOut(auth)}>
        <Ionicons name="power" color="#ff4444" size={20} />
        <Text style={styles.logoutText}>Sign Out from Workspace</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIndicator} />
            <Ionicons name="lock-closed" size={30} color="#1a1a1a" style={{ marginBottom: 10 }} />
            <Text style={styles.modalTitle}>{accessType?.toUpperCase()} ACCESS</Text>
            <Text style={styles.modalSub}>Authorized Personnel Only</Text>
            <TextInput 
              style={styles.modalInput} 
              keyboardType="numeric" 
              secureTextEntry 
              maxLength={4}
              value={passcodeInput} 
              onChangeText={setPasscodeInput} 
              placeholder="••••"
              placeholderTextColor="#ccc"
              autoFocus 
            />
            <TouchableOpacity style={styles.unlockBtn} onPress={handleVerifyPasscode}>
              <Text style={styles.unlockBtnText}>VERIFY IDENTITY</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setModalVisible(false); setPasscodeInput(''); }}>
              <Text style={styles.cancelText}>RETURN TO APP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function RootLayout() {
  const [user, setUser] = useState(null);
  const [isAppReady, setIsAppReady] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    // 1. Splash Animation
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 1800, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true })
    ]).start();

    // 2. Notification Permissions & Auth Setup
    const setupApp = async () => {
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (Platform.OS === 'android') {
          Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#007AFF',
          });
        }
      }

      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setTimeout(() => setIsAppReady(true), 3000); 
      });
    };

    setupApp();
  }, []);

  if (!isAppReady) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar barStyle="light-content" />
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
          <Image 
            source={require('../assets/images/logo.png')} 
            style={{ width: 180, height: 180, tintColor: '#fff' }} 
            resizeMode="contain" 
          />
          <View style={{ marginTop: 50 }}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {!user ? <LoginScreen /> : (
        <Drawer 
          drawerContent={(props) => <CustomDrawerContent {...props} />} 
          screenOptions={{ 
            headerTitle: () => (
              <Image 
                source={require('../assets/images/logo.png')} 
                style={{ width: 130, height: 40, tintColor: '#fff' }} 
                resizeMode="contain" 
              />
            ),
            headerStyle: { backgroundColor: '#000', height: 110 }, 
            headerTintColor: '#fff',
            headerTitleAlign: 'center',
            drawerStyle: { width: '80%' }
          }}
        >
          <Drawer.Screen name="(tabs)" options={{ headerTitle: "ETERNAL CHAPTER" }} />
          <Drawer.Screen name="dashboard" options={{ headerTitle: "ANALYTICS" }} />
          <Drawer.Screen name="account" options={{ headerTitle: "SETTINGS" }} />
          <Drawer.Screen name="admin-dash" options={{ headerTitle: "ADMINISTRATION" }} />
          <Drawer.Screen name="editor-dash" options={{ headerTitle: "POST-PRODUCTION" }} />
        </Drawer>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splashContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  drawerHeader: { padding: 30, paddingTop: 50, alignItems: 'center', backgroundColor: '#1a1a1a', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  drawerLogo: { width: 100, height: 100, marginBottom: 15 },
  brandText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(0,122,255,0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#007AFF', marginRight: 6 },
  statusText: { color: '#007AFF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  navSection: { marginTop: 25, paddingHorizontal: 15 },
  navLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#222', marginVertical: 15, marginHorizontal: 20 },
  sectionHeader: { color: '#555', fontSize: 10, fontWeight: '900', marginLeft: 15, marginBottom: 12, letterSpacing: 2 },
  panelBtn: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 10, backgroundColor: '#1a1a1a', borderRadius: 15 },
  panelIconBox: { width: 35, height: 35, borderRadius: 10, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  panelBtnText: { color: '#fff', marginLeft: 15, fontWeight: '700', fontSize: 14 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', padding: 25, borderTopWidth: 1, borderTopColor: '#222', marginBottom: 10 },
  logoutText: { color: '#ff4444', marginLeft: 15, fontWeight: '700', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', padding: 35, borderTopLeftRadius: 40, borderTopRightRadius: 40, alignItems: 'center', width: '100%' },
  modalIndicator: { width: 40, height: 5, backgroundColor: '#eee', borderRadius: 3, marginBottom: 20 },
  modalTitle: { fontSize: 15, fontWeight: '900', color: '#1a1a1a', letterSpacing: 2 },
  modalSub: { fontSize: 11, color: '#888', marginTop: 4, marginBottom: 25 },
  modalInput: { width: '80%', padding: 20, fontSize: 36, textAlign: 'center', fontWeight: 'bold', letterSpacing: 15, color: '#000', backgroundColor: '#f9f9f9', borderRadius: 20, marginBottom: 25 },
  unlockBtn: { backgroundColor: '#000', width: '100%', padding: 20, borderRadius: 18, alignItems: 'center' },
  unlockBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 2, fontSize: 14 },
  cancelText: { marginTop: 22, color: '#aaa', fontWeight: 'bold', fontSize: 11 }
});