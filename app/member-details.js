import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View, Dimensions, StatusBar } from 'react-native';
import { db } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function MemberDetails() {
  const { email, name, id } = useLocalSearchParams();
  const router = useRouter();
  const [memberEvents, setMemberEvents] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [reportStart, setReportStart] = useState('2025-01-01');
  const [reportEnd, setReportEnd] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!name) return;
    // Updated to use 'shoots' collection and filter by workerName
    const q = query(
      collection(db, "shoots"), 
      where("workerName", "==", name), 
      orderBy("date", "desc")
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      setMemberEvents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("Firestore Error:", error);
    });
    return () => unsub();
  }, [name]);

  const generateCSV = async (isFull) => {
    const data = isFull ? memberEvents : memberEvents.filter(e => e.date >= reportStart && e.date <= reportEnd);
    if (data.length === 0) return Alert.alert("No Data", "No shoots found for this member.");
    
    try {
      let csv = `Work History for ${name}\nDate,Client,Location,Status\n`;
      data.forEach(e => {
        const client = (e.clientName || e.name || "N/A").replace(/,/g, " ");
        const loc = (e.location || "N/A").replace(/,/g, " ");
        csv += `${e.date},${client},${loc},${e.status}\n`;
      });

      const fileUri = FileSystem.cacheDirectory + `${name.replace(/\s/g, '_')}_Work_History.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv);
      await Sharing.shareAsync(fileUri);
      setModalVisible(false);
    } catch (e) {
      Alert.alert("Error", "Could not generate CSV.");
    }
  };

  const removeMember = () => {
    Alert.alert("Revoke Access", `Are you sure you want to remove ${name} from the team?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: 'destructive', onPress: async () => {
          await deleteDoc(doc(db, "users", id));
          router.back();
      }}
    ]);
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

      <View style={styles.header}>
        <View style={styles.topNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.backTxt}>BACK</Text>
          </TouchableOpacity>
        </View>

        <Image 
          source={require('../assets/images/logo.png')} 
          style={[styles.detailLogo, { tintColor: '#fff' }]} 
        />
        <Text style={styles.headerTitle}>{name?.toUpperCase()}</Text>
        <Text style={styles.headerSub}>{email}</Text>
        
        <TouchableOpacity style={styles.premiumBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="cloud-download-outline" size={16} color="#007AFF" />
          <Text style={styles.premiumBtnText}>EXPORT WORK HISTORY</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={memberEvents}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.eventItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eventDate}>{item.date}</Text>
              <Text style={styles.eventName}>{(item.clientName || item.name || "N/A").toUpperCase()}</Text>
              <Text style={styles.eventLoc}>📍 {item.location}</Text>
            </View>
            <View style={[styles.statusBadge, { borderColor: item.status === 'Completed' ? '#28a745' : '#444' }]}>
                <Text style={[styles.statusText, { color: item.status === 'Completed' ? '#28a745' : '#666' }]}>
                    {item.status?.toUpperCase()}
                </Text>
            </View>
          </View>
        )}
        contentContainerStyle={{ padding: 25, paddingBottom: 100 }}
        ListEmptyComponent={<Text style={styles.emptyTxt}>No production history found.</Text>}
      />

      <TouchableOpacity style={styles.deleteLink} onPress={removeMember}>
        <Ionicons name="trash-outline" size={14} color="#ff3b30" style={{marginRight: 8}} />
        <Text style={styles.deleteLinkText}>REVOKE STAFF ACCESS</Text>
      </TouchableOpacity>

      {/* PREMIUM MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
           <View style={styles.modalContent}>
              <View style={styles.modalIndicator} />
              <Text style={styles.modalHeader}>DATA EXPORT CENTER</Text>
              
              <TouchableOpacity style={styles.fullBtn} onPress={() => generateCSV(true)}>
                <Text style={styles.fullBtnText}>ALL-TIME LOGS</Text>
              </TouchableOpacity>
              
              <View style={styles.dividerRow}>
                <View style={styles.line} /><Text style={styles.orText}>OR PERIOD</Text><View style={styles.line} />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>FROM</Text>
                <TextInput style={styles.modalInput} value={reportStart} onChangeText={setReportStart} placeholder="YYYY-MM-DD" placeholderTextColor="#333" />
                <Text style={styles.inputLabel}>TO</Text>
                <TextInput style={styles.modalInput} value={reportEnd} onChangeText={setReportEnd} placeholder="YYYY-MM-DD" placeholderTextColor="#333" />
              </View>

              <TouchableOpacity style={styles.periodBtn} onPress={() => generateCSV(false)}>
                <Text style={styles.periodBtnText}>GENERATE CUSTOM REPORT</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>CLOSE</Text>
              </TouchableOpacity>
           </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  watermarkContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 0 },
  watermarkLogo: { width: width * 0.9, height: width * 0.9, opacity: 0.05, tintColor: '#fff' },
  
  header: { padding: 30, paddingTop: 50, alignItems: 'center', borderBottomWidth: 1, borderColor: '#111', backgroundColor: '#050505' },
  topNav: { width: '100%', marginBottom: 10 },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backTxt: { color: '#fff', fontSize: 10, fontWeight: '900', marginLeft: 5, letterSpacing: 1 },
  
  detailLogo: { width: 80, height: 80, marginBottom: 15 },
  headerTitle: { color: '#fff', fontSize: 20, letterSpacing: 4, fontWeight: '900' },
  headerSub: { color: '#555', fontSize: 11, marginTop: 5, fontWeight: '600' },
  
  premiumBtn: { marginTop: 25, flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: '#222' },
  premiumBtnText: { color: '#007AFF', fontSize: 9, letterSpacing: 1, fontWeight: '900', marginLeft: 10 },
  
  eventItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderColor: '#111' },
  eventDate: { color: '#444', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  eventName: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  eventLoc: { color: '#666', fontSize: 11, marginTop: 2 },
  statusBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  statusText: { fontSize: 8, fontWeight: '900' },
  
  deleteLink: { padding: 30, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  deleteLinkText: { color: '#ff3b30', fontSize: 9, letterSpacing: 2, fontWeight: '900' },
  emptyTxt: { color: '#222', textAlign: 'center', marginTop: 50, fontWeight: 'bold', letterSpacing: 1 },

  // Modal Styles
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', width: '100%', padding: 35, borderTopLeftRadius: 40, borderTopRightRadius: 40, alignItems: 'center' },
  modalIndicator: { width: 40, height: 5, backgroundColor: '#eee', borderRadius: 3, marginBottom: 25 },
  modalHeader: { color: '#000', letterSpacing: 2, fontSize: 14, fontWeight: '900', marginBottom: 30 },
  fullBtn: { backgroundColor: '#000', width: '100%', padding: 20, borderRadius: 15, alignItems: 'center' },
  fullBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 1 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 30, width: '100%' },
  line: { flex: 1, height: 1, backgroundColor: '#eee' },
  orText: { color: '#aaa', marginHorizontal: 15, fontSize: 10, fontWeight: 'bold' },
  inputContainer: { width: '100%' },
  inputLabel: { fontSize: 8, color: '#aaa', fontWeight: '900', marginBottom: 5 },
  modalInput: { borderBottomWidth: 1, borderColor: '#eee', color: '#000', width: '100%', marginBottom: 25, fontSize: 16, fontWeight: 'bold' },
  periodBtn: { backgroundColor: '#007AFF', width: '100%', padding: 20, borderRadius: 15, alignItems: 'center' },
  periodBtnText: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  closeBtn: { marginTop: 20 },
  closeBtnText: { color: '#aaa', fontSize: 11, fontWeight: 'bold' }
});