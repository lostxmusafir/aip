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
const API_URL = 'http://192.168.1.8:8000';

const translations = {
  en: {
    languageLabels: { en: 'English', hi: 'हिंदी', gu: 'ગુજરાતી' },
    headerTitle: 'City AI Portal',
    title: 'File a New Issue',
    subtitle: 'AI will route this to the right department.',
    locationStatus: {
      label: 'Location status',
      checking: 'Checking location...',
      denied: 'Location permission denied',
      errorPrefix: 'Location error',
      coordsPrefix: 'Location',
      unknown: 'Location unavailable',
      unknownError: 'Unknown',
    },
    descriptionPlaceholder:
      'Describe the issue... (e.g., Khadda hai, Kachra pada hai, Light nahi hai)',
    takePhoto: 'Take Photo',
    submit: 'Submit to AI',
    ticketIdLabel: 'Your Ticket ID',
    trackTitle: 'Track My Complaint',
    trackHint: 'Live status updates every 5 seconds',
    trackPlaceholder: 'Enter Ticket ID',
    trackButton: 'Track',
    statusTitle: 'Status',
    allocatedDepartment: 'Allocated Department',
    subDivisionLabel: 'Assigned Sub-division',
    aiScoreLabel: 'AI Confidence Score',
    pending: 'Pending',
    alerts: {
      errorTitle: 'Error',
      permissionNeededTitle: 'Permission needed',
      permissionNeededBody: 'Camera permission is required to take a photo.',
      descriptionRequired: 'Please enter your complaint description.',
      locationRequired: 'Location is required. Please allow location access.',
      complaintLoggedTitle: 'Complaint Logged!',
      allocatedLabel: 'Allocated',
      priorityLabel: 'Priority',
      ticketIdLabel: 'Ticket ID',
      connectionFailedTitle: 'Connection Failed',
      connectionFailedBody:
        'Could not reach backend. Check IP and that backend is running.',
      ticketNotFound: 'Ticket not found. Please check the ID.',
      serverError: 'Server Error',
    },
  },
  hi: {
    languageLabels: { en: 'English', hi: 'हिंदी', gu: 'ગુજરાતી' },
    headerTitle: 'सिटी एआई पोर्टल',
    title: 'नई शिकायत दर्ज करें',
    subtitle: 'AI इसे सही विभाग में भेजेगा।',
    locationStatus: {
      label: 'लोकेशन स्थिति',
      checking: 'लोकेशन जांची जा रही है...',
      denied: 'लोकेशन अनुमति अस्वीकार',
      errorPrefix: 'लोकेशन त्रुटि',
      coordsPrefix: 'लोकेशन',
      unknown: 'लोकेशन उपलब्ध नहीं',
      unknownError: 'अज्ञात',
    },
    descriptionPlaceholder:
      'समस्या का विवरण दें... (उदा., खड्डा है, कचरा पड़ा है, लाइट नहीं है)',
    takePhoto: 'फोटो लें',
    submit: 'AI को सबमिट करें',
    ticketIdLabel: 'आपका टिकट आईडी',
    trackTitle: 'अपनी शिकायत ट्रैक करें',
    trackHint: 'हर 5 सेकंड में लाइव स्टेटस अपडेट',
    trackPlaceholder: 'टिकट आईडी डालें',
    trackButton: 'ट्रैक करें',
    statusTitle: 'स्थिति',
    allocatedDepartment: 'आवंटित विभाग',
    subDivisionLabel: 'आवंटित उप-विभाग',
    aiScoreLabel: 'AI विश्वास स्कोर',
    pending: 'लंबित',
    alerts: {
      errorTitle: 'त्रुटि',
      permissionNeededTitle: 'अनुमति आवश्यक',
      permissionNeededBody: 'फोटो लेने के लिए कैमरा अनुमति आवश्यक है।',
      descriptionRequired: 'कृपया अपनी शिकायत का विवरण दर्ज करें।',
      locationRequired: 'लोकेशन आवश्यक है। कृपया लोकेशन एक्सेस दें।',
      complaintLoggedTitle: 'शिकायत दर्ज हो गई!',
      allocatedLabel: 'आवंटित',
      priorityLabel: 'प्राथमिकता',
      ticketIdLabel: 'टिकट आईडी',
      connectionFailedTitle: 'कनेक्शन विफल',
      connectionFailedBody:
        'बैकएंड से कनेक्ट नहीं हो सका। IP जांचें और सुनिश्चित करें कि बैकएंड चल रहा है।',
      ticketNotFound: 'टिकट नहीं मिला। कृपया आईडी जांचें।',
      serverError: 'सर्वर त्रुटि',
    },
  },
  gu: {
    languageLabels: { en: 'English', hi: 'हिंदी', gu: 'ગુજરાતી' },
    headerTitle: 'સિટી એઆઈ પોર્ટલ',
    title: 'નવી ફરિયાદ દાખલ કરો',
    subtitle: 'AI તેને યોગ્ય વિભાગમાં મોકલશે.',
    locationStatus: {
      label: 'સ્થાનની સ્થિતિ',
      checking: 'સ્થાન તપાસી રહ્યું છે...',
      denied: 'સ્થાનની મંજૂરી નકારી',
      errorPrefix: 'સ્થાન ભૂલ',
      coordsPrefix: 'સ્થાન',
      unknown: 'સ્થાન ઉપલબ્ધ નથી',
      unknownError: 'અજ્ઞાત',
    },
    descriptionPlaceholder:
      'સમસ્યા લખો... (ઉદા., ખાડો છે, કચરો પડ્યો છે, લાઈટ નથી)',
    takePhoto: 'ફોટો લો',
    submit: 'AI ને સબમિટ કરો',
    ticketIdLabel: 'તમારો ટિકિટ આઈડી',
    trackTitle: 'મારી ફરિયાદ ટ્રેક કરો',
    trackHint: 'દર 5 સેકન્ડે લાઇવ સ્થિતિ અપડેટ',
    trackPlaceholder: 'ટિકિટ આઈડી દાખલ કરો',
    trackButton: 'ટ્રેક',
    statusTitle: 'સ્થિતિ',
    allocatedDepartment: 'ફાળવેલ વિભાગ',
    subDivisionLabel: 'ફાળવેલ ઉપ-વિભાગ',
    aiScoreLabel: 'AI વિશ્વાસ સ્કોર',
    pending: 'બાકી',
    alerts: {
      errorTitle: 'ભૂલ',
      permissionNeededTitle: 'મંજૂરી જરૂરી',
      permissionNeededBody: 'ફોટો લેવા માટે કેમેરાની મંજૂરી જરૂરી છે.',
      descriptionRequired: 'કૃપા કરીને તમારી ફરિયાદનું વર્ણન દાખલ કરો.',
      locationRequired: 'સ્થાન જરૂરી છે. કૃપા કરીને સ્થાન ઍક્સેસ આપો.',
      complaintLoggedTitle: 'ફરિયાદ નોંધાઈ!',
      allocatedLabel: 'ફાળવેલ',
      priorityLabel: 'પ્રાથમિકતા',
      ticketIdLabel: 'ટિકિટ આઈડી',
      connectionFailedTitle: 'કનેક્શન નિષ્ફળ',
      connectionFailedBody:
        'બેકએન્ડ સુધી પહોંચી શકાયું નથી. IP તપાસો અને ખાતરી કરો કે બેકએન્ડ ચાલે છે.',
      ticketNotFound: 'ટિકિટ મળ્યું નથી. કૃપા કરીને આઈડી તપાસો.',
      serverError: 'સર્વર ભૂલ',
    },
  },
};

