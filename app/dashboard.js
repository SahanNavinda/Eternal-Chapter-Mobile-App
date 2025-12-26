import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { db, auth } from '../firebaseConfig';
import { collection, onSnapshot, query, doc, updateDoc, where, orderBy } from "firebase/firestore";

export default function MyDashboard() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('Pending'); 
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "events"), 
      where("assignedTo", "==", user.email.toLowerCase().trim()),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(allEvents);
    });
    return () => unsubscribe();
  }, [user]);

  const updateStatus = async (id, newStatus) => {
    await updateDoc(doc(db, "events", id), { status: newStatus });
    Alert.alert("Updated", `Event moved to ${newStatus}`);
  };

  const currentFilter = filter || 'Pending';
  const filteredEvents = events.filter(e => e.status === currentFilter);

  return (
    <View style={styles.container}>
      <View style={styles.userHeader}>
        <Text style={styles.welcomeText}>Hello, {user?.displayName || 'Member'}</Text>
        <Text style={styles.subWelcome}>Manage your production schedule below.</Text>
      </View>

      <View style={styles.tabBar}>
        {['Pending', 'Accepted', 'Declined'].map((tab) => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tab, currentFilter === tab && styles.activeTab]} 
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.tabLabel, currentFilter === tab && styles.activeTabLabel]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ padding: 15 }}>
        {filteredEvents.map(item => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.dateText}>{item.date}</Text>
            <Text style={styles.titleText}>{item.name}</Text>
            <Text style={styles.infoText}>📍 {item.location}</Text>
            {currentFilter === 'Pending' && (
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.accBtn} onPress={() => updateStatus(item.id, 'Accepted')}>
                  <Text style={styles.btnTxt}>ACCEPT</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.decBtn} onPress={() => updateStatus(item.id, 'Declined')}>
                  <Text style={styles.btnTxt}>DECLINE</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  userHeader: { padding: 25, backgroundColor: '#1a1a1a' },
  welcomeText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  subWelcome: { color: '#888', fontSize: 12, marginTop: 5 },
  tabBar: { flexDirection: 'row', backgroundColor: '#1a1a1a', paddingBottom: 10 },
  tab: { flex: 1, alignItems: 'center', padding: 10 },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#007AFF' },
  tabLabel: { color: '#888', fontWeight: 'bold', fontSize: 12 },
  activeTabLabel: { color: '#fff' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 15, marginBottom: 15, elevation: 3 },
  dateText: { color: '#007AFF', fontWeight: 'bold', fontSize: 12 },
  titleText: { fontSize: 18, fontWeight: 'bold', marginTop: 5 },
  infoText: { color: '#666', marginTop: 3 },
  btnRow: { flexDirection: 'row', marginTop: 15, gap: 10 },
  accBtn: { flex: 1, backgroundColor: '#28a745', padding: 12, borderRadius: 8, alignItems: 'center' },
  decBtn: { flex: 1, backgroundColor: '#dc3545', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: 'bold' }
});