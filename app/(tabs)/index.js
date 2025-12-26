import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { db } from '../../firebaseConfig'; 
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

export default function HomeScreen() {
  const [allEvents, setAllEvents] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dayEvents, setDayEvents] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("date", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllEvents(eventsList);
      
      // Generate dots for the calendar
      const dots = {};
      eventsList.forEach((event) => {
        // If multiple events on same day, we can show multiple dots or a specific color
        dots[event.date] = { 
          marked: true, 
          dotColor: event.status === 'Accepted' ? '#28a745' : '#ff9500' 
        };
      });
      setMarkedDates(dots);
      
      // Refresh the list for the currently selected date
      filterEventsByDate(selectedDate, eventsList);
    });
    return () => unsubscribe();
  }, []);

  const filterEventsByDate = (date, list = allEvents) => {
    const filtered = list.filter(e => e.date === date);
    setDayEvents(filtered);
    setSelectedDate(date);
  };

  return (
    <View style={styles.container}>
      <Calendar 
        markedDates={{
          ...markedDates,
          [selectedDate]: { ...markedDates[selectedDate], selected: true, selectedColor: '#007AFF' }
        }} 
        onDayPress={(day) => filterEventsByDate(day.dateString)}
        theme={{
          todayTextColor: '#007AFF',
          selectedDayBackgroundColor: '#007AFF',
          dotColor: '#007AFF',
        }}
      />

      <View style={styles.eventListHeader}>
        <Text style={styles.headerTitle}>Events for {selectedDate}</Text>
        <Text style={styles.headerSub}>{dayEvents.length} Shoot(s) Scheduled</Text>
      </View>

      <ScrollView style={styles.eventScroll}>
        {dayEvents.length > 0 ? (
          dayEvents.map((item) => (
            <View key={item.id} style={styles.eventCard}>
              <View style={[styles.statusIndicator, { backgroundColor: item.status === 'Accepted' ? '#28a745' : '#ff9500' }]} />
              <View style={styles.cardContent}>
                <Text style={styles.eventTitle}>{item.name}</Text>
                <Text style={styles.eventInfo}>📍 {item.location}</Text>
                <Text style={styles.eventInfo}>👤 Assigned: {item.assignedTo}</Text>
                <Text style={[styles.statusText, { color: item.status === 'Accepted' ? '#28a745' : '#ff9500' }]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No events scheduled for this day.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  eventListHeader: { padding: 15, backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  headerSub: { fontSize: 12, color: '#666', marginTop: 2 },
  eventScroll: { flex: 1, padding: 15 },
  eventCard: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    marginBottom: 12, 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 2,
    overflow: 'hidden'
  },
  statusIndicator: { width: 6 },
  cardContent: { padding: 15, flex: 1 },
  eventTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  eventInfo: { fontSize: 13, color: '#666', marginTop: 3 },
  statusText: { fontSize: 11, fontWeight: 'bold', marginTop: 8 },
  emptyContainer: { marginTop: 40, alignItems: 'center' },
  emptyText: { color: '#bbb', fontSize: 14 }
});