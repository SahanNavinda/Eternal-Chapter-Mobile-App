import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar, 
  ActivityIndicator, 
  Image, 
  Dimensions 
} from 'react-native';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig'; 
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN", 
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
];

const YEARS = ["2025", "2026", "2027"];

export default function PremiumCalendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selection State
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState("2026");

  const currentUser = auth.currentUser;

  useEffect(() => {
    const q = query(collection(db, "shoots"), orderBy("date", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const filtered = allEvents.filter(event => {
        // 1. User Specific Filter
        const isAssigned = !event.workerName || 
                           (event.workerName === currentUser?.displayName) || 
                           (event.assignedTo === currentUser?.email);
        
        // 2. Date Filter (Checking if event date matches selected month/year)
        const eventDate = new Date(event.date);
        const matchesMonth = eventDate.getMonth() === selectedMonth;
        const matchesYear = event.date.includes(selectedYear);
                           
        return isAssigned && matchesMonth && matchesYear;
      });

      setEvents(filtered);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser, selectedMonth, selectedYear]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return '#28a745';
      case 'Accepted': return '#007AFF';
      default: return '#e67e22';
    }
  };

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
          source={require('../../assets/images/logo.png')} 
          style={styles.watermarkLogo} 
          resizeMode="contain"
        />
      </View>
      
      {/* PREMIUM FILTER BAR */}
      <View style={styles.filterHeader}>
        <View style={styles.yearRow}>
           {YEARS.map(y => (
             <TouchableOpacity key={y} onPress={() => setSelectedYear(y)}>
                <Text style={[styles.yearText, selectedYear === y && styles.activeYear]}>{y}</Text>
             </TouchableOpacity>
           ))}
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
          {MONTHS.map((m, index) => (
            <TouchableOpacity 
              key={m} 
              onPress={() => setSelectedMonth(index)}
              style={[styles.monthTab, selectedMonth === index && styles.activeMonthTab]}
            >
              <Text style={[styles.monthText, selectedMonth === index && styles.activeMonthText]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={50} color="#222" />
            <Text style={styles.emptyText}>No productions in {MONTHS[selectedMonth]} {selectedYear}</Text>
          </View>
        ) : (
          events.map((item, index) => (
            <View key={item.id} style={styles.timelineItem}>
              <View style={styles.lineSection}>
                <View style={[styles.dot, { backgroundColor: getStatusColor(item.status) }]} />
                {index !== events.length - 1 && <View style={styles.verticalLine} />}
              </View>

              <TouchableOpacity style={styles.eventCard} activeOpacity={0.9}>
                <View style={styles.cardHeader}>
                  <Text style={styles.dateText}>{item.date}</Text>
                  <View style={[styles.statusBadge, { borderColor: getStatusColor(item.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                      {item.status?.toUpperCase() || 'PENDING'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.clientName}>{item.clientName?.toUpperCase()}</Text>
                
                <View style={styles.infoRow}>
                  <View style={styles.iconInfo}>
                    <Ionicons name="location-sharp" size={14} color="#007AFF" />
                    <Text style={styles.infoText}>{item.location || 'Location TBA'}</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.footerLabel}>ASSIGNED TO YOU</Text>
                  <Ionicons name="checkmark-circle" size={14} color="#28a745" />
                </View>
              </TouchableOpacity>
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
  
  // Filter Header Styles
  filterHeader: { 
    paddingTop: 60, 
    backgroundColor: 'rgba(10, 10, 10, 0.95)', 
    borderBottomWidth: 1, 
    borderColor: '#1a1a1a',
    zIndex: 10 
  },
  yearRow: { flexDirection: 'row', justifyContent: 'center', gap: 30, marginBottom: 15 },
  yearText: { color: '#444', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  activeYear: { color: '#007AFF' },
  
  monthScroll: { paddingLeft: 20, marginBottom: 15 },
  monthTab: { marginRight: 25, paddingBottom: 5 },
  activeMonthTab: { borderBottomWidth: 2, borderBottomColor: '#007AFF' },
  monthText: { color: '#444', fontSize: 13, fontWeight: 'bold' },
  activeMonthText: { color: '#fff' },

  watermarkContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 0 },
  watermarkLogo: { width: width * 0.9, height: width * 0.9, opacity: 0.08, tintColor: '#fff' },

  scrollContent: { padding: 25, paddingTop: 30, zIndex: 1 },
  timelineItem: { flexDirection: 'row' },
  lineSection: { alignItems: 'center', marginRight: 20, width: 20 },
  dot: { width: 10, height: 10, borderRadius: 5, zIndex: 2, marginTop: 28 },
  verticalLine: { width: 1, flex: 1, backgroundColor: '#222', marginVertical: 5 },
  
  eventCard: { flex: 1, backgroundColor: 'rgba(18, 18, 18, 0.85)', borderRadius: 22, padding: 22, marginBottom: 28, borderWidth: 1, borderColor: '#222' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  dateText: { color: '#666', fontSize: 11, fontWeight: 'bold' },
  statusBadge: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 8, fontWeight: '900' },
  clientName: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 18, letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', marginBottom: 20 },
  iconInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { color: '#aaa', fontSize: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 18, borderTopWidth: 1, borderTopColor: '#222' },
  footerLabel: { color: '#444', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  
  emptyState: { alignItems: 'center', marginTop: 120 },
  emptyText: { color: '#333', marginTop: 20, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }
});