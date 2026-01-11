import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert, 
  TextInput, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  Image, 
  StatusBar,
  Dimensions
} from 'react-native';
import { auth, db } from '../firebaseConfig'; 
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuthentication = async () => {
    if (!email || !password || (isRegistering && !name)) {
      Alert.alert("Required Fields", "Please provide all necessary credentials.");
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });

        await setDoc(doc(db, "users", userCredential.user.uid), {
          displayName: name,
          email: email.toLowerCase().trim(),
          uid: userCredential.user.uid,
          createdAt: new Date().toISOString()
        });

        Alert.alert("Welcome", `Creative profile created for ${name}`);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      Alert.alert("Authentication Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      
      {/* BRANDING SECTION */}
      <View style={styles.logoContainer}>
        <Image 
          source={require('../assets/images/logo.png')} 
          style={styles.mainLogo} 
          resizeMode="contain" 
        />
        <Text style={styles.title}>ETERNAL CHAPTER</Text>
        <Text style={styles.subtitle}>PRODUCTION PORTAL</Text>
      </View>

      {/* AUTH CARD */}
      <View style={styles.card}>
        {isRegistering && (
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={18} color="#007AFF" style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="Full Name" 
              value={name} 
              onChangeText={setName} 
              placeholderTextColor="#444"
            />
          </View>
        )}
        
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={18} color="#007AFF" style={styles.inputIcon} />
          <TextInput 
            style={styles.input} 
            placeholder="Email Address" 
            value={email} 
            onChangeText={setEmail} 
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor="#444"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={18} color="#007AFF" style={styles.inputIcon} />
          <TextInput 
            style={styles.input} 
            placeholder="Password" 
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry 
            placeholderTextColor="#444"
          />
        </View>
        
        <TouchableOpacity 
          style={[styles.button, loading && { opacity: 0.7 }]} 
          onPress={handleAuthentication}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>{isRegistering ? "CREATE ACCOUNT" : "SIGN IN"}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)} style={styles.toggleBtn}>
          <Text style={styles.toggleText}>
            {isRegistering ? "ALREADY A MEMBER? LOGIN" : "NEW CREATIVE? SIGN UP HERE"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>SECURE PRODUCTION NODE v2.0</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000', 
    justifyContent: 'center', 
    padding: 30 
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40
  },
  mainLogo: {
    width: 100,
    height: 100,
    tintColor: '#fff', // Forces black logo to white
    marginBottom: 20
  },
  title: { 
    color: '#fff', 
    fontSize: 22, 
    fontWeight: '900', 
    textAlign: 'center', 
    letterSpacing: 4 
  },
  subtitle: { 
    color: '#007AFF', 
    textAlign: 'center', 
    fontSize: 10, 
    fontWeight: 'bold', 
    letterSpacing: 2,
    marginTop: 5
  },
  card: { 
    backgroundColor: 'rgba(18, 18, 18, 0.8)', 
    padding: 30, 
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#1a1a1a'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    marginBottom: 20
  },
  inputIcon: {
    marginRight: 10
  },
  input: { 
    flex: 1,
    paddingVertical: 12, 
    fontSize: 14,
    color: '#fff',
    fontWeight: '600'
  },
  button: { 
    backgroundColor: '#fff', 
    padding: 18, 
    borderRadius: 15, 
    alignItems: 'center',
    marginTop: 15
  },
  buttonText: { 
    color: '#000', 
    fontWeight: '900', 
    fontSize: 14,
    letterSpacing: 1
  },
  toggleBtn: { 
    marginTop: 25 
  },
  toggleText: { 
    textAlign: 'center', 
    color: '#444', 
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 1
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center'
  },
  footerText: {
    color: '#1a1a1a',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 2
  }
});