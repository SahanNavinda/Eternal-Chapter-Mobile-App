import { EmailAuthProvider, reauthenticateWithCredential, updateEmail, updatePassword, updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

export default function SettingsScreen() {
  const user = auth.currentUser;
  
  // States
  const [name, setName] = useState(user?.displayName || '');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. UPDATE BASIC INFO (Name/Age)
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

  // 2. SECURITY UPDATE (Email/Password with Re-authentication)
  const handleSecurityUpdate = async () => {
    if (!currentPassword) {
      Alert.alert("Security Required", "Please enter your current password to make changes.");
      return;
    }

    setLoading(true);
    try {
      // Step A: Re-authenticate the user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Step B: Update Email if changed
      if (email.toLowerCase().trim() !== user.email) {
        await updateEmail(user, email.toLowerCase().trim());
        await updateDoc(doc(db, "users", user.uid), { email: email.toLowerCase().trim() });
      }

      // Step C: Update Password if entered
      if (newPassword) {
        if (newPassword.length < 6) {
            throw new Error("New password must be at least 6 characters.");
        }
        await updatePassword(user, newPassword);
      }

      Alert.alert("Success", "Security settings updated successfully!");
      setCurrentPassword('');
      setNewPassword('');
    } catch (e) {
      console.error(e);
      Alert.alert("Update Failed", e.message.includes("auth/wrong-password") 
        ? "Current password is incorrect." 
        : e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.section}>
        <Text style={styles.secTitle}>PERSONAL INFORMATION</Text>
        <Text style={styles.lab}>DISPLAY NAME</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />
        
        <Text style={styles.lab}>AGE</Text>
        <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" />
        
        <TouchableOpacity style={styles.btn} onPress={handleUpdateBasicInfo}>
          <Text style={styles.btnTxt}>SAVE PERSONAL INFO</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.secTitle}>SECURITY & LOGINS</Text>
        
        <Text style={styles.lab}>CURRENT PASSWORD (REQUIRED)</Text>
        <TextInput 
            style={[styles.input, { borderColor: '#ff4444', borderBottomWidth: 1 }]} 
            value={currentPassword} 
            onChangeText={setCurrentPassword} 
            secureTextEntry 
            placeholder="Confirm current password to save"
        />

        <Text style={[styles.lab, {marginTop: 15}]}>NEW EMAIL</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" />
        
        <Text style={styles.lab}>NEW PASSWORD</Text>
        <TextInput 
            style={styles.input} 
            value={newPassword} 
            onChangeText={setNewPassword} 
            secureTextEntry 
            placeholder="Min 6 characters" 
        />

        <TouchableOpacity 
          style={[styles.btn, {backgroundColor: '#1a1a1a'}]} 
          onPress={handleSecurityUpdate}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTxt}>UPDATE SECURITY</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },
  section: { padding: 25, backgroundColor: '#fff', marginTop: 10 },
  secTitle: { fontSize: 11, fontWeight: 'bold', color: '#666', marginBottom: 20, letterSpacing: 1 },
  lab: { fontSize: 10, color: '#aaa', fontWeight: 'bold', marginBottom: 5 },
  input: { borderBottomWidth: 1, borderColor: '#eee', paddingVertical: 10, marginBottom: 20, fontSize: 15, color: '#000' },
  btn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 13 }
});