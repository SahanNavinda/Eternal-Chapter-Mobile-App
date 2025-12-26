import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../firebaseConfig';

export default function MemberDetails() {
  const { email, name, id } = useLocalSearchParams();
  const router = useRouter();
  const [memberEvents, setMemberEvents] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [reportStart, setReportStart] = useState('2025-01-01');
  const [reportEnd, setReportEnd] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!email) return;
    const q = query(collection(db, "events"), where("assignedTo", "==", email.toLowerCase().trim()), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snapshot) => setMemberEvents(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [email]);

  const generateCSV = async (isFull) => {
    const data = isFull ? memberEvents : memberEvents.filter(e => e.date >= reportStart && e.date <= reportEnd);
    if (data.length === 0) return Alert.alert("No Data", "No shoots found.");
    try {
      let csv = `History for ${name}\nDate,Event,Location,Status\n`;
      data.forEach(e => csv += `${e.date},${e.name.replace(/,/g," ")},${e.location.replace(/,/g," ")},${e.status}\n`);
      const fileUri = FileSystem.cacheDirectory + `${name}_History.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv);
      await Sharing.shareAsync(fileUri);
      setModalVisible(false);
    } catch (e) { Alert.alert("Error", "CSV failed."); }
  };

  const removeMember = () => {
    Alert.alert("Remove Staff", "Delete user but keep their history?", [
      { text: "Cancel" },
      { text: "Remove", style: 'destructive', onPress: async () => {
          await deleteDoc(doc(db, "users", id));
          router.back();
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backTxt}>← BACK</Text></TouchableOpacity>
        <Image source={require('../assets/images/logo.png')} style={styles.detailLogo} />
        <Text style={styles.headerTitle}>{name?.toUpperCase()}</Text>
        <Text style={styles.headerSub}>{email}</Text>
        <TouchableOpacity style={styles.premiumBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.premiumBtnText}>DOWNLOAD WORK HISTORY</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={memberEvents}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.eventItem}>
            <View>
              <Text style={styles.eventDate}>{item.date}</Text>
              <Text style={styles.eventName}>{item.name}</Text>
            </View>
            <Text style={[styles.statusText, { color: item.status === 'Completed' ? '#28a745' : '#666' }]}>{item.status}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 25 }}
      />

      <TouchableOpacity style={styles.deleteLink} onPress={removeMember}>
        <Text style={styles.deleteLinkText}>REVOKE STAFF ACCESS</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
           <View style={styles.modalContent}>
              <Text style={styles.modalHeader}>HISTORY EXPORT</Text>
              <TouchableOpacity style={styles.fullBtn} onPress={() => generateCSV(true)}><Text style={styles.fullBtnText}>ALL TIME HISTORY</Text></TouchableOpacity>
              <Text style={styles.orText}>OR SELECT PERIOD</Text>
              <TextInput style={styles.modalInput} value={reportStart} onChangeText={setReportStart} />
              <TextInput style={styles.modalInput} value={reportEnd} onChangeText={setReportEnd} />
              <TouchableOpacity style={styles.periodBtn} onPress={() => generateCSV(false)}><Text style={styles.periodBtnText}>EXPORT PERIOD</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{color: '#444', marginTop: 15}}>CLOSE</Text></TouchableOpacity>
           </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { padding: 40, alignItems: 'center', borderBottomWidth: 1, borderColor: '#111' },
  backTxt: { color: '#555', alignSelf: 'flex-start', fontSize: 12, fontWeight: 'bold' },
  detailLogo: { width: 100, height: 100, marginBottom: 15 },
  headerTitle: { color: '#fff', fontSize: 20, letterSpacing: 3, fontWeight: 'bold' },
  headerSub: { color: '#444', fontSize: 12, marginTop: 5 },
  premiumBtn: { marginTop: 20, borderBottomWidth: 1, borderColor: '#fff', paddingBottom: 5 },
  premiumBtnText: { color: '#fff', fontSize: 10, letterSpacing: 2, fontWeight: 'bold' },
  eventItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderColor: '#111' },
  eventDate: { color: '#333', fontSize: 10, fontWeight: 'bold' },
  eventName: { color: '#fff', fontSize: 15, marginTop: 2 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  deleteLink: { padding: 30, alignItems: 'center' },
  deleteLinkText: { color: '#ff3b30', fontSize: 10, letterSpacing: 2, fontWeight: 'bold' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#000', width: '85%', padding: 30, borderSeparator: 1, borderColor: '#222', borderWidth: 1, borderRadius: 10, alignItems: 'center' },
  modalHeader: { color: '#fff', letterSpacing: 4, fontSize: 14, marginBottom: 30 },
  fullBtn: { backgroundColor: '#fff', width: '100%', padding: 15, borderRadius: 2, alignItems: 'center' },
  fullBtnText: { color: '#000', fontWeight: 'bold' },
  orText: { color: '#333', marginVertical: 20, fontSize: 10, fontWeight: 'bold' },
  modalInput: { borderBottomWidth: 1, borderColor: '#222', color: '#fff', width: '100%', marginBottom: 20, textAlign: 'center' },
  periodBtn: { borderBottomWidth: 1, borderColor: '#fff', paddingBottom: 5, marginTop: 10 },
  periodBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 10, letterSpacing: 2 }
});