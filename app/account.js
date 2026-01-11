import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar, 
  ActivityIndicator, 
  TextInput, 
  Image, 
  Alert, 
  Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import { collection, getDocs, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { auth, db } from '../firebaseConfig';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function AccountScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  
  const [stats, setStats] = useState({ total: 0, accepted: 0, pending: 0, completed: 0 });
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Listening to 'shoots' collection
    const q = query(collection(db, "shoots"), where("workerName", "==", user.displayName));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let total = snapshot.size, accepted = 0, pending = 0, completed = 0;
      snapshot.forEach((doc) => {
        const s = doc.data().status;
        if (s === 'Accepted') accepted++;
        else if (s === 'Pending') pending++;
        else if (s === 'Completed') completed++;
      });
      setStats({ total, accepted, pending, completed });
    });
    return () => unsubscribe();
  }, [user]);

  const handleExportCSV = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "shoots"), 
        where("workerName", "==", user.displayName),
        where("date", ">=", startDate),
        where("date", "<=", endDate),
        orderBy("date", "asc")
      );
      
      const snap = await getDocs(q);
      if (snap.empty) {
        Alert.alert("No Data", "No shoots found for selected dates.");
        setLoading(false);
        return;
      }

      let csvContent = "Date,Client,Location,Status,Hard Disk ID\n";
      snap.forEach((doc) => {
        const d = doc.data();
        csvContent += `${d.date},${d.clientName || d.name},${d.location},${d.status},${d.hardDiskID || 'N/A'}\n`;
      });

      const fileUri = FileSystem.cacheDirectory + `My_Report_${user.displayName}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      await Sharing.shareAsync(fileUri);
    } catch (e) {
      Alert.alert("Error", "Could not generate report. Check database indexes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* BACKGROUND WATERMARK - TINTED WHITE */}
      <View style={styles.watermarkContainer} pointerEvents="none">
        <Image 
          source={require('../assets/images/logo.png')} 
          style={styles.watermarkLogo} 
          resizeMode="contain" 
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* PROFILE HEADER */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarGlow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTxt}>{user?.displayName?.charAt(0)}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{user?.displayName?.toUpperCase()}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          
          <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/settings')}>
            <Ionicons name="options-outline" size={16} color="#007AFF" />
            <Text style={styles.settingsBtnTxt}>WORKSPACE SETTINGS</Text>
          </TouchableOpacity>
        </View>

        {/* PREMIUM STATS GRID */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats.total}</Text>
            <Text style={styles.statLab}>ASSIGNED</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, {color: '#28a745'}]}>{stats.completed}</Text>
            <Text style={styles.statLab}>FINISHED</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, {color: '#007AFF'}]}>{stats.accepted}</Text>
            <Text style={styles.statLab}>ACTIVE</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, {color: '#e67e22'}]}>{stats.pending}</Text>
            <Text style={styles.statLab}>PENDING</Text>
          </View>
        </View>

        {/* EXPORT SECTION */}
        <View style={styles.reportSection}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="document-text-outline" size={18} color="#fff" />
            <Text style={styles.secTitle}>PERFORMANCE REPORT</Text>
          </View>
          
          <View style={styles.datePickerContainer}>
            <View style={styles.dateBox}>
              <Text style={styles.dateLabel}>START DATE</Text>
              <TextInput style={styles.dateInput} value={startDate} onChangeText={setStartDate} placeholderTextColor="#444" />
            </View>
            <Ionicons name="arrow-forward" size={20} color="#333" style={{marginTop: 20}} />
            <View style={styles.dateBox}>
              <Text style={styles.dateLabel}>END DATE</Text>
              <TextInput style={styles.dateInput} value={endDate} onChangeText={setEndDate} placeholderTextColor="#444" />
            </View>
          </View>

          <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color="#000" />
                <Text style={styles.exportBtnText}>GENERATE WORK LOG (CSV)</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* LOGO FOOTER - TINTED WHITE */}
        <View style={styles.footerLogoContainer}>
            <Image 
              source={require('../assets/images/logo.png')} 
              style={styles.footerLogo} 
              resizeMode="contain" 
            />
            <Text style={styles.versionText}>VERSION 2.0.4 | ETERNAL CHAPTER</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  watermarkContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 0 },
  watermarkLogo: { 
    width: width * 0.9, 
    height: width * 0.9, 
    opacity: 0.08, 
    tintColor: '#fff' // Visible white tint
  },
  scrollContent: { paddingBottom: 50 },
  
  profileHeader: { alignItems: 'center', paddingTop: 60, paddingBottom: 30, backgroundColor: '#0a0a0a', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  avatarGlow: { padding: 4, borderRadius: 50, backgroundColor: '#1a1a1a', elevation: 10, shadowColor: '#007AFF', shadowOpacity: 0.2, shadowRadius: 15 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  avatarTxt: { color: '#fff', fontSize: 32, fontWeight: '900' },
  userName: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 15, letterSpacing: 1 },
  userEmail: { color: '#666', fontSize: 12, marginTop: 4 },
  settingsBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25, backgroundColor: '#111', borderWidth: 1, borderColor: '#222' },
  settingsBtnTxt: { color: '#007AFF', fontSize: 10, fontWeight: '900', marginLeft: 8, letterSpacing: 1 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 20, gap: 15, justifyContent: 'center' },
  statCard: { width: (width - 60) / 2, backgroundColor: '#111', padding: 20, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#1a1a1a' },
  statNum: { color: '#fff', fontSize: 24, fontWeight: '900' },
  statLab: { color: '#444', fontSize: 9, fontWeight: '900', marginTop: 5, letterSpacing: 1 },

  reportSection: { padding: 25, backgroundColor: '#0a0a0a', marginHorizontal: 20, borderRadius: 30, borderWidth: 1, borderColor: '#1a1a1a' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 25 },
  secTitle: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  datePickerContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  dateBox: { flex: 0.45 },
  dateLabel: { fontSize: 8, color: '#444', fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
  dateInput: { borderBottomWidth: 1, borderColor: '#222', paddingVertical: 8, color: '#fff', fontSize: 14, fontWeight: '700' },
  
  exportBtn: { backgroundColor: '#fff', flexDirection: 'row', gap: 10, padding: 18, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  exportBtnText: { color: '#000', fontWeight: '900', fontSize: 11, letterSpacing: 1 },

  footerLogoContainer: { alignItems: 'center', marginTop: 40, opacity: 0.3 },
  footerLogo: { 
    width: 40, 
    height: 40, 
    marginBottom: 10, 
    tintColor: '#fff' // Visible white tint
  },
  versionText: { color: '#fff', fontSize: 8, fontWeight: 'bold', letterSpacing: 2 }
});