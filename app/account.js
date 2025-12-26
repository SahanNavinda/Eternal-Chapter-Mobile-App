import { useRouter } from 'expo-router';
import { collection, getDocs, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

// Real file generation imports
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export default function AccountScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  
  const [stats, setStats] = useState({ total: 0, accepted: 0, pending: 0, completed: 0 });
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  // Real-time listener for personal stats
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "events"), where("assignedTo", "==", user.email.toLowerCase().trim()));
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

  // GENERATE PERSONAL CSV REPORT
  const handleExportCSV = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "events"), 
        where("assignedTo", "==", user.email.toLowerCase().trim()),
        where("date", ">=", startDate),
        where("date", "<=", endDate),
        orderBy("date", "asc")
      );
      
      const snap = await getDocs(q);
      if (snap.empty) {
        Alert.alert("No Data", `No shoots found between ${startDate} and ${endDate}`);
        setLoading(false);
        return;
      }

      // 1. Create CSV Structure
      let csvContent = "Date,Event Name,Location,Status\n";
      snap.forEach((doc) => {
        const d = doc.data();
        const date = d.date || "";
        const name = (d.name || "").replace(/,/g, " ");
        const loc = (d.location || "").replace(/,/g, " ");
        const status = d.status || "";
        csvContent += `${date},${name},${loc},${status}\n`;
      });

      // 2. Save to File System
      const fileName = `My_Work_Report_${startDate}_to_${endDate}.csv`;
      const fileUri = FileSystem.cacheDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, csvContent);

      // 3. Share File
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Share My Work Report',
        });
      } else {
        Alert.alert("Error", "Sharing is not available.");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not generate CSV. Ensure your database index is ready.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarTxt}>{user?.displayName?.charAt(0)}</Text></View>
        <Text style={styles.headerTitle}>{user?.displayName}</Text>
        <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/settings')}>
          <Text style={styles.settingsBtnTxt}>⚙️ EDIT PROFILE & SETTINGS</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}><Text style={styles.statNum}>{stats.total}</Text><Text style={styles.statLab}>Total</Text></View>
        <View style={styles.statBox}><Text style={[styles.statNum, {color: '#28a745'}]}>{stats.accepted}</Text><Text style={styles.statLab}>Accepted</Text></View>
        <View style={styles.statBox}><Text style={[styles.statNum, {color: '#ff9500'}]}>{stats.pending}</Text><Text style={styles.statLab}>Pending</Text></View>
        <View style={[styles.statBox, {borderRightWidth:0}]}><Text style={[styles.statNum, {color: '#007AFF'}]}>{stats.completed}</Text><Text style={styles.statLab}>Finished</Text></View>
      </View>

      {/* CSV Export Section */}
      <View style={styles.reportSection}>
        <Text style={styles.secTitle}>DOWNLOAD PERSONAL WORK REPORT (CSV)</Text>
        <View style={styles.dateRow}>
          <View style={{flex:1}}>
            <Text style={styles.lab}>FROM (YYYY-MM-DD)</Text>
            <TextInput style={styles.miniInput} value={startDate} onChangeText={setStartDate} />
          </View>
          <View style={{flex:1}}>
            <Text style={styles.lab}>TO (YYYY-MM-DD)</Text>
            <TextInput style={styles.miniInput} value={endDate} onChangeText={setEndDate} />
          </View>
        </View>
        
        <TouchableOpacity style={styles.reportBtn} onPress={handleExportCSV} disabled={loading}>
          {loading ? <ActivityIndicator color="#007AFF" /> : <Text style={styles.reportBtnText}>GENERATE CSV FILE</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },
  header: { backgroundColor: '#1a1a1a', padding: 30, alignItems: 'center' },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarTxt: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  settingsBtn: { marginTop: 15, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, backgroundColor: '#333' },
  settingsBtnTxt: { color: '#007AFF', fontSize: 11, fontWeight: 'bold' },
  statsGrid: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 15, borderBottomWidth: 1, borderColor: '#eee' },
  statBox: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderColor: '#eee' },
  statNum: { fontSize: 18, fontWeight: 'bold' },
  statLab: { fontSize: 9, color: '#999', textTransform: 'uppercase' },
  reportSection: { padding: 25, backgroundColor: '#fff', marginTop: 10 },
  secTitle: { fontSize: 11, fontWeight: 'bold', color: '#666', marginBottom: 20, letterSpacing: 1 },
  dateRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  lab: { fontSize: 9, color: '#aaa', fontWeight: 'bold', marginBottom: 5 },
  miniInput: { borderBottomWidth: 1, borderColor: '#ccc', paddingVertical: 5, fontSize: 13, color: '#000' },
  reportBtn: { borderWidth: 2, borderColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  reportBtnText: { color: '#007AFF', fontWeight: 'bold', fontSize: 13 }
});