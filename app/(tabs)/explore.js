import { addDoc, collection, getDocs, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../../firebaseConfig';

export default function AddEventScreen() {
  const [name, setName] = useState('');
  const [date, setDate] = useState(''); 
  const [location, setLocation] = useState('');
  
  // Worker Selection States
  const [workerSearch, setWorkerSearch] = useState('');
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [allWorkers, setAllWorkers] = useState([]);
  const [filteredWorkers, setFilteredWorkers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // PREVENT DUPLICATION STATE
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const q = query(collection(db, "users"), orderBy("displayName", "asc"));
        const snapshot = await getDocs(q);
        const workers = snapshot.docs.map(doc => ({
          name: doc.data().displayName || "Unknown",
          email: doc.data().email
        }));
        setAllWorkers(workers);
      } catch (e) { console.log("Fetch Workers Error:", e); }
    };
    fetchWorkers();
  }, []);

  const handleSearchWorker = (text) => {
    setWorkerSearch(text);
    if (text.length > 0) {
      const filtered = allWorkers.filter(w => 
        w.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredWorkers(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectWorker = (worker) => {
    setSelectedWorker(worker);
    setWorkerSearch(worker.name);
    setShowSuggestions(false);
  };

  const handleCreateEvent = async () => {
    // 1. Basic Validation
    if (!name || !date || !location || !selectedWorker) {
      Alert.alert("Error", "Please fill all fields and select a worker.");
      return;
    }

    // 2. BLOCK THE SECOND CLICK
    if (isSubmitting) return; 

    setIsSubmitting(true);

    try {
      await addDoc(collection(db, "events"), {
        name: name.trim(), 
        date: date.trim(), 
        location: location.trim(),
        assignedTo: selectedWorker.email,
        workerName: selectedWorker.name,
        status: "Pending",
        createdAt: new Date().toISOString()
      });

      Alert.alert("Success", "Shoot successfully assigned!");
      
      // 3. Clear the form
      setName(''); setDate(''); setLocation(''); setWorkerSearch(''); setSelectedWorker(null);
    } catch (e) {
      Alert.alert("Error", "Could not save shoot. Try again.");
    } finally {
      // 4. UNBLOCK after a short delay
      setTimeout(() => setIsSubmitting(false), 1000);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Shoot Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Wedding Highlight" />

      <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="2025-12-30" />

      <Text style={styles.label}>Location</Text>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Colombo, SL" />

      <Text style={styles.label}>Assign To</Text>
      <TextInput 
        style={[styles.input, selectedWorker && styles.inputSelected]} 
        value={workerSearch} 
        onChangeText={handleSearchWorker} 
        placeholder="Type name..." 
      />

      {showSuggestions && (
        <View style={styles.suggestionBox}>
          {filteredWorkers.map((item, index) => (
            <TouchableOpacity key={index} style={styles.suggestionItem} onPress={() => selectWorker(item)}>
              <Text style={styles.suggestionText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity 
        style={[styles.button, isSubmitting && { backgroundColor: '#555' }]} 
        onPress={handleCreateEvent}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>PUBLISH ASSIGNMENT</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 25, backgroundColor: '#fff' },
  label: { fontSize: 13, color: '#888', marginBottom: 5, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 15, marginBottom: 20 },
  inputSelected: { borderColor: '#28a745', backgroundColor: '#f0fff4' },
  suggestionBox: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, marginTop: -15, marginBottom: 20, backgroundColor: '#fff' },
  suggestionItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  suggestionText: { fontWeight: 'bold' },
  button: { backgroundColor: '#1a1a1a', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold' }
});