export default function App() {
  const [language, setLanguage] = useState('en');
  const [locationState, setLocationState] = useState({ type: 'checking', message: '' });
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [description, setDescription] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const [lastTicketId, setLastTicketId] = useState('');
  const [trackId, setTrackId] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackedTicket, setTrackedTicket] = useState(null);
  const [trackErrorKey, setTrackErrorKey] = useState('');

  const t = translations[language];

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationState({ type: 'denied', message: '' });
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        setLatitude(loc.coords.latitude);
        setLongitude(loc.coords.longitude);
        setLocationState({ type: 'coords', message: '' });
      } catch (e) {
        setLocationState({ type: 'error', message: e.message || '' });
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
      Alert.alert(t.alerts.permissionNeededTitle, t.alerts.permissionNeededBody);
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
      Alert.alert(t.alerts.errorTitle, t.alerts.descriptionRequired);
      return;
    }
    if (!contactNo.trim() || contactNo.trim().length < 10) {
      Alert.alert('Kripya 10-digit ka sahi contact number daalein');
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Location Required',
        'We need your exact location to send the right department to the spot.'
      );
      return;
    }

    setLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const currentLatitude = loc.coords.latitude;
      const currentLongitude = loc.coords.longitude;

      setLatitude(currentLatitude);
      setLongitude(currentLongitude);
      setLocationState({ type: 'coords', message: '' });

      const formData = new FormData();
      formData.append('description', description.trim());
      formData.append('contact_no', contactNo.trim());
      formData.append('latitude', String(currentLatitude));
      formData.append('longitude', String(currentLongitude));
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

      if (!response.ok) throw new Error(t.alerts.serverError);
      const result = await response.json();
      setLastTicketId(result.id);
      setTrackId(result.id);
      setTrackedTicket(result);
      Alert.alert(
        t.alerts.complaintLoggedTitle,
        `${t.alerts.allocatedLabel}: ${result.allocated_division || result.department}\n${t.subDivisionLabel}: ${result.sub_division || 'N/A'}\n${t.alerts.priorityLabel}: ${result.priority_level || 'N/A'}\n${t.alerts.ticketIdLabel}: ${result.id}`
      );
      setDescription('');
      setContactNo('');
      setPhoto(null);
    } catch (error) {
      Alert.alert(t.alerts.connectionFailedTitle, t.alerts.connectionFailedBody);
      console.error(error);
    }
    setLoading(false);
  };

  const fetchTicketStatus = async (id) => {
    if (!id) return;
    setTrackingLoading(true);
    setTrackErrorKey('');
    try {
      const response = await fetch(`${API_URL}/complaints/${id}`);
      if (!response.ok) {
        throw new Error('Ticket not found');
      }
      const data = await response.json();
      setTrackedTicket(data);
    } catch (error) {
      setTrackedTicket(null);
      setTrackErrorKey('ticketNotFound');
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

  const locationStatusText = (() => {
    if (locationState.type === 'checking') return t.locationStatus.checking;
    if (locationState.type === 'denied') return t.locationStatus.denied;
    if (locationState.type === 'error') {
      const message = locationState.message || t.locationStatus.unknownError;
      return `${t.locationStatus.errorPrefix}: ${message}`;
    }
    if (locationState.type === 'coords' && latitude != null && longitude != null) {
      return `${t.locationStatus.coordsPrefix}: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    }
    return t.locationStatus.unknown;
  })();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.languageToggleRow}>
          <TouchableOpacity
            style={[styles.languageButton, language === 'en' && styles.languageButtonActive]}
            onPress={() => setLanguage('en')}
          >
            <Text
              style={[
                styles.languageButtonText,
                language === 'en' && styles.languageButtonTextActive,
              ]}
            >
              {t.languageLabels.en}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.languageButton, language === 'hi' && styles.languageButtonActive]}
            onPress={() => setLanguage('hi')}
          >
            <Text
              style={[
                styles.languageButtonText,
                language === 'hi' && styles.languageButtonTextActive,
              ]}
            >
              {t.languageLabels.hi}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.languageButton, language === 'gu' && styles.languageButtonActive]}
            onPress={() => setLanguage('gu')}
          >
            <Text
              style={[
                styles.languageButtonText,
                language === 'gu' && styles.languageButtonTextActive,
              ]}
            >
              {t.languageLabels.gu}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>{t.headerTitle}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.screenContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>

        <View style={styles.locationBox}>
          <Text style={styles.locationLabel}>{t.locationStatus.label}</Text>
          <Text style={styles.locationText}>{locationStatusText}</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder={t.descriptionPlaceholder}
          placeholderTextColor="#999"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <TextInput
          style={styles.input}
          placeholder="Contact Number (10 digits)"
          placeholderTextColor="#999"
          value={contactNo}
          onChangeText={setContactNo}
          keyboardType="phone-pad"
          maxLength={10}
        />

        <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
          <Text style={styles.photoButtonText}>{t.takePhoto}</Text>
        </TouchableOpacity>
        {photo?.uri && (
          <Image source={{ uri: photo.uri }} style={styles.thumbnail} resizeMode="cover" />
        )}

        <TouchableOpacity style={styles.button} onPress={submitComplaint} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t.submit}</Text>}
        </TouchableOpacity>

        {lastTicketId ? (
          <View style={styles.ticketIdBox}>
            <Text style={styles.ticketIdLabel}>{t.ticketIdLabel}</Text>
            <Text style={styles.ticketIdValue}>{lastTicketId}</Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.trackTitle}</Text>
          <Text style={styles.sectionHint}>{t.trackHint}</Text>
        </View>

        <View style={styles.trackRow}>
          <TextInput
            style={styles.trackInput}
            placeholder={t.trackPlaceholder}
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
              <Text style={styles.trackButtonText}>{t.trackButton}</Text>
            )}
          </TouchableOpacity>
        </View>

        {trackErrorKey ? <Text style={styles.errorText}>{t.alerts[trackErrorKey]}</Text> : null}

        {trackedTicket ? (
          <View style={styles.trackCard}>
            <View style={styles.trackHeader}>
              <Text style={styles.trackTitle}>{t.statusTitle}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(trackedTicket.status) },
                ]}
              >
                <Text style={styles.statusText}>{trackedTicket.status || t.pending}</Text>
              </View>
            </View>

            <View style={styles.trackRowInfo}>
              <Text style={styles.trackLabel}>{t.allocatedDepartment}</Text>
              <Text style={styles.trackValue}>
                {trackedTicket.allocated_division || trackedTicket.department || 'N/A'}
              </Text>
            </View>

            <View style={styles.trackRowInfo}>
              <Text style={styles.trackLabel}>{t.subDivisionLabel}</Text>
              <Text style={styles.trackValue}>{trackedTicket.sub_division || 'N/A'}</Text>
            </View>

            <View style={styles.trackRowInfo}>
              <Text style={styles.trackLabel}>{t.aiScoreLabel}</Text>
              <Text style={styles.trackValue}>
                {typeof trackedTicket.ai_confidence === 'number'
                  ? `${trackedTicket.ai_confidence}%`
                  : t.pending}
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
  languageToggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  languageButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  languageButtonActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  languageButtonText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  languageButtonTextActive: { color: '#fff' },
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
