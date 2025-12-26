import { useEffect, useState } from 'react';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Drawer } from 'expo-router/drawer';

import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';

import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useRouter } from 'expo-router';

import { auth } from '../firebaseConfig';

import { onAuthStateChanged, signOut } from 'firebase/auth';



import LoginScreen from './login';



function CustomDrawerContent(props) {

  const router = useRouter();

  const [modalVisible, setModalVisible] = useState(false);

  const [passcodeInput, setPasscodeInput] = useState('');

  const user = auth.currentUser;

  const LEADER_PASSCODE = "1234";



  const handleVerifyPasscode = () => {

    if (passcodeInput === LEADER_PASSCODE) {

      setModalVisible(false);

      setPasscodeInput('');

      router.push('/admin-dash');

    } else {

      Alert.alert("Denied", "Incorrect Passcode");

      setPasscodeInput('');

    }

  };



  return (

    <DrawerContentScrollView {...props}>

      <View style={styles.drawerHeader}>

        <Text style={styles.brandText}>{user?.displayName?.toUpperCase() || "MEMBER"}</Text>

        <Text style={styles.brandSubtitle}>ETERNAL CHAPTER</Text>

      </View>

      <DrawerItem label="Home (Calendar)" onPress={() => router.push('/(tabs)/')} />

      <DrawerItem label="My Dashboard" onPress={() => router.push('/dashboard')} />

      <DrawerItem label="Account" onPress={() => router.push('/account')} />

      <View style={styles.separator} />

      <DrawerItem label="ADMIN PANEL" labelStyle={{ color: '#007AFF', fontWeight: 'bold' }} onPress={() => { props.navigation.closeDrawer(); setModalVisible(true); }} />

      <DrawerItem label="Logout" labelStyle={{ color: '#ff4444' }} onPress={() => signOut(auth)} />

     

      <Modal visible={modalVisible} transparent animationType="fade">

        <View style={styles.modalOverlay}>

          <View style={styles.modalCard}>

            <Text style={styles.modalTitle}>Admin Access</Text>

            <TextInput style={styles.modalInput} keyboardType="numeric" secureTextEntry value={passcodeInput} onChangeText={setPasscodeInput} autoFocus />

            <TouchableOpacity onPress={handleVerifyPasscode}><Text style={{color:'#007AFF', fontWeight:'bold'}}>UNLOCK</Text></TouchableOpacity>

            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{marginTop:10, color:'#999'}}>CANCEL</Text></TouchableOpacity>

          </View>

        </View>

      </Modal>

    </DrawerContentScrollView>

  );

}



export default function RootLayout() {

  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);



  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, (currUser) => {

      setUser(currUser);

      setLoading(false);

    });

    return unsubscribe;

  }, []);



  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#007AFF" /></View>;



  return (

    <GestureHandlerRootView style={{ flex: 1 }}>

      {!user ? (

        <LoginScreen />

      ) : (

        <Drawer drawerContent={(props) => <CustomDrawerContent {...props} />} screenOptions={{ headerTitle: "ETERNAL CHAPTER", headerStyle: { backgroundColor: '#1a1a1a' }, headerTintColor: '#fff' }}>

          <Drawer.Screen name="(tabs)" options={{ drawerItemStyle: { display: 'none' } }} />

          <Drawer.Screen name="dashboard" options={{ drawerItemStyle: { display: 'none' } }} />

          <Drawer.Screen name="account" options={{ drawerItemStyle: { display: 'none' } }} />

          <Drawer.Screen name="admin-dash" options={{ drawerItemStyle: { display: 'none' } }} />

        </Drawer>

      )}

    </GestureHandlerRootView>

  );

}



const styles = StyleSheet.create({

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' },

  drawerHeader: { padding: 25, backgroundColor: '#1a1a1a', marginBottom: 10 },

  brandText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  brandSubtitle: { color: '#007AFF', fontSize: 10, marginTop: 4 },

  separator: { height: 1, backgroundColor: '#eee', marginVertical: 10, marginHorizontal: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },

  modalCard: { backgroundColor: '#fff', padding: 25, borderRadius: 15, width: '80%', alignItems: 'center' },

  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },

  modalInput: { borderWidth: 1, borderColor: '#ddd', width: '100%', padding: 15, borderRadius: 10, textAlign: 'center', fontSize: 24, marginBottom: 20 },

});