import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, addDoc } from "firebase/firestore";
import { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function AdminDashboard() {
  const router = useRouter();
  const [view, setView] = useState('events'); 
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modals
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [editTaskModalVisible, setEditTaskModalVisible] = useState(false);
  
  // New Editing Task State
  const [newEditClient, setNewEditClient] = useState('');
  const [newEditDisk, setNewEditDisk] = useState('');
  const [projectScope, setProjectScope] = useState('Both');

  const [reportStart, setReportStart] = useState('2025-01-01');
  const [reportEnd, setReportEnd] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const qEvents = query(collection(db, "shoots"), orderBy("date", "desc"));
    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      setEvents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const qMembers = query(collection(db, "users"), orderBy("displayName", "asc"));
    const unsubMembers = onSnapshot(qMembers, (snapshot) => {
      setMembers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubEvents(); unsubMembers(); };
  }, []);

  const updatePayment = async (id, field, value) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      let updateData = { [field]: value };
      if (field === 'trailerPaid' && value === true) updateData.trailerPaidDate = today;
      if (field === 'fullVideoPaid' && value === true) updateData.fullVideoPaidDate = today;
      await updateDoc(doc(db, "shoots", id), updateData);
    } catch (e) { Alert.alert("Error", "Payment update failed."); }
  };

  const handleAddEditTask = async () => {
    if (!newEditClient) return Alert.alert("Error", "Please enter a client name.");
    try {
      await addDoc(collection(db, "shoots"), {
        clientName: newEditClient,
        hardDiskID: newEditDisk || "N/A",
        date: new Date().toISOString().split('T')[0],
        status: 'Completed', 
        trailerStatus: (projectScope === 'Both' || projectScope === 'Trailer') ? 'Pending' : 'N/A',
        fullVideoStatus: (projectScope === 'Both' || projectScope === 'Full Video') ? 'Pending' : 'N/A',
        scope: projectScope,
        type: 'Editing Only',
        trailerBudget: "0",
        fullVideoBudget: "0",
        trailerPaid: false,
        fullVideoPaid: false
      });
      setEditTaskModalVisible(false);
      setNewEditClient('');
      setNewEditDisk('');
    } catch (e) { Alert.alert("Error", e.message); }
  };

  const applyFilters = (data) => {
    return data.filter(item => {
      const nameMatch = (item.clientName || "").toLowerCase().includes(searchQuery.toLowerCase());
      const diskMatch = (item.hardDiskID || "").toLowerCase().includes(searchQuery.toLowerCase());
      let statusMatch = statusFilter === 'All' || 
                       (view === 'events' ? item.status === statusFilter : 
                       (item.trailerStatus === statusFilter || item.fullVideoStatus === statusFilter));
      return (nameMatch || diskMatch) && statusMatch;
    });
  };

  const editingShoots = applyFilters(events.filter(e => e.status === 'Completed'));
  const activeShoots = applyFilters(events);

  const handleGenerateMasterReport = async () => {
    const periodEvents = events.filter(e => e.date >= reportStart && e.date <= reportEnd);
    if (periodEvents.length === 0) return Alert.alert("No Data", "No projects found.");
    try {
      let csv = "Date,Client,Disk ID,Trailer Status,FV Status,Trailer Budget,FV Budget,Trailer Paid,FV Paid,Status\n";
      periodEvents.forEach(i => {
        csv += `${i.date},${(i.clientName || 'N/A')},${i.hardDiskID || 'N/A'},${i.trailerStatus},${i.fullVideoStatus},${i.trailerBudget},${i.fullVideoBudget},${i.trailerPaidDate || 'Unpaid'},${i.fullVideoPaidDate || 'Unpaid'},${i.status}\n`;
      });
      const fileUri = FileSystem.cacheDirectory + `Finance_Report_${reportStart}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv);
      await Sharing.shareAsync(fileUri);
      setReportModalVisible(false);
    } catch (e) { Alert.alert("Error", "CSV failed."); }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.brandedHeader}>
        <Image source={require('../assets/images/logo.png')} style={styles.headerLogo} resizeMode="contain" />
        <Text style={styles.headerTitle}>ADMIN PANEL</Text>
      </View>

      <View style={styles.tabBar}>
        {['events', 'editing', 'members'].map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, view === t && styles.activeTab]} onPress={() => { setView(t); setStatusFilter('All'); }}>
            <Text style={[styles.tabText, view === t && styles.activeTabText]}>{t === 'events' ? 'SHOOTS' : t.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {(view === 'events' || view === 'editing') && (
        <View style={{ flex: 1 }}>
          <View style={styles.searchSection}>
            <TextInput style={styles.lightInput} placeholder="Search Client or Disk ID..." placeholderTextColor="#888" value={searchQuery} onChangeText={setSearchQuery} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {(view === 'events' ? ['All', 'Pending', 'Accepted', 'Completed'] : ['All', 'Pending', 'Done', 'Delivery']).map(s => (
                <TouchableOpacity key={s} style={[styles.chip, statusFilter === s && styles.activeChip]} onPress={() => setStatusFilter(s)}>
                  <Text style={[styles.chipText, statusFilter === s && styles.activeChipText]}>{s.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity style={styles.reportBar} onPress={() => setReportModalVisible(true)}>
            <Text style={styles.reportBarText}>📄 EXPORT {view.toUpperCase()} CSV</Text>
          </TouchableOpacity>

          <ScrollView style={styles.list}>
            {view === 'events' ? (
              <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/(tabs)/explore')}>
                <Text style={styles.createBtnText}>+ ADD NEW SHOOT</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.createBtnEdit} onPress={() => setEditTaskModalVisible(true)}>
                <Text style={styles.createBtnText}>+ NEW EDITING TASK</Text>
              </TouchableOpacity>
            )}
            
            {(view === 'events' ? activeShoots : editingShoots).map(item => (
              view === 'events' ? (
                <View key={item.id} style={styles.eventCard}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardDate}>{item.date}</Text>
                    <Text style={styles.cardName}>{(item.clientName || "N/A").toUpperCase()}</Text>
                    <Text style={styles.cardLoc}>📍 {item.location || 'Edit Only'}</Text>
                    <Text style={[styles.statusText, { color: item.status === 'Completed' ? '#28a745' : '#e67e22' }]}>{item.status}</Text>
                  </View>
                  <View style={styles.actionColumn}>
                    <TouchableOpacity style={item.status === 'Completed' ? styles.undoBtn : styles.doneBtn} onPress={() => updateDoc(doc(db, "shoots", item.id), { status: item.status === 'Completed' ? 'Accepted' : 'Completed' })}>
                      <Text style={item.status === 'Completed' ? styles.undoText : styles.doneText}>{item.status === 'Completed' ? 'UNDO' : 'DONE'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.delBtn} onPress={() => {Alert.alert("Delete","Confirm?",[{text:"Cancel"},{text:"Delete",onPress:()=>deleteDoc(doc(db,"shoots",item.id))}])}}>
                      <Text style={styles.delText}>DEL</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View key={item.id} style={styles.editCard}>
                  <View style={styles.editHeader}>
                    <Text style={styles.editClient}>{item.clientName}</Text>
                    <TouchableOpacity onPress={() => deleteDoc(doc(db, "shoots", item.id))}>
                        <Ionicons name="trash-outline" size={16} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.statusRow}>
                    <View style={styles.statusBox}>
                      <Text style={styles.statusLabel}>TRAILER</Text>
                      <Text style={styles.statusVal}>{item.trailerStatus || 'Pending'}</Text>
                    </View>
                    <View style={[styles.statusBox, {borderLeftWidth: 1, borderColor: '#1a1a1a'}]}>
                      <Text style={styles.statusLabel}>FULL VIDEO</Text>
                      <Text style={styles.statusVal}>{item.fullVideoStatus || 'Pending'}</Text>
                    </View>
                  </View>

                  <View style={styles.adminFinanceSection}>
                    {/* Trailer Finance */}
                    <View style={styles.splitFinanceRow}>
                       <View style={{flex: 1}}>
                          <Text style={styles.financeLabel}>TRAILER BUDGET</Text>
                          <TextInput 
                            style={styles.budgetInput} keyboardType="numeric" defaultValue={item.trailerBudget} 
                            onEndEditing={(e) => updateDoc(doc(db, "shoots", item.id), { trailerBudget: e.nativeEvent.text })}
                          />
                       </View>
                       <TouchableOpacity style={[styles.payToggle, item.trailerPaid ? styles.paidBg : styles.pendingBg]} onPress={() => updatePayment(item.id, 'trailerPaid', !item.trailerPaid)}>
                          <Text style={styles.payText}>{item.trailerPaid ? 'PAID' : 'PENDING'}</Text>
                       </TouchableOpacity>
                    </View>

                    {/* Full Video Finance */}
                    <View style={[styles.splitFinanceRow, {marginTop: 15}]}>
                       <View style={{flex: 1}}>
                          <Text style={styles.financeLabel}>FULL VIDEO BUDGET</Text>
                          <TextInput 
                            style={styles.budgetInput} keyboardType="numeric" defaultValue={item.fullVideoBudget} 
                            onEndEditing={(e) => updateDoc(doc(db, "shoots", item.id), { fullVideoBudget: e.nativeEvent.text })}
                          />
                       </View>
                       <TouchableOpacity style={[styles.payToggle, item.fullVideoPaid ? styles.paidBg : styles.pendingBg]} onPress={() => updatePayment(item.id, 'fullVideoPaid', !item.fullVideoPaid)}>
                          <Text style={styles.payText}>{item.fullVideoPaid ? 'PAID' : 'PENDING'}</Text>
                       </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.totalText}>TOTAL: LKR {(Number(item.trailerBudget||0)+Number(item.fullVideoBudget||0)).toLocaleString()}</Text>
                  </View>
                </View>
              )
            ))}
          </ScrollView>
        </View>
      )}

      {view === 'members' && (
        <FlatList data={members} keyExtractor={item => item.id} renderItem={({ item }) => (
          <TouchableOpacity style={styles.memberCard} onPress={() => router.push({ pathname: '/member-details', params: { email: item.email, name: item.displayName, id: item.id } })}>
            <View style={styles.avatar}><Text style={styles.avatarTxt}>{item.displayName?.charAt(0)}</Text></View>
            <View><Text style={styles.memberName}>{item.displayName}</Text><Text style={styles.memberEmail}>{item.email}</Text></View>
          </TouchableOpacity>
        )} contentContainerStyle={{ padding: 20 }} />
      )}

      {/* MODALS */}
      <Modal visible={editTaskModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}><View style={styles.modalCard}>
          <Text style={styles.modalTitle}>NEW TASK</Text>
          <TextInput style={styles.modalInput} placeholder="Client Name" value={newEditClient} onChangeText={setNewEditClient} />
          <TextInput style={styles.modalInput} placeholder="Disk ID" value={newEditDisk} onChangeText={setNewEditDisk} />
          <TouchableOpacity style={styles.modalBtn} onPress={handleAddEditTask}><Text style={styles.modalBtnText}>ADD TASK</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setEditTaskModalVisible(false)}><Text style={{marginTop: 15, color: '#888'}}>CANCEL</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  brandedHeader: { alignItems: 'center', paddingVertical: 20, backgroundColor: '#000' },
  headerLogo: { width: 100, height: 100, tintColor: '#fff' },
  headerTitle: { color: '#fff', fontSize: 10, letterSpacing: 4, marginTop: 5, fontWeight: 'bold' },
  tabBar: { flexDirection: 'row', backgroundColor: '#1a1a1a' },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#007AFF' },
  tabText: { color: '#888', fontWeight: 'bold', fontSize: 11 },
  activeTabText: { color: '#fff' },
  searchSection: { padding: 20 },
  lightInput: { backgroundColor: '#1a1a1a', borderRadius: 8, color: '#fff', padding: 12 },
  chipScroll: { marginTop: 15 },
  chip: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1a1a1a', marginRight: 10 },
  activeChip: { backgroundColor: '#007AFF' },
  chipText: { color: '#888', fontSize: 9, fontWeight: 'bold' },
  activeChipText: { color: '#fff' },
  reportBar: { backgroundColor: '#007AFF', padding: 12, alignItems: 'center' },
  reportBarText: { color: '#fff', fontWeight: 'bold', fontSize: 10 },
  createBtn: { backgroundColor: '#fff', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  createBtnEdit: { backgroundColor: '#fff', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  createBtnText: { color: '#000', fontWeight: 'bold', fontSize: 12 },
  list: { padding: 20 },
  eventCard: { backgroundColor: '#111', borderRadius: 10, marginBottom: 15, flexDirection: 'row', overflow: 'hidden' },
  cardInfo: { flex: 3, padding: 15 },
  cardDate: { color: '#555', fontSize: 10, fontWeight: 'bold' },
  cardName: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginVertical: 4 },
  cardLoc: { color: '#888', fontSize: 12 },
  statusText: { fontSize: 10, fontWeight: 'bold', marginTop: 5 },
  actionColumn: { flex: 1 },
  doneBtn: { flex: 1, backgroundColor: '#28a745', justifyContent: 'center', alignItems: 'center' },
  doneText: { color: '#fff', fontWeight: 'bold', fontSize: 10 },
  undoBtn: { flex: 1, backgroundColor: '#e67e22', justifyContent: 'center', alignItems: 'center' },
  undoText: { color: '#fff', fontWeight: 'bold', fontSize: 10 },
  delBtn: { flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
  delText: { color: '#ff4444', fontWeight: 'bold', fontSize: 10 },
  editCard: { backgroundColor: '#111', borderRadius: 12, marginBottom: 15, overflow: 'hidden' },
  editHeader: { padding: 15, backgroundColor: '#1a1a1a', flexDirection: 'row', justifyContent: 'space-between' },
  editClient: { fontWeight: 'bold', color: '#fff' },
  statusRow: { flexDirection: 'row', padding: 15 },
  statusBox: { flex: 1, alignItems: 'center' },
  statusLabel: { fontSize: 8, color: '#444', fontWeight: 'bold' },
  statusVal: { color: '#fff', fontSize: 11, fontWeight: 'bold', marginTop: 4 },
  adminFinanceSection: { padding: 15, borderTopWidth: 1, borderColor: '#1a1a1a' },
  splitFinanceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  financeLabel: { fontSize: 8, color: '#555', fontWeight: 'bold' },
  budgetInput: { borderBottomWidth: 1, borderColor: '#333', color: '#fff', padding: 5 },
  payToggle: { padding: 8, borderRadius: 5, minWidth: 80, alignItems: 'center' },
  paidBg: { backgroundColor: '#28a745' },
  pendingBg: { backgroundColor: '#e67e22' },
  payText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  totalText: { color: '#fff', textAlign: 'right', marginTop: 15, fontWeight: '900' },
  memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', padding: 15, borderRadius: 10, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarTxt: { color: '#fff', fontWeight: 'bold' },
  memberName: { color: '#fff', fontWeight: 'bold' },
  memberEmail: { color: '#444', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#fff', width: '85%', padding: 25, borderRadius: 20 },
  modalInput: { borderBottomWidth: 1, borderColor: '#ddd', marginBottom: 20, padding: 10 },
  modalBtn: { backgroundColor: '#000', padding: 15, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: 'bold' },
});