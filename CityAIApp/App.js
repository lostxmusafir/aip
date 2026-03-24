import React, { useState, useEffect } from 'react';
import { useRef } from 'react';
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
  NativeModules,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
// expo-av is loaded lazily to avoid crashing Expo Go if native module is missing

// UPDATE THIS: Your computer's local Wi-Fi IP (same network as phone)
const API_URL = 'http://192.168.0.23:8000';

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
    voiceTitle: 'Voice Input',
    voiceHint: 'Tap the mic and speak your request.',
    voiceStart: 'Tap to Speak',
    voiceStop: 'Stop',
    voiceListening: 'Listening...',
    voiceProcessing: 'Transcribing...',
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
      textOrVoiceRequired: 'Please enter a description or record a voice complaint.',
      microphonePermission: 'Microphone permission is required to record audio.',
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
    voiceTitle: 'वॉइस इनपुट',
    voiceHint: 'माइक पर टैप करें और अपनी शिकायत बोलें।',
    voiceStart: 'बोलना शुरू करें',
    voiceStop: 'रोकें',
    voiceListening: 'सुन रहा है...',
    voiceProcessing: 'ट्रांसक्राइब हो रहा है...',
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
      textOrVoiceRequired: 'कृपया विवरण लिखें या वॉइस शिकायत रिकॉर्ड करें।',
      microphonePermission: 'ऑडियो रिकॉर्ड करने के लिए माइक्रोफोन अनुमति आवश्यक है।',
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
    voiceTitle: 'વૉઇસ ઇનપુટ',
    voiceHint: 'માઈક પર ટેપ કરો અને તમારી ફરિયાદ કહો.',
    voiceStart: 'બોલવું શરૂ કરો',
    voiceStop: 'બંધ કરો',
    voiceListening: 'સાંભળી રહ્યું છે...',
    voiceProcessing: 'ટ્રાન્સક્રાઇબ થઇ રહ્યું છે...',
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
      textOrVoiceRequired: 'કૃપા કરીને વર્ણન લખો અથવા વૉઇસ ફરિયાદ રેકોર્ડ કરો.',
      microphonePermission: 'ઓડિયો રેકોર્ડ કરવા માટે માઇક્રોફોન મંજૂરી જરૂરી છે.',
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
  const [recording, setRecording] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioPermissionStatus, setAudioPermissionStatus] = useState(null);
  const [audioModuleAvailable, setAudioModuleAvailable] = useState(true);
  const [audioRuntimeAvailable, setAudioRuntimeAvailable] = useState(
    Boolean(NativeModules && NativeModules.ExponentAV)
  );
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const [lastTicketId, setLastTicketId] = useState('');
  const [trackId, setTrackId] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackedTicket, setTrackedTicket] = useState(null);
  const [trackErrorKey, setTrackErrorKey] = useState('');

  const t = translations[language];
  const audioModuleRef = useRef(null);

  const ensureLocationPermission = async () => {
    try {
      const current = await Location.getForegroundPermissionsAsync();
      if (current?.status === 'granted') {
        setLocationPermissionStatus('granted');
        return 'granted';
      }
      const request = await Location.requestForegroundPermissionsAsync();
      const nextStatus = request?.status || 'undetermined';
      setLocationPermissionStatus(nextStatus);
      return nextStatus;
    } catch (e) {
      setLocationPermissionStatus('undetermined');
      return 'undetermined';
    }
  };

  const getFreshLocation = async () => {
    const status = await ensureLocationPermission();
    if (status !== 'granted') {
      setLocationState({ type: 'denied', message: '' });
      return null;
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      if (Platform.OS === 'android' && Location.enableNetworkProviderAsync) {
        try {
          await Location.enableNetworkProviderAsync();
        } catch (e) {
          setLocationState({ type: 'error', message: 'Location services are off' });
          return null;
        }
      } else {
        setLocationState({ type: 'error', message: 'Location services are off' });
        return null;
      }
    }

    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
      });
      return loc;
    } catch (e) {
      const last = await Location.getLastKnownPositionAsync();
      if (last) return last;
      throw e;
    }
  };

  useEffect(() => {
    (async () => {
      setLocationState({ type: 'checking', message: '' });
      try {
        const loc = await getFreshLocation();
        if (!loc) return;
        setLatitude(loc.coords.latitude);
        setLongitude(loc.coords.longitude);
        setLocationState({ type: 'coords', message: '' });
      } catch (e) {
        setLocationState({ type: 'error', message: e.message || '' });
      }
    })();
  }, []);

  useEffect(() => {
    let isActive = true;
    (async () => {
      try {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (isActive) {
          setCameraPermissionStatus(permission?.status || 'undetermined');
        }
      } catch (error) {
        console.error('Camera permission request failed:', error);
      }
    })();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!trackId.trim()) return;
    const intervalId = setInterval(() => {
      fetchTicketStatus(trackId.trim());
    }, 5000);
    return () => clearInterval(intervalId);
  }, [trackId]);

  const takePhoto = async () => {
    if (cameraPermissionStatus !== 'granted') {
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

  const getAudioModule = async () => {
    if (!audioRuntimeAvailable || !NativeModules?.ExponentAV) {
      setAudioRuntimeAvailable(false);
      setAudioModuleAvailable(false);
      return null;
    }
    if (audioModuleRef.current) return audioModuleRef.current;
    try {
      const mod = await import('expo-av');
      audioModuleRef.current = mod.Audio;
      return audioModuleRef.current;
    } catch (error) {
      console.error('expo-av not available in this runtime:', error);
      setAudioModuleAvailable(false);
      return null;
    }
  };

  const ensureAudioPermission = async () => {
    const Audio = await getAudioModule();
    if (!Audio) return false;
    if (audioPermissionStatus === 'granted') return true;
    try {
      const permission = await Audio.requestPermissionsAsync();
      setAudioPermissionStatus(permission?.status || 'undetermined');
      return permission.granted;
    } catch (error) {
      console.error('Audio permission request failed:', error);
      setAudioRuntimeAvailable(false);
      setAudioModuleAvailable(false);
      return false;
    }
  };

  const startVoiceInput = async () => {
    if (recording || isTranscribing) return;
    if (!audioModuleAvailable || !audioRuntimeAvailable) {
      Alert.alert(
        t.alerts.errorTitle,
        'Voice input is not available in this build. Please use a development build.'
      );
      return;
    }
    const Audio = await getAudioModule();
    if (!Audio) {
      Alert.alert(
        t.alerts.errorTitle,
        'Voice input is not available in this build. Please use a development build.'
      );
      return;
    }
    const granted = await ensureAudioPermission();
    if (!granted) {
      Alert.alert(t.alerts.permissionNeededTitle, t.alerts.microphonePermission);
      return;
    }
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: newRecording } = await Audio.Recording.createAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });
      setRecording(newRecording);
    } catch (error) {
      console.error(error);
      Alert.alert(t.alerts.errorTitle, t.alerts.microphonePermission);
    }
  };

  const transcribeAudio = async (uri) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      const name = `voice-${Date.now()}.m4a`;
      const type = 'audio/mp4';
      formData.append('audio', { uri, name, type });

      const response = await fetch(`${API_URL}/transcribe-audio`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!response.ok) throw new Error(t.alerts.serverError);
      const data = await response.json();
      const transcript = (data.text || '').trim();
      if (transcript) {
        setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    } catch (error) {
      console.error(error);
      Alert.alert(t.alerts.connectionFailedTitle, t.alerts.connectionFailedBody);
    } finally {
      setIsTranscribing(false);
    }
  };

  const stopVoiceInput = async () => {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) {
        await transcribeAudio(uri);
      }
    } catch (error) {
      console.error(error);
      setRecording(null);
    }
  };

  const submitComplaint = async () => {
    const hasText = Boolean(description.trim());
    if (!hasText) {
      Alert.alert(t.alerts.errorTitle, t.alerts.textOrVoiceRequired);
      return;
    }
    if (!contactNo.trim() || contactNo.trim().length < 10) {
      Alert.alert('Kripya 10-digit ka sahi contact number daalein');
      return;
    }

    setLoading(true);
    try {
      const loc = await getFreshLocation();
      if (!loc) {
        Alert.alert(
          'Location Required',
          'We need your exact location to send the right department to the spot.'
        );
        setLoading(false);
        return;
      }
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

  const getPriorityLabel = (score) => {
    if (typeof score !== 'number') return 'Medium';
    if (score >= 90) return 'Critical';
    if (score >= 80) return 'High';
    return 'Medium';
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
        <Text style={styles.headerTitle}>CITY AI APP</Text>
        <TouchableOpacity style={styles.headerAction}>
          <Text style={styles.headerActionText}>!</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.screenContent}
        keyboardShouldPersistTaps="handled"
      >
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
        <Text style={styles.sectionOverline}>New Submission</Text>
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionOverlineMuted}>Issue Intelligence</Text>
          <View style={styles.aiStatusPill}>
            <View style={styles.aiStatusDot} />
            <Text style={styles.aiStatusText}>AI Assistant Active</Text>
          </View>
        </View>

        <View style={styles.locationBox}>
          <Text style={styles.locationLabel}>{t.locationStatus.label}</Text>
          <Text style={styles.locationText}>{locationStatusText}</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder={t.descriptionPlaceholder}
          placeholderTextColor="#65708a"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <View style={styles.voiceCard}>
          <View>
            <Text style={styles.voiceTitle}>{t.voiceTitle}</Text>
            <Text style={styles.voiceHint}>{t.voiceHint}</Text>
          </View>
          <View style={styles.voiceRow}>
            <TouchableOpacity
              style={[styles.voiceButton, recording && styles.voiceButtonActive]}
              onPress={recording ? stopVoiceInput : startVoiceInput}
              disabled={isTranscribing}
            >
              <Text style={styles.voiceButtonText}>
                {recording ? t.voiceStop : t.voiceStart}
              </Text>
            </TouchableOpacity>
            {isTranscribing ? <ActivityIndicator color="#7bd0ff" /> : null}
          </View>
          {recording ? <Text style={styles.voiceReady}>{t.voiceListening}</Text> : null}
          {isTranscribing ? <Text style={styles.voiceReady}>{t.voiceProcessing}</Text> : null}
          {!audioRuntimeAvailable ? (
            <Text style={styles.voiceReady}>Voice input needs a development build.</Text>
          ) : null}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Contact Number (10 digits)"
          placeholderTextColor="#65708a"
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
          <View style={styles.trackWrap}>
            <View style={styles.heroRow}>
              <View>
                <Text style={styles.sectionOverline}>Current Status</Text>
                <Text style={styles.heroTitle}>{trackedTicket.status || t.pending}</Text>
              </View>
              <View style={styles.incidentPill}>
                <Text style={styles.incidentPillLabel}>Incident ID:</Text>
                <Text style={styles.incidentPillValue}>#{trackedTicket.id}</Text>
              </View>
            </View>

            <View style={styles.bentoGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.sectionOverlineMuted}>Report Summary</Text>
                <Text style={styles.summaryText}>{trackedTicket.description || 'Report details unavailable.'}</Text>
                <View style={styles.summaryMetaRow}>
                  <View>
                    <Text style={styles.metaLabel}>Department</Text>
                    <Text style={styles.metaValue}>{trackedTicket.department || 'N/A'}</Text>
                  </View>
                  <View>
                    <Text style={styles.metaLabel}>Priority</Text>
                    <Text style={styles.metaValueError}>{getPriorityLabel(trackedTicket.ai_score)}</Text>
                  </View>
                  <View>
                    <Text style={styles.metaLabel}>Assigned to</Text>
                    <Text style={styles.metaValue}>{trackedTicket.sub_division || 'Team Alpha'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.mapCard}>
                <View style={styles.mapImageWrap}>
                  <Image
                    source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpJLi70iqyjDtT8qC1t3ps3i-isuEFNOH67D3TQ1apEF7y0i2IagRll7TDVYyxmsiBeTpfx9D2LonLdTbBGl8pSy_C82HeXVh9VCdBgmvfUa-g8gVVcddC8PISHPVsREfzlH3T6X5jBlgM2-J_pK-l2LI4INbpcN4OpXvPjbk5OdfkFCdkPJHJyyebuXy4fqJU5tbnv_vrfZXQVYgzse8YuVYht-lxNDav-EV8HJ3AZvsRPzf-nk844SEOOFyvQ5q-r_WbsHEY3ldZ' }}
                    style={styles.mapImage}
                  />
                  <View style={styles.mapOverlay} />
                  <View style={styles.mapPinWrap}>
                    <Text style={styles.mapPin}>◎</Text>
                  </View>
                </View>
                <View style={styles.mapInfo}>
                  <Text style={styles.metaLabel}>Location</Text>
                  <Text style={styles.metaValue}>
                    {latitude && longitude ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` : 'Location unavailable'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.supportCard}>
              <View style={styles.supportIcon}>
                <Text style={styles.supportIconText}>◎</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.supportTitle}>Need assistance?</Text>
                <Text style={styles.supportSubtitle}>Connect with an agent about this incident.</Text>
              </View>
              <TouchableOpacity style={styles.supportButton}>
                <Text style={styles.supportButtonText}>Contact Support</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1326' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(45, 52, 73, 0.4)',
    borderBottomWidth: 1,
    borderBottomColor: '#45464d',
    marginTop: Platform.OS === 'android' ? 30 : 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#dae2fd', letterSpacing: -0.2 },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222a3d',
  },
  headerActionText: { color: '#c6c6cd', fontSize: 16, fontWeight: '700' },
  scroll: { flex: 1 },
  screenContent: { padding: 20, paddingBottom: 60 },
  languageToggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  languageButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#131b2e',
    borderWidth: 1,
    borderColor: '#2d3449',
  },
  languageButtonActive: {
    backgroundColor: '#7bd0ff',
    borderColor: '#7bd0ff',
  },
  languageButtonText: { fontSize: 12, fontWeight: '700', color: '#c6c6cd' },
  languageButtonTextActive: { color: '#00354a' },
  sectionOverline: {
    color: '#7bd0ff',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionOverlineMuted: {
    color: '#7b8189',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  aiStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(123, 208, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  aiStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#7bd0ff',
  },
  aiStatusText: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#7bd0ff',
    fontWeight: '700',
  },
  title: { fontSize: 34, fontWeight: '300', color: '#dae2fd', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#c6c6cd', marginBottom: 20, marginTop: 2 },
  locationBox: {
    backgroundColor: '#171f33',
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2d3449',
  },
  locationLabel: { fontSize: 11, color: '#7bd0ff', fontWeight: '700', marginBottom: 6 },
  locationText: { fontSize: 13, color: '#dae2fd' },
  input: {
    backgroundColor: '#222a3d',
    padding: 18,
    borderRadius: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#2d3449',
    marginBottom: 16,
    color: '#dae2fd',
  },
  voiceCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2d3449',
    marginBottom: 16,
  },
  voiceTitle: { fontSize: 13, fontWeight: '700', color: '#dae2fd' },
  voiceHint: { fontSize: 11, color: '#9aa6bf', marginTop: 4 },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  voiceButton: {
    backgroundColor: '#7bd0ff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  voiceButtonActive: { backgroundColor: '#ffb4ab' },
  voiceButtonText: { color: '#00354a', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  voiceClearButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2d3449',
    backgroundColor: '#0b1326',
  },
  voiceClearText: { color: '#c6c6cd', fontSize: 12, fontWeight: '700' },
  voiceReady: { marginTop: 10, fontSize: 12, color: '#7bd0ff', fontWeight: '700' },
  photoButton: {
    backgroundColor: '#131b2e',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2d3449',
  },
  photoButtonText: { color: '#7bd0ff', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  thumbnail: { width: 110, height: 110, borderRadius: 14, marginBottom: 20, borderWidth: 1, borderColor: '#2d3449' },
  button: {
    backgroundColor: '#7bd0ff',
    padding: 18,
    borderRadius: 28,
    alignItems: 'center',
    elevation: 3,
  },
  buttonText: { color: '#00354a', fontSize: 16, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  ticketIdBox: {
    marginTop: 16,
    backgroundColor: '#171f33',
    borderWidth: 1,
    borderColor: '#2d3449',
    borderRadius: 16,
    padding: 14,
  },
  ticketIdLabel: { fontSize: 11, fontWeight: '700', color: '#7bd0ff', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1.2 },
  ticketIdValue: { fontSize: 18, fontWeight: '800', color: '#dae2fd' },
  sectionHeader: { marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#dae2fd' },
  sectionHint: { fontSize: 11, color: '#7b8189', marginTop: 2 },
  trackRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  trackInput: {
    flex: 1,
    backgroundColor: '#222a3d',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2d3449',
    fontSize: 14,
    color: '#dae2fd',
  },
  trackButton: {
    backgroundColor: '#7bd0ff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  trackButtonText: { color: '#00354a', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  errorText: { marginTop: 8, color: '#ffb4ab', fontSize: 12 },
  trackCard: {
    marginTop: 16,
    backgroundColor: '#171f33',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2d3449',
  },
  trackHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trackTitle: { fontSize: 16, fontWeight: '700', color: '#dae2fd' },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  statusText: { fontSize: 12, fontWeight: '700', color: '#0b1326' },
  trackRowInfo: { marginTop: 12 },
  trackLabel: { fontSize: 11, color: '#7b8189', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  trackValue: { fontSize: 14, fontWeight: '700', color: '#dae2fd', marginTop: 6 },
  trackWrap: { marginTop: 24 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  heroTitle: { fontSize: 40, fontWeight: '300', color: '#dae2fd', letterSpacing: -0.5 },
  incidentPill: {
    backgroundColor: '#222a3d',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2d3449',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  incidentPillLabel: { fontSize: 10, textTransform: 'uppercase', color: '#a7b6cc', letterSpacing: 1 },
  incidentPillValue: { fontSize: 12, fontWeight: '700', color: '#dae2fd' },
  bentoGrid: { marginTop: 20, gap: 12 },
  summaryCard: {
    backgroundColor: '#131b2e',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2d3449',
  },
  summaryText: { fontSize: 18, fontWeight: '300', color: '#dae2fd', lineHeight: 26, marginTop: 10 },
  summaryMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 18 },
  metaLabel: { fontSize: 10, textTransform: 'uppercase', color: '#a7b6cc', letterSpacing: 1, marginBottom: 4 },
  metaValue: { fontSize: 14, fontWeight: '600', color: '#b9c8de' },
  metaValueError: { fontSize: 14, fontWeight: '600', color: '#ffb4ab' },
  mapCard: {
    backgroundColor: '#131b2e',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2d3449',
    overflow: 'hidden',
  },
  mapImageWrap: { height: 140, backgroundColor: '#222a3d', position: 'relative' },
  mapImage: { width: '100%', height: '100%', opacity: 0.6 },
  mapOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11, 19, 38, 0.35)' },
  mapPinWrap: { position: 'absolute', top: 50, left: 0, right: 0, alignItems: 'center' },
  mapPin: { fontSize: 28, color: '#7bd0ff' },
  mapInfo: { padding: 16 },
  supportCard: {
    marginTop: 24,
    backgroundColor: '#060e20',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  supportIcon: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#222a3d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportIconText: { color: '#7bd0ff', fontSize: 18 },
  supportTitle: { fontSize: 14, fontWeight: '600', color: '#dae2fd' },
  supportSubtitle: { fontSize: 12, color: '#a7b6cc', marginTop: 2 },
  supportButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#7bd0ff',
  },
  supportButtonText: { color: '#00354a', fontSize: 11, fontWeight: '700' },
});
