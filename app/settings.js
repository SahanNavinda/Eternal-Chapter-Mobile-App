import { EmailAuthProvider, reauthenticateWithCredential, updateEmail, updatePassword, updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Image, Dimensions, StatusBar } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function SettingsScreen() {
  const user = auth.currentUser;
  
  // States
  const [name, setName] = useState(user?.displayName || '');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdateBasicInfo = async () => {
    if (!name) return Alert.alert("Error", "Name is required");
    setLoading(true);
    try {
      await updateProfile(user, { displayName: name });
      await updateDoc(doc(db, "users", user.uid), { 
        displayName: name,
        age: age 
      });
      Alert.alert("Success", "Personal info updated!");
    } catch (e) { Alert.alert("Error", e.message); }
    setLoading(false);
  };

  const handleSecurityUpdate = async () => {
    if (!currentPassword) {
      Alert.alert("Security Required", "Enter current password to authorize changes.");
      return;
    }
    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      if (email.toLowerCase().trim() !== user.email) {
        await updateEmail(user, email.toLowerCase().trim());
        await updateDoc(doc(db, "users", user.uid), { email: email.toLowerCase().trim() });
      }

      if (newPassword) {
        if (newPassword.length < 6) throw new Error("Password too short.");
        await updatePassword(user, newPassword);
      }

      Alert.alert("Success", "Security settings updated!");
      setCurrentPassword('');
      setNewPassword('');
    } catch (e) {
      Alert.alert("Update Failed", e.message.includes("wrong-password") ? "Incorrect current password." : e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* BACKGROUND WATERMARK */}
      <View style={styles.watermarkContainer} pointerEvents="none">
        <Image 
          source={require('../assets/images/logo.png')} 
          style={styles.watermarkLogo} 
          resizeMode="contain"
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* PERSONAL INFO SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={18} color="#007AFF" />
            <Text style={styles.secTitle}>PERSONAL INFORMATION</Text>
          </View>
          
          <Text style={styles.lab}>FULL NAME</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your Name" placeholderTextColor="#333" />
          
          <Text style={styles.lab}>AGE</Text>
          <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" placeholder="Age" placeholderTextColor="#333" />
          
          <TouchableOpacity style={styles.primaryBtn} onPress={handleUpdateBasicInfo} disabled={loading}>
            <Text style={styles.btnTxt}>SAVE PROFILE</Text>
          </TouchableOpacity>
        </View>

        {/* SECURITY SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-lock-outline" size={18} color="#ff4444" />
            <Text style={[styles.secTitle, {color: '#ff4444'}]}>SECURITY ENCRYPTION</Text>
          </View>
          
          <Text style={styles.lab}>CURRENT PASSWORD (REQUIRED)</Text>
          <TextInput 
            style={[styles.input, styles.secureInput]} 
            value={currentPassword} 
            onChangeText={setCurrentPassword} 
            secureTextEntry 
            placeholder="Required to authorize changes"
            placeholderTextColor="#444"
          />

          <Text style={styles.lab}>CHANGE EMAIL</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" placeholderTextColor="#333" />
          
          <Text style={styles.lab}>NEW PASSWORD</Text>
          <TextInput 
            style={styles.input} 
            value={newPassword} 
            onChangeText={setNewPassword} 
            secureTextEntry 
            placeholder="Minimum 6 characters" 
            placeholderTextColor="#333"
          />

          <TouchableOpacity 
            style={styles.securityBtn} 
            onPress={handleSecurityUpdate}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.securityBtnTxt}>UPDATE SECURITY KEY</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>ETERNAL CHAPTER SECURED NODE</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  watermarkContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 0 },
  watermarkLogo: { width: width * 0.9, height: width * 0.9, opacity: 0.05, tintColor: '#fff' },
  scrollContent: { padding: 25, paddingTop: 40, zIndex: 1 },

  section: { 
    backgroundColor: 'rgba(18, 18, 18, 0.85)', 
    padding: 25, 
    borderRadius: 25, 
    marginBottom: 25, 
    borderWidth: 1, 
    borderColor: '#1a1a1a' 
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 25 },
  secTitle: { fontSize: 11, fontWeight: '900', color: '#007AFF', letterSpacing: 2 },
  
  lab: { fontSize: 8, color: '#444', fontWeight: '900', marginBottom: 5, letterSpacing: 1 },
  input: { borderBottomWidth: 1, borderColor: '#222', paddingVertical: 12, marginBottom: 20, fontSize: 14, color: '#fff', fontWeight: '600' },
  secureInput: { borderColor: 'rgba(255, 68, 68, 0.3)' },
  
  primaryBtn: { backgroundColor: '#007AFF', padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 10 },
  securityBtn: { backgroundColor: '#fff', padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 10 },
  
  btnTxt: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  securityBtnTxt: { color: '#000', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  
  footer: { alignItems: 'center', marginTop: 20, marginBottom: 40 },
  footerText: { color: '#222', fontSize: 9, fontWeight: 'bold', letterSpacing: 3 }
});