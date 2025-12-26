import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
import { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../firebaseConfig';

export default function AdminDashboard() {
  const router = useRouter();
  const [view, setView] = useState('events'); 
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [memberSearch, setMemberSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [reportStart, setReportStart] = useState('2025-01-01');
  const [reportEnd, setReportEnd] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const qEvents = query(collection(db, "events"), orderBy("date", "desc"));
    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      setEvents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const qMembers = query(collection(db, "users"), orderBy("displayName", "asc"));
    const unsubMembers = onSnapshot(qMembers, (snapshot) => {
      setMembers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubEvents(); unsubMembers(); };
  }, []);

  const filteredEvents = events.filter(event => {
    const match = (event.name?.toLowerCase().includes(searchQuery.toLowerCase()) || event.location?.toLowerCase().includes(searchQuery.toLowerCase()));
    const statusMatch = statusFilter === 'All' || event.status === statusFilter;
    return match && statusMatch;
  });

  const filteredMembers = members.filter(m => 
    m.displayName?.toLowerCase().includes(memberSearch.toLowerCase()) || m.email?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const handleGenerateMasterReport = async () => {
    const periodEvents = events.filter(e => e.date >= reportStart && e.date <= reportEnd);
    if (periodEvents.length === 0) return Alert.alert("No Data", "No shoots found.");
    try {
      let csv = "Date,Event,Location,Worker,Status\n";
      periodEvents.forEach(i => csv += `${i.date},${i.name.replace(/,/g," ")},${i.location.replace(/,/g," ")},${i.workerName || i.assignedTo},${i.status}\n`);
      const fileUri = FileSystem.cacheDirectory + `Master_Report.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv);
      await Sharing.shareAsync(fileUri);
      setModalVisible(false);
    } catch (e) { Alert.alert("Error", "CSV failed."); }
  };

  // RESTORED: Status Update Logic
  const updateStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, "events", id), { status: newStatus });
    } catch (e) { Alert.alert("Error", "Update failed."); }
  };

  const handleDeleteEvent = (id) => {
    Alert.alert("Delete", "Permanently remove this shoot?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: 'destructive', onPress: async () => {
          await deleteDoc(doc(db, "events", id));
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.brandedHeader}>
        <Image source={require('../assets/images/logo.png')} style={styles.headerLogo} resizeMode="contain" />
        <Text style={styles.headerTitle}>ADMIN PANEL</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, view === 'events' && styles.activeTab]} onPress={() => setView('events')}>
          <Text style={[styles.tabText, view === 'events' && styles.activeTabText]}>SHOOTS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, view === 'members' && styles.activeTab]} onPress={() => setView('members')}>
          <Text style={[styles.tabText, view === 'members' && styles.activeTabText]}>TEAM</Text>
        </TouchableOpacity>
      </View>

      {view === 'events' ? (
        <View style={{ flex: 1 }}>
          <View style={styles.searchSection}>
            <TextInput style={styles.lightInput} placeholder="Search shoots..." placeholderTextColor="#888" value={searchQuery} onChangeText={setSearchQuery} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {['All', 'Pending', 'Accepted', 'Completed'].map(s => (
                <TouchableOpacity key={s} style={[styles.chip, statusFilter === s && styles.activeChip]} onPress={() => setStatusFilter(s)}>
                  <Text style={[styles.chipText, statusFilter === s && styles.activeChipText]}>{s.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity style={styles.reportBar} onPress={() => setModalVisible(true)}>
            <Text style={styles.reportBarText}>📄 EXPORT MASTER CSV</Text>
          </TouchableOpacity>

          <ScrollView style={styles.list}>
            <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/(tabs)/explore')}>
              <Text style={styles.createBtnText}>+ ADD NEW SHOOT</Text>
            </TouchableOpacity>
            
            {filteredEvents.map(item => (
              <View key={item.id} style={styles.eventCard}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardDate}>{item.date}</Text>
                  <Text style={styles.cardName}>{item.name.toUpperCase()}</Text>
                  <Text style={styles.cardLoc}>📍 {item.location}</Text>
                  <Text style={styles.cardWorker}>👤 {item.workerName || item.assignedTo}</Text>
                  <Text style={[styles.statusText, { color: item.status === 'Completed' ? '#28a745' : '#e67e22' }]}>{item.status}</Text>
                </View>

                {/* RESTORED: Action Column */}
                <View style={styles.actionColumn}>
                  {item.status !== 'Completed' ? (
                    <TouchableOpacity style={styles.doneBtn} onPress={() => updateStatus(item.id, 'Completed')}>
                      <Text style={styles.doneText}>DONE</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.undoBtn} onPress={() => updateStatus(item.id, 'Accepted')}>
                      <Text style={styles.undoText}>UNDO</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.delBtn} onPress={() => handleDeleteEvent(item.id)}>
                    <Text style={styles.delText}>DEL</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : (
        /* ... Member list code remains same as previous ... */
        <View style={{ flex: 1 }}>
          <View style={styles.searchSection}>
            <TextInput style={styles.lightInput} placeholder="Search members..." placeholderTextColor="#888" value={memberSearch} onChangeText={setMemberSearch} />
          </View>
          <FlatList
            data={filteredMembers}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.memberCard} onPress={() => router.push({ pathname: '/member-details', params: { email: item.email, name: item.displayName, id: item.id } })}>
                <View style={styles.avatar}><Text style={styles.avatarTxt}>{item.displayName?.charAt(0)}</Text></View>
                <View>
                  <Text style={styles.memberName}>{item.displayName}</Text>
                  <Text style={styles.memberEmail}>{item.email}</Text>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ padding: 20 }}
          />
        </View>
      )}

      {/* Date Modal ... same as before ... */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>REPORT PERIOD</Text>
            <TextInput style={styles.modalInput} value={reportStart} onChangeText={setReportStart} />
            <TextInput style={styles.modalInput} value={reportEnd} onChangeText={setReportEnd} />
            <TouchableOpacity style={styles.modalBtn} onPress={handleGenerateMasterReport}><Text style={styles.modalBtnText}>DOWNLOAD</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{marginTop: 15, color: '#888'}}>CANCEL</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#D1D3D4' },
  brandedHeader: { alignItems: 'center', paddingVertical: 20, backgroundColor: '#D1D3D4' },
  headerLogo: { width: 100, height: 100 },
  headerTitle: { color: '#1A1A1A', fontSize: 10, letterSpacing: 4, marginTop: 5, fontWeight: 'bold' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 20 },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#1A1A1A' },
  tabText: { color: '#888', fontWeight: 'bold', fontSize: 12 },
  activeTabText: { color: '#1A1A1A' },
  searchSection: { padding: 20 },
  lightInput: { backgroundColor: '#E1E2E3', borderRadius: 8, color: '#1A1A1A', padding: 12, fontSize: 14 },
  chipScroll: { marginTop: 15 },
  chip: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, backgroundColor: '#E1E2E3', marginRight: 10 },
  activeChip: { backgroundColor: '#1A1A1A' },
  chipText: { color: '#888', fontSize: 9, fontWeight: 'bold' },
  activeChipText: { color: '#D1D3D4' },
  reportBar: { backgroundColor: '#1A1A1A', padding: 12, alignItems: 'center' },
  reportBarText: { color: '#D1D3D4', fontWeight: 'bold', fontSize: 10, letterSpacing: 1 },
  createBtn: { backgroundColor: '#FFF', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  createBtnText: { color: '#1A1A1A', fontWeight: 'bold', fontSize: 12 },
  list: { padding: 20 },
  eventCard: { backgroundColor: '#FFF', borderRadius: 10, marginBottom: 15, flexDirection: 'row', overflow: 'hidden', elevation: 2 },
  cardInfo: { flex: 3, padding: 15 },
  cardDate: { color: '#888', fontSize: 10, fontWeight: 'bold' },
  cardName: { color: '#1A1A1A', fontSize: 15, fontWeight: 'bold', marginVertical: 4 },
  cardLoc: { color: '#666', fontSize: 12 },
  cardWorker: { color: '#555', fontSize: 11, marginTop: 5 },
  statusText: { fontSize: 10, fontWeight: 'bold', marginTop: 5 },
  
  // Action Buttons Styling
  actionColumn: { flex: 1, borderLeftWidth: 1, borderColor: '#eee' },
  doneBtn: { flex: 1, backgroundColor: '#e8f5e9', justifyContent: 'center', alignItems: 'center' },
  doneText: { color: '#28a745', fontWeight: 'bold', fontSize: 10 },
  undoBtn: { flex: 1, backgroundColor: '#fff3cd', justifyContent: 'center', alignItems: 'center' },
  undoText: { color: '#856404', fontWeight: 'bold', fontSize: 10 },
  delBtn: { flex: 1, backgroundColor: '#ffebee', justifyContent: 'center', alignItems: 'center' },
  delText: { color: '#ff3b30', fontWeight: 'bold', fontSize: 10 },

  memberCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, backgroundColor: '#FFF', padding: 15, borderRadius: 10, elevation: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarTxt: { color: '#D1D3D4', fontWeight: 'bold' },
  memberName: { color: '#1A1A1A', fontWeight: 'bold', fontSize: 16 },
  memberEmail: { color: '#888', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#D1D3D4', width: '80%', padding: 30, borderRadius: 20, alignItems: 'center' },
  modalTitle: { color: '#1A1A1A', fontWeight: 'bold', marginBottom: 20 },
  modalInput: { width: '100%', borderBottomWidth: 1, borderColor: '#1A1A1A', color: '#1A1A1A', marginBottom: 20, textAlign: 'center' },
  modalBtn: { backgroundColor: '#1A1A1A', width: '100%', padding: 15, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { color: '#D1D3D4', fontWeight: 'bold' }
});