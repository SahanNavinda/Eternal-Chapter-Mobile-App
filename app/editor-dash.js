import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, Image, StatusBar, Dimensions } from 'react-native';
import { db } from '../firebaseConfig'; 
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function EditorDash() {
  const [activeTab, setActiveTab] = useState('Trailer'); 
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const statusOptions = ['Pending', 'Done', 'Delivery'];

  useEffect(() => {
    // Listening to unified 'shoots' collection
    const q = query(collection(db, 'shoots'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setJobs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const updateStatus = async (jobId, type, newStatus) => {
    try {
      const shootRef = doc(db, 'shoots', jobId);
      const today = new Date().toISOString().split('T')[0];
      let update = type === 'Trailer' ? { trailerStatus: newStatus } : { fullVideoStatus: newStatus };
      
      if (newStatus === 'Done') update[type === 'Trailer' ? 'trailerDoneDate' : 'fullVideoDoneDate'] = today;
      if (newStatus === 'Delivery') update[type === 'Trailer' ? 'trailerDeliveryDate' : 'fullVideoDeliveryDate'] = today;
      
      await updateDoc(shootRef, update);
    } catch (e) {
      Alert.alert("Error", "Status update failed");
    }
  };

  const generateDetailedCSV = async () => {
    if (jobs.length === 0) return Alert.alert("No Data", "No projects found.");
    try {
      let csv = "Client Name,Trailer Status,Trailer Budget,Trailer Paid Date,Full Video Status,Full Video Budget,FV Paid Date,Disk ID\n";
      jobs.forEach(i => {
        csv += `${(i.clientName || 'N/A').replace(/,/g, "")},${i.trailerStatus || 'N/A'},${i.trailerBudget || 0},${i.trailerPaidDate || 'N/A'},${i.fullVideoStatus || 'N/A'},${i.fullVideoBudget || 0},${i.fullVideoPaidDate || 'N/A'},${i.hardDiskID || 'N/A'}\n`;
      });
      const fileUri = FileSystem.cacheDirectory + `Editor_Work_Report.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv);
      await Sharing.shareAsync(fileUri);
    } catch (e) {
      Alert.alert("Error", "CSV generation failed");
    }
  };

  const applyFilters = () => {
    return jobs.filter(job => {
      const isCorrectTab = activeTab === 'Trailer' ? job.trailerStatus !== 'N/A' : job.fullVideoStatus !== 'N/A';
      const nameMatch = (job.clientName || "").toLowerCase().includes(searchQuery.toLowerCase());
      const currentStatus = activeTab === 'Trailer' ? job.trailerStatus : job.fullVideoStatus;
      const statusMatch = statusFilter === 'All' || currentStatus === statusFilter;
      return isCorrectTab && nameMatch && statusMatch;
    });
  };

  if (loading) return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER WITH TINTED LOGO */}
      <View style={styles.brandedHeader}>
        <Image 
          source={require('../assets/images/logo.png')} 
          style={[styles.headerLogo, { tintColor: '#fff' }]} 
        />
        <Text style={styles.headerTitle}>POST-PRODUCTION PANEL</Text>
      </View>

      {/* TAB NAVIGATION */}
      <View style={styles.tabBar}>
        {['Trailer', 'Full Video', 'Finance'].map(t => (
          <TouchableOpacity 
            key={t} 
            style={[styles.tab, activeTab === t && styles.activeTab]} 
            onPress={() => { setActiveTab(t); setStatusFilter('All'); }}
          >
            <Text style={[styles.tabText, activeTab === t && styles.activeTabText]}>{t.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* SEARCH & FILTER CHIPS */}
      {activeTab !== 'Finance' && (
        <View style={styles.searchSection}>
          <View style={styles.inputWrapper}>
            <Ionicons name="search-outline" size={18} color="#666" />
            <TextInput 
              style={styles.lightInput} 
              placeholder="Search Production..." 
              value={searchQuery} 
              onChangeText={setSearchQuery} 
              placeholderTextColor="#555"
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {['All', ...statusOptions].map(s => (
              <TouchableOpacity key={s} style={[styles.chip, statusFilter === s && styles.activeChip]} onPress={() => setStatusFilter(s)}>
                <Text style={[styles.chipText, statusFilter === s && styles.activeChipText]}>{s.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        {activeTab !== 'Finance' ? (
          applyFilters().map(job => (
            <View key={job.id} style={styles.jobCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.clientName}>{job.clientName?.toUpperCase()}</Text>
                  <Text style={styles.diskLabel}>💾 DISK: {job.hardDiskID || 'N/A'}</Text>
                </View>
                <View style={[styles.payBadge, { backgroundColor: (activeTab === 'Trailer' ? job.trailerPaid : job.fullVideoPaid) ? '#28a745' : '#ff4444' }]}>
                  <Text style={styles.payText}>{(activeTab === 'Trailer' ? job.trailerPaid : job.fullVideoPaid) ? 'PAID' : 'UNPAID'}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.statusMiniHeader}>PROGRESS STATUS</Text>
              <View style={styles.btnRow}>
                {statusOptions.map(s => (
                  <TouchableOpacity 
                    key={s} 
                    onPress={() => updateStatus(job.id, activeTab, s)} 
                    style={[styles.sBtn, (activeTab === 'Trailer' ? job.trailerStatus : job.fullVideoStatus) === s && styles.sBtnActive]}
                  >
                    <Text style={[styles.sText, (activeTab === 'Trailer' ? job.trailerStatus : job.fullVideoStatus) === s && { color: '#fff' }]}>{s.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))
        ) : (
          <View>
            <TouchableOpacity style={styles.csvBtn} onPress={generateDetailedCSV}>
              <Ionicons name="cloud-download-outline" size={18} color="#000" style={{marginRight: 10}} />
              <Text style={styles.csvBtnText}>EXPORT FINANCIAL LOGS (CSV)</Text>
            </TouchableOpacity>

            {jobs.map(job => (
              <View key={job.id} style={styles.financeCard}>
                <Text style={styles.fClient}>{job.clientName?.toUpperCase()}</Text>
                <View style={styles.fRow}>
                  <Text style={styles.fLabel}>TRAILER:</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceText}>LKR {job.trailerBudget || 0}</Text>
                    <Text style={[styles.fStatus, { color: job.trailerPaid ? '#28a745' : '#ff4444' }]}>
                       {job.trailerPaid ? `PAID` : 'PENDING'}
                    </Text>
                  </View>
                </View>
                <View style={styles.fRow}>
                  <Text style={styles.fLabel}>FULL VIDEO:</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceText}>LKR {job.fullVideoBudget || 0}</Text>
                    <Text style={[styles.fStatus, { color: job.fullVideoPaid ? '#28a745' : '#ff4444' }]}>
                       {job.fullVideoPaid ? `PAID` : 'PENDING'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  brandedHeader: { alignItems: 'center', paddingTop: 60, paddingBottom: 20, backgroundColor: '#0a0a0a' },
  headerLogo: { width: 50, height: 50, marginBottom: 10 },
  headerTitle: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 3 },
  
  tabBar: { flexDirection: 'row', backgroundColor: '#0a0a0a', borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  tab: { flex: 1, padding: 18, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#007AFF' },
  tabText: { color: '#444', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  activeTabText: { color: '#fff' },

  searchSection: { paddingHorizontal: 20, paddingTop: 25 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#1a1a1a' },
  lightInput: { flex: 1, padding: 12, fontSize: 14, color: '#fff' },
  chipScroll: { marginTop: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#111', marginRight: 10, borderWidth: 1, borderColor: '#1a1a1a' },
  activeChip: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipText: { fontSize: 8, fontWeight: '900', color: '#555', letterSpacing: 1 },
  activeChipText: { color: '#fff' },

  jobCard: { backgroundColor: '#0a0a0a', padding: 22, borderRadius: 20, marginBottom: 18, borderWidth: 1, borderColor: '#1a1a1a' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  clientName: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 1 },
  diskLabel: { color: '#444', fontSize: 9, fontWeight: 'bold', marginTop: 4 },
  payBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  payText: { color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  divider: { height: 1, backgroundColor: '#1a1a1a', marginVertical: 18 },
  statusMiniHeader: { color: '#333', fontSize: 8, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sBtn: { paddingVertical: 10, borderWidth: 1, borderColor: '#1a1a1a', borderRadius: 10, width: '31%', alignItems: 'center', backgroundColor: '#050505' },
  sBtnActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  sText: { fontSize: 9, fontWeight: '900', color: '#444', letterSpacing: 1 },

  financeCard: { backgroundColor: '#0a0a0a', padding: 20, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#1a1a1a' },
  fClient: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', paddingBottom: 10 },
  fRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  fLabel: { fontSize: 9, color: '#444', fontWeight: '900', letterSpacing: 1 },
  priceRow: { alignItems: 'flex-end' },
  priceText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  fStatus: { fontSize: 8, fontWeight: '900', marginTop: 2 },
  
  csvBtn: { backgroundColor: '#fff', flexDirection: 'row', padding: 18, borderRadius: 15, marginBottom: 25, alignItems: 'center', justifyContent: 'center' },
  csvBtnText: { color: '#000', fontWeight: '900', fontSize: 11, letterSpacing: 1 }
});