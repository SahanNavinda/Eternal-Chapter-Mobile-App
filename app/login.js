import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { auth, db } from '../firebaseConfig'; 
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore"; // Import Firestore functions

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuthentication = async () => {
    // Validation: Name is required only for registration
    if (!email || !password || (isRegistering && !name)) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        // 1. Create the Auth Account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // 2. Update the Auth Profile with the Name
        await updateProfile(userCredential.user, { displayName: name });

        // 3. CRITICAL: Save User to Firestore 'users' collection 
        // This makes the name searchable for the Leader
        await setDoc(doc(db, "users", userCredential.user.uid), {
          displayName: name,
          email: email.toLowerCase().trim(),
          uid: userCredential.user.uid,
          createdAt: new Date().toISOString()
        });

        Alert.alert("Success", `Account created for ${name}`);
      } else {
        // Simple Login
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Authentication Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <Text style={styles.title}>ETERNAL CHAPTER</Text>
      <Text style={styles.subtitle}>PRODUCTION PORTAL</Text>

      <View style={styles.card}>
        {isRegistering && (
          <TextInput 
            style={styles.input} 
            placeholder="Full Name (e.g. Nimal Perera)" 
            value={name} 
            onChangeText={setName} 
            placeholderTextColor="#999"
          />
        )}
        
        <TextInput 
          style={styles.input} 
          placeholder="Email Address" 
          value={email} 
          onChangeText={setEmail} 
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor="#999"
        />
        
        <TextInput 
          style={styles.input} 
          placeholder="Password" 
          value={password} 
          onChangeText={setPassword} 
          secureTextEntry 
          placeholderTextColor="#999"
        />
        
        <TouchableOpacity 
          style={[styles.button, loading && { opacity: 0.7 }]} 
          onPress={handleAuthentication}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{isRegistering ? "CREATE ACCOUNT" : "LOGIN"}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)} style={styles.toggleBtn}>
          <Text style={styles.toggleText}>
            {isRegistering ? "Already have an account? Login" : "New Team Member? Sign Up Here"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#1a1a1a', 
    justifyContent: 'center', 
    padding: 25 
  },
  title: { 
    color: '#fff', 
    fontSize: 32, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    letterSpacing: 2 
  },
  subtitle: { 
    color: '#007AFF', 
    textAlign: 'center', 
    fontSize: 12, 
    fontWeight: 'bold', 
    marginBottom: 40,
    letterSpacing: 1
  },
  card: { 
    backgroundColor: '#fff', 
    padding: 25, 
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10
  },
  input: { 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee', 
    padding: 15, 
    marginBottom: 15, 
    fontSize: 16,
    color: '#000'
  },
  button: { 
    backgroundColor: '#000', 
    padding: 18, 
    borderRadius: 12, 
    alignItems: 'center',
    marginTop: 10
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16,
    letterSpacing: 1
  },
  toggleBtn: { 
    marginTop: 20 
  },
  toggleText: { 
    textAlign: 'center', 
    color: '#007AFF', 
    fontWeight: '600',
    fontSize: 14 
  }
});