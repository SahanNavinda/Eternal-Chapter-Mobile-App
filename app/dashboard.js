import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  StatusBar, 
  Image, 
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { db, auth } from '../firebaseConfig';
import { collection, onSnapshot, query, doc, updateDoc, where, orderBy } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
// Import the reminder function from your layout
import { scheduleShootReminder } from './_layout'; 

const { width } = Dimensions.get('window');

export default function MyDashboard() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('Pending'); 
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, "shoots"), 
      where("workerName", "==", user.displayName),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(allEvents);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const updateStatus = async (item, newStatus) => {
    try {
      await updateDoc(doc(db, "shoots", item.id), { status: newStatus });
      
      // --- NOTIFICATION LOGIC ---
      if (newStatus === 'Accepted') {
        // Schedule reminder for the specific date of this shoot
        await scheduleShootReminder(item.clientName || item.name, item.date);
        Alert.alert(
          "Project Accepted", 
          `Workspace updated. A reminder is set for 24 hours before the shoot.`
        );
      } else {
        Alert.alert("Workspace Updated", `Project has been marked as ${newStatus}`);
      }
    } catch (e) {
      Alert.alert("Error", "Could not update status.");
    }
  };

  const filteredEvents = events.filter(e => e.status === filter);

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );

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

      <View style={styles.userHeader}>
        <View>
          <Text style={styles.welcomeText}>HELLO, {user?.displayName?.split(' ')[0].toUpperCase()}</Text>
          <Text style={styles.subWelcome}>PRODUCTION WORKSPACE</Text>
        </View>
        <TouchableOpacity onPress={() => Alert.alert("Notifications", "Reminder system active.")}>
           <Ionicons name="notifications-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* PREMIUM TAB BAR */}
      <View style={styles.tabBar}>
        {['Pending', 'Accepted', 'Declined'].map((tab) => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tab, filter === tab && styles.activeTab]} 
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.tabLabel, filter === tab && styles.activeTabLabel]}>{tab.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filteredEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="file-tray-outline" size={40} color="#333" />
            <Text style={styles.emptyText}>NO {filter.toUpperCase()} PROJECTS</Text>
          </View>
        ) : (
          filteredEvents.map(item => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.dateText}>{item.date}</Text>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{item.type || 'SHOOT'}</Text>
                </View>
              </View>

              <Text style={styles.titleText}>{(item.clientName || item.name || 'CLIENT').toUpperCase()}</Text>
              
              <View style={styles.infoRow}>
                <Ionicons name="location-sharp" size={14} color="#007AFF" />
                <Text style={styles.infoText}>{item.location}</Text>
              </View>

              {filter === 'Pending' && (
                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.accBtn} onPress={() => updateStatus(item, 'Accepted')}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.btnTxt}>ACCEPT</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.decBtn} onPress={() => updateStatus(item, 'Declined')}>
                    <Ionicons name="close" size={16} color="#fff" />
                    <Text style={styles.btnTxt}>DECLINE</Text>
                  </TouchableOpacity>
                </View>
              )}

              {filter === 'Accepted' && (
                <View>
                  <TouchableOpacity 
                    style={styles.completeBtn} 
                    onPress={() => updateStatus(item, 'Completed')}
                  >
                    <Ionicons name="checkmark-done" size={18} color="#000" style={{marginRight: 8}} />
                    <Text style={styles.completeBtnTxt}>MARK AS COMPLETED</Text>
                  </TouchableOpacity>
                  <View style={styles.reminderStatus}>
                     <Ionicons name="alarm-outline" size={12} color="#007AFF" />
                     <Text style={styles.reminderText}>REMINDER SET FOR DAY BEFORE</Text>
                  </View>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  watermarkContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 0 },
  watermarkLogo: { width: width * 0.9, height: width * 0.9, opacity: 0.08, tintColor: '#fff' },
  userHeader: { padding: 30, paddingTop: 60, backgroundColor: '#0a0a0a', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  welcomeText: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  subWelcome: { color: '#007AFF', fontSize: 9, fontWeight: 'bold', letterSpacing: 3, marginTop: 4 },
  tabBar: { flexDirection: 'row', backgroundColor: '#0a0a0a', paddingHorizontal: 10 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 15 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#007AFF' },
  tabLabel: { color: '#444', fontWeight: 'bold', fontSize: 10, letterSpacing: 1 },
  activeTabLabel: { color: '#fff' },
  scrollContent: { padding: 20, paddingBottom: 40, zIndex: 1 },
  card: { backgroundColor: 'rgba(18, 18, 18, 0.85)', padding: 22, borderRadius: 22, marginBottom: 20, borderWidth: 1, borderColor: '#222' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateText: { color: '#007AFF', fontWeight: 'bold', fontSize: 11, letterSpacing: 1 },
  typeBadge: { backgroundColor: '#111', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#222' },
  typeText: { color: '#666', fontSize: 8, fontWeight: 'bold' },
  titleText: { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  infoText: { color: '#aaa', fontSize: 12 },
  btnRow: { flexDirection: 'row', marginTop: 22, gap: 12 },
  accBtn: { flex: 1, backgroundColor: '#28a745', flexDirection: 'row', gap: 8, padding: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  decBtn: { flex: 1, backgroundColor: '#dc3545', flexDirection: 'row', gap: 8, padding: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 11, letterSpacing: 1 },
  completeBtn: { backgroundColor: '#fff', flexDirection: 'row', padding: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  completeBtnTxt: { color: '#000', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  reminderStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 5 },
  reminderText: { color: '#007AFF', fontSize: 8, fontWeight: 'bold', letterSpacing: 1 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#333', marginTop: 15, fontSize: 12, fontWeight: 'bold', letterSpacing: 2 }
});