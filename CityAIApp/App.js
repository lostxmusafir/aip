import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

// UPDATE THIS: Your computer's local Wi-Fi IP (same network as phone)
const API_URL = 'http://192.168.0.18:8000';

export default function App() {
  const [locationStatus, setLocationStatus] = useState('Checking location...');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const [lastTicketId, setLastTicketId] = useState('');
  const [trackId, setTrackId] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackedTicket, setTrackedTicket] = useState(null);
  const [trackError, setTrackError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationStatus('Location permission denied');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        setLatitude(loc.coords.latitude);
        setLongitude(loc.coords.longitude);
        setLocationStatus(
          `Location: ${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`
        );
      } catch (e) {
        setLocationStatus('Location error: ' + (e.message || 'Unknown'));
      }
    })();
  }, []);

  useEffect(() => {
    if (!trackId.trim()) return;
    const intervalId = setInterval(() => {
      fetchTicketStatus(trackId.trim());
    }, 5000);
    return () => clearInterval(intervalId);
  }, [trackId]);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0]);
    }
  };

  const submitComplaint = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter your complaint description.');
      return;
    }
    if (latitude == null || longitude == null) {
      Alert.alert('Error', 'Location is required. Please allow location access.');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('description', description.trim());
      formData.append('latitude', String(latitude));
      formData.append('longitude', String(longitude));
      if (photo?.uri) {
        const name = photo.fileName || 'photo.jpg';
        const type = 'image/jpeg';
        formData.append('file', { uri: photo.uri, name, type });
      }

      const response = await fetch(`${API_URL}/submit-complaint`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!response.ok) throw new Error('Server Error');
      const result = await response.json();
      setLastTicketId(result.id);
      setTrackId(result.id);
      setTrackedTicket(result);
      Alert.alert(
        'Complaint Logged!',
        `Allocated: ${result.allocated_division || result.department}\nPriority: ${result.priority_level || 'N/A'}\nTicket ID: ${result.id}`
      );
      setDescription('');
      setPhoto(null);
    } catch (error) {
      Alert.alert('Connection Failed', 'Could not reach backend. Check IP and that backend is running.');
      console.error(error);
    }
    setLoading(false);
  };

  const fetchTicketStatus = async (id) => {
    if (!id) return;
    setTrackingLoading(true);
    setTrackError('');
    try {
      const response = await fetch(`${API_URL}/complaints/${id}`);
      if (!response.ok) {
        throw new Error('Ticket not found');
      }
      const data = await response.json();
      setTrackedTicket(data);
    } catch (error) {
      setTrackedTicket(null);
      setTrackError('Ticket not found. Please check the ID.');
    } finally {
      setTrackingLoading(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'Pending') return '#facc15';
    if (status === 'In Progress') return '#3b82f6';
    if (status === 'Resolved') return '#22c55e';
    return '#94a3b8';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>City AI Portal</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.screenContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>File a New Issue</Text>
        <Text style={styles.subtitle}>AI will route this to the right department.</Text>

        <View style={styles.locationBox}>
          <Text style={styles.locationLabel}>Location status</Text>
          <Text style={styles.locationText}>{locationStatus}</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Describe the issue... (e.g., Khadda hai, Kachra pada hai, Light nahi hai)"
          placeholderTextColor="#999"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
          <Text style={styles.photoButtonText}>Take Photo</Text>
        </TouchableOpacity>
        {photo?.uri && (
          <Image source={{ uri: photo.uri }} style={styles.thumbnail} resizeMode="cover" />
        )}

        <TouchableOpacity style={styles.button} onPress={submitComplaint} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit to AI</Text>}
        </TouchableOpacity>

        {lastTicketId ? (
          <View style={styles.ticketIdBox}>
            <Text style={styles.ticketIdLabel}>Your Ticket ID</Text>
            <Text style={styles.ticketIdValue}>{lastTicketId}</Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Track My Complaint</Text>
          <Text style={styles.sectionHint}>Live status updates every 5 seconds</Text>
        </View>

        <View style={styles.trackRow}>
          <TextInput
            style={styles.trackInput}
            placeholder="Enter Ticket ID"
            placeholderTextColor="#9ca3af"
            value={trackId}
            onChangeText={setTrackId}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={styles.trackButton}
            onPress={() => fetchTicketStatus(trackId.trim())}
            disabled={!trackId.trim() || trackingLoading}
          >
            {trackingLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.trackButtonText}>Track</Text>
            )}
          </TouchableOpacity>
        </View>

        {trackError ? <Text style={styles.errorText}>{trackError}</Text> : null}

        {trackedTicket ? (
          <View style={styles.trackCard}>
            <View style={styles.trackHeader}>
              <Text style={styles.trackTitle}>Status</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(trackedTicket.status) },
                ]}
              >
                <Text style={styles.statusText}>{trackedTicket.status || 'Pending'}</Text>
              </View>
            </View>

            <View style={styles.trackRowInfo}>
              <Text style={styles.trackLabel}>Allocated Department</Text>
              <Text style={styles.trackValue}>
                {trackedTicket.allocated_division || trackedTicket.department || 'N/A'}
              </Text>
            </View>

            <View style={styles.trackRowInfo}>
              <Text style={styles.trackLabel}>AI Confidence Score</Text>
              <Text style={styles.trackValue}>
                {typeof trackedTicket.ai_confidence === 'number'
                  ? `${trackedTicket.ai_confidence}%`
                  : 'Pending'}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e4e8',
    marginTop: Platform.OS === 'android' ? 30 : 0,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', textAlign: 'center' },
  scroll: { flex: 1 },
  screenContent: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#111' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20, marginTop: 5 },
  locationBox: {
    backgroundColor: '#e0f2fe',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  locationLabel: { fontSize: 12, color: '#0369a1', fontWeight: '600', marginBottom: 4 },
  locationText: { fontSize: 14, color: '#0c4a6e' },
  input: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 16,
    elevation: 2,
  },
  photoButton: {
    backgroundColor: '#64748b',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  photoButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  thumbnail: { width: 100, height: 100, borderRadius: 8, marginBottom: 20 },
  button: {
    backgroundColor: '#007BFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  ticketIdBox: {
    marginTop: 16,
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#22d3ee',
    borderRadius: 12,
    padding: 12,
  },
  ticketIdLabel: { fontSize: 12, fontWeight: '700', color: '#0e7490', marginBottom: 4 },
  ticketIdValue: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  sectionHeader: { marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  sectionHint: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  trackRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  trackInput: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    fontSize: 14,
  },
  trackButton: {
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  trackButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  errorText: { marginTop: 8, color: '#dc2626', fontSize: 12 },
  trackCard: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  trackHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trackTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  statusText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  trackRowInfo: { marginTop: 12 },
  trackLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  trackValue: { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 4 },
});